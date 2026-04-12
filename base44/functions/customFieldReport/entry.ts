import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Custom field reporting + workspace presets ──
// Makes custom field data queryable and exportable.
// Supports preset templates for common use cases.

const PRESET_FIELDS = {
  demographics: [
    { label: 'Age Range', field_key: 'age_range', field_type: 'dropdown', applies_to: 'checkout' },
    { label: 'Gender', field_key: 'gender', field_type: 'dropdown', applies_to: 'checkout' },
    { label: 'Suburb / City', field_key: 'suburb', field_type: 'text', applies_to: 'checkout' },
  ],
  marketing: [
    { label: 'How did you hear about us?', field_key: 'referral_source', field_type: 'dropdown', applies_to: 'checkout' },
    { label: 'Would you like to receive updates?', field_key: 'marketing_optin', field_type: 'checkbox', applies_to: 'checkout' },
  ],
  dietary: [
    { label: 'Dietary Requirements', field_key: 'dietary', field_type: 'dropdown', applies_to: 'checkout' },
    { label: 'Allergies', field_key: 'allergies', field_type: 'text', applies_to: 'checkout' },
  ],
  accessibility: [
    { label: 'Accessibility Requirements', field_key: 'accessibility', field_type: 'textarea', applies_to: 'checkout' },
    { label: 'Wheelchair Access Needed', field_key: 'wheelchair', field_type: 'checkbox', applies_to: 'checkout' },
  ],
  membership: [
    { label: 'Membership ID', field_key: 'membership_id', field_type: 'text', applies_to: 'checkout' },
    { label: 'Member Type', field_key: 'member_type', field_type: 'dropdown', applies_to: 'checkout' },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── List available preset categories ──
    if (action === 'list_presets') {
      return Response.json({
        status: 'success',
        presets: Object.entries(PRESET_FIELDS).map(([key, fields]) => ({
          category: key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          field_count: fields.length,
          fields: fields.map(f => ({ label: f.label, type: f.field_type })),
        })),
      });
    }

    // ── Apply preset to workspace ──
    if (action === 'apply_preset') {
      const { workspace_id, category, options } = body;
      const preset = PRESET_FIELDS[category];
      if (!preset) return Response.json({ error: 'Invalid preset category' }, { status: 400 });

      // Check for existing fields to avoid duplicates
      const existing = await base44.asServiceRole.entities.CustomFieldDefinition.filter({ workspace_id });
      const existingKeys = new Set(existing.map(f => f.field_key));

      const created = [];
      for (const field of preset) {
        if (existingKeys.has(field.field_key)) continue;
        const def = await base44.asServiceRole.entities.CustomFieldDefinition.create({
          workspace_id, applies_to: field.applies_to, label: field.label,
          field_key: field.field_key, field_type: field.field_type,
          is_required: false, is_reportable: true, preset_category: category,
          is_active: true, sort_order: created.length,
        });
        created.push(def);

        // Create default options for dropdowns
        if (field.field_type === 'dropdown' && options?.[field.field_key]) {
          for (let i = 0; i < options[field.field_key].length; i++) {
            await base44.asServiceRole.entities.CustomFieldOption.create({
              field_definition_id: def.id,
              label: options[field.field_key][i],
              value: options[field.field_key][i].toLowerCase().replace(/[^a-z0-9]+/g, '_'),
              sort_order: i,
            });
          }
        }
      }

      return Response.json({ status: 'success', created: created.length });
    }

    // ── Generate custom field report for event ──
    if (action === 'event_report') {
      const { event_id, workspace_id } = body;

      // Get reportable field definitions
      const allDefs = await base44.asServiceRole.entities.CustomFieldDefinition.filter({ workspace_id, is_reportable: true, is_active: true });
      
      // Get field values for this event's order items
      const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ event_id });
      const itemIds = orderItems.map(i => i.id);

      // Get all field values for these items
      const allValues = await base44.asServiceRole.entities.FieldValue.filter({ workspace_id });
      const relevantValues = allValues.filter(v => v.owner_type === 'order_item' && itemIds.includes(v.owner_id));

      // Build report: aggregate by field
      const report = {};
      for (const def of allDefs) {
        const fieldValues = relevantValues.filter(v => v.field_definition_id === def.id);
        const values = fieldValues.map(v => { try { return JSON.parse(v.value_json); } catch { return v.value_json; } });

        if (def.field_type === 'dropdown' || def.field_type === 'radio') {
          // Count distribution
          const counts = {};
          values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
          report[def.field_key] = { label: def.label, type: 'distribution', data: counts, total: values.length };
        } else if (def.field_type === 'checkbox') {
          const trueCount = values.filter(v => v === true || v === 'true').length;
          report[def.field_key] = { label: def.label, type: 'boolean', yes: trueCount, no: values.length - trueCount, total: values.length };
        } else if (def.field_type === 'number') {
          const nums = values.filter(v => typeof v === 'number');
          report[def.field_key] = { label: def.label, type: 'numeric', avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0, min: Math.min(...nums), max: Math.max(...nums), total: nums.length };
        } else {
          report[def.field_key] = { label: def.label, type: 'text', sample: values.slice(0, 10), total: values.length };
        }
      }

      return Response.json({ status: 'success', report, field_count: allDefs.length, response_count: orderItems.length });
    }

    // ── Export custom field data as flat rows ──
    if (action === 'export_field_data') {
      const { event_id, workspace_id } = body;

      const [defs, items, tickets, allValues] = await Promise.all([
        base44.asServiceRole.entities.CustomFieldDefinition.filter({ workspace_id, is_reportable: true, is_active: true }),
        base44.asServiceRole.entities.OrderItem.filter({ event_id }),
        base44.asServiceRole.entities.Ticket.filter({ event_id }),
        base44.asServiceRole.entities.FieldValue.filter({ workspace_id }),
      ]);

      const itemIds = new Set(items.map(i => i.id));
      const relevantValues = allValues.filter(v => v.owner_type === 'order_item' && itemIds.has(v.owner_id));

      // Build value lookup: itemId -> { fieldKey: value }
      const valueLookup = {};
      for (const v of relevantValues) {
        if (!valueLookup[v.owner_id]) valueLookup[v.owner_id] = {};
        const def = defs.find(d => d.id === v.field_definition_id);
        if (def) {
          try { valueLookup[v.owner_id][def.field_key] = JSON.parse(v.value_json); } catch { valueLookup[v.owner_id][def.field_key] = v.value_json; }
        }
      }

      // Build flat rows
      const rows = items.map(item => {
        const ticket = tickets.find(t => t.order_item_id === item.id);
        const row = {
          attendee_first_name: item.attendee_first_name,
          attendee_last_name: item.attendee_last_name,
          attendee_email: item.attendee_email,
          attendance_mode: item.attendance_mode,
          check_in_status: ticket?.check_in_status || '',
          ...valueLookup[item.id] || {},
        };
        return row;
      });

      const columns = ['attendee_first_name', 'attendee_last_name', 'attendee_email', 'attendance_mode', 'check_in_status', ...defs.map(d => d.field_key)];

      return Response.json({ status: 'success', columns, rows, total: rows.length });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('customFieldReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});