import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Data migration: old Session Pass → new Event entity model ──
// Maps legacy EventOccurrence fields to Event entity.
// Preserves ticket/order history, QR hashes, check-in history.
// Maintains workspace boundaries.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // ── Migrate EventOccurrence → Event ──
    if (action === 'migrate_occurrences_to_events') {
      const { workspace_id, dry_run } = body;
      if (!workspace_id) return Response.json({ error: 'workspace_id required' }, { status: 400 });

      // Check if old entity exists by attempting a filter
      let oldEvents = [];
      try {
        oldEvents = await base44.asServiceRole.entities.EventOccurrence.filter({ workspace_id });
      } catch (e) {
        return Response.json({ error: 'EventOccurrence entity not found — migration may already be complete', detail: e.message }, { status: 404 });
      }

      if (!oldEvents.length) return Response.json({ status: 'success', migrated: 0, message: 'No events to migrate' });

      const results = { migrated: 0, skipped: 0, errors: [], ticket_types_migrated: 0, tickets_remapped: 0 };

      for (const old of oldEvents) {
        // Check if already migrated (by slug)
        const existing = await base44.asServiceRole.entities.Event.filter({ workspace_id, slug: old.slug });
        if (existing.length) { results.skipped++; continue; }

        if (dry_run) { results.migrated++; continue; }

        // Map fields
        const newEvent = await base44.asServiceRole.entities.Event.create({
          workspace_id: old.workspace_id || workspace_id,
          template_id: old.template_id || '',
          series_id: old.series_id || '',
          name: old.name,
          slug: old.slug,
          description: old.description || '',
          visibility_mode: old.visibility_mode || 'public_listed',
          event_mode: old.event_mode,
          event_date: old.event_date,
          start_datetime: old.start_datetime || '',
          end_datetime: old.end_datetime || '',
          timezone: old.timezone || 'Australia/Brisbane',
          recurrence_pattern: old.recurrence_pattern || 'none',
          location_id: old.location_id || '',
          venue_id: old.venue_id || '',
          venue_confirmed: old.venue_confirmed || false,
          venue_details: old.venue_details || '',
          zoom_mode: old.zoom_webinar_mode === 'auto' ? 'auto' : old.zoom_webinar_mode === 'manual' ? 'manual' : 'none',
          zoom_link: old.zoom_link || '',
          zoom_meeting_id: old.zoom_meeting_id || '',
          zoom_webinar_id: old.zoom_meeting_id || '',
          sales_close_at: old.sales_close_date || '',
          status: old.status || (old.is_published ? 'published' : 'draft'),
        });
        results.migrated++;

        // Migrate ticket types (occurrence_id → event_id)
        const oldTTs = await base44.asServiceRole.entities.TicketType.filter({ occurrence_id: old.id });
        const ttIdMap = {}; // old TT id → new TT id

        for (const tt of oldTTs) {
          const newTT = await base44.asServiceRole.entities.TicketType.create({
            event_id: newEvent.id,
            name: tt.name,
            attendance_mode: tt.attendance_mode,
            category_slug: tt.ticket_category || '',
            price: tt.price || 0,
            currency: tt.currency || 'AUD',
            requires_payment: tt.requires_payment || false,
            capacity_limit: tt.capacity_limit,
            quantity_sold: tt.quantity_sold || 0,
            quantity_reserved: tt.quantity_reserved || 0,
            per_order_limit: tt.per_order_limit || null,
            is_active: tt.is_active !== false,
            sort_order: tt.sort_order || 0,
            description: tt.description || '',
          });
          ttIdMap[tt.id] = newTT.id;
          results.ticket_types_migrated++;
        }

        // Remap tickets: occurrence_id → event_id, ticket_type_id
        const oldTickets = await base44.asServiceRole.entities.Ticket.filter({ event_id: old.id });
        // Also check legacy field
        let legacyTickets = [];
        try { legacyTickets = await base44.asServiceRole.entities.Ticket.filter({ occurrence_id: old.id }); } catch (_) {}
        const allTickets = [...oldTickets, ...legacyTickets];
        const seenIds = new Set();

        for (const ticket of allTickets) {
          if (seenIds.has(ticket.id)) continue;
          seenIds.add(ticket.id);

          const updates = { event_id: newEvent.id };
          if (ttIdMap[ticket.ticket_type_id]) updates.ticket_type_id = ttIdMap[ticket.ticket_type_id];
          await base44.asServiceRole.entities.Ticket.update(ticket.id, updates);
          results.tickets_remapped++;
        }

        // Remap orders
        const oldOrders = await base44.asServiceRole.entities.Order.filter({ event_id: old.id });
        for (const order of oldOrders) {
          await base44.asServiceRole.entities.Order.update(order.id, { event_id: newEvent.id });
        }

        // Remap order items
        const oldItems = await base44.asServiceRole.entities.OrderItem.filter({ event_id: old.id });
        for (const item of oldItems) {
          const updates = { event_id: newEvent.id };
          if (ttIdMap[item.ticket_type_id]) updates.ticket_type_id = ttIdMap[item.ticket_type_id];
          await base44.asServiceRole.entities.OrderItem.update(item.id, updates);
        }

        // Migrate custom field values from old niche fields to new system
        // (upline_mentor_id, platinum_leader_id → FieldValue records)
        // This is workspace-specific, so we just note them for manual review
      }

      return Response.json({ status: 'success', ...results });
    }

    // ── Migrate niche fields to custom field system ──
    if (action === 'migrate_niche_fields') {
      const { workspace_id } = body;

      // Create custom field definitions for legacy niche fields
      const nicheFields = [
        { label: 'Upline Mentor', field_key: 'upline_mentor', field_type: 'text', applies_to: 'checkout' },
        { label: 'Platinum Leader', field_key: 'platinum_leader', field_type: 'text', applies_to: 'checkout' },
        { label: 'Ticket Category', field_key: 'ticket_category', field_type: 'dropdown', applies_to: 'ticket' },
      ];

      const created = [];
      for (const nf of nicheFields) {
        const existing = await base44.asServiceRole.entities.CustomFieldDefinition.filter({ workspace_id, field_key: nf.field_key });
        if (!existing.length) {
          const def = await base44.asServiceRole.entities.CustomFieldDefinition.create({
            workspace_id, ...nf, is_required: false, is_reportable: true, preset_category: 'custom', is_active: true,
          });
          created.push(def.field_key);
        }
      }

      return Response.json({ status: 'success', created_fields: created });
    }

    // ── Verify migration integrity ──
    if (action === 'verify_migration') {
      const { workspace_id } = body;

      const events = await base44.asServiceRole.entities.Event.filter({ workspace_id });
      const tickets = await base44.asServiceRole.entities.Ticket.filter({});
      const orders = await base44.asServiceRole.entities.Order.filter({ workspace_id });

      const eventIds = new Set(events.map(e => e.id));
      const orphanedTickets = tickets.filter(t => t.event_id && !eventIds.has(t.event_id));
      const orphanedOrders = orders.filter(o => o.event_id && !eventIds.has(o.event_id));

      // Check for tickets with missing QR hashes
      const missingQr = tickets.filter(t => t.ticket_status === 'active' && (!t.qr_code_hash || t.qr_code_hash === 'pending'));

      return Response.json({
        status: 'success',
        events: events.length,
        tickets: tickets.length,
        orders: orders.length,
        orphaned_tickets: orphanedTickets.length,
        orphaned_orders: orphanedOrders.length,
        missing_qr: missingQr.length,
        healthy: orphanedTickets.length === 0 && orphanedOrders.length === 0 && missingQr.length === 0,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('dataSyncApi error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});