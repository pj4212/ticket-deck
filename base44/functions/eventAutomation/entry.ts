import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Event automation: template duplication, recurring helper, reminders, alerts ──

async function generateQrHash(ticketId, eventId) {
  const salt = Deno.env.get('QR_SECRET_SALT');
  const data = new TextEncoder().encode(ticketId + eventId + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── Duplicate from template ──
    if (action === 'duplicate_from_template') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const { template_id, event_date, workspace_id } = body;
      const templates = await base44.asServiceRole.entities.EventTemplate.filter({ id: template_id });
      if (!templates.length) return Response.json({ error: 'Template not found' }, { status: 404 });
      const tmpl = templates[0];

      // Build start/end datetimes
      const startTime = tmpl.default_start_time || '09:00';
      const durMins = tmpl.default_duration_mins || 60;
      const startDt = new Date(`${event_date}T${startTime}:00`);
      const endDt = new Date(startDt.getTime() + durMins * 60000);

      const slug = `${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${event_date}`;
      const event = await base44.asServiceRole.entities.Event.create({
        workspace_id: workspace_id || tmpl.workspace_id,
        template_id, name: tmpl.name, slug, description: tmpl.description || '',
        event_mode: tmpl.default_event_mode, event_date,
        start_datetime: startDt.toISOString(), end_datetime: endDt.toISOString(),
        timezone: 'Australia/Brisbane',
        visibility_mode: tmpl.default_visibility_mode || 'public_listed',
        location_id: tmpl.default_location_id || '', venue_id: tmpl.default_venue_id || '',
        zoom_mode: tmpl.default_event_mode === 'in_person' ? 'none' : 'auto',
        recurrence_pattern: tmpl.recurrence_pattern || 'none',
        series_id: body.series_id || '', status: 'draft',
      });

      // Copy default ticket types from template config
      let ttConfigs = [];
      try { ttConfigs = JSON.parse(tmpl.default_ticket_type_configs_json || '[]'); } catch (_) {}
      for (const ttc of ttConfigs) {
        await base44.asServiceRole.entities.TicketType.create({
          event_id: event.id, name: ttc.name || 'General', attendance_mode: ttc.attendance_mode || 'in_person',
          price: ttc.price || 0, requires_payment: (ttc.price || 0) > 0,
          capacity_limit: ttc.capacity_limit || 0, is_active: true, sort_order: ttc.sort_order || 0,
          description: ttc.description || '',
        });
      }

      // Copy default custom fields from template config
      let fieldConfigs = [];
      try { fieldConfigs = JSON.parse(tmpl.default_form_config_json || '[]'); } catch (_) {}
      for (const fc of fieldConfigs) {
        if (fc.field_definition_id) {
          await base44.asServiceRole.entities.EventFieldAssignment.create({
            event_id: event.id, field_definition_id: fc.field_definition_id,
            is_required_override: fc.is_required || false, sort_order: fc.sort_order || 0,
          });
        }
      }

      return Response.json({ status: 'success', event_id: event.id, slug: event.slug });
    }

    // ── Recurring event helper: create next N occurrences ──
    if (action === 'create_recurring') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const { source_event_id, count, pattern } = body;
      const sources = await base44.asServiceRole.entities.Event.filter({ id: source_event_id });
      if (!sources.length) return Response.json({ error: 'Source event not found' }, { status: 404 });
      const src = sources[0];

      const sourceTTs = await base44.asServiceRole.entities.TicketType.filter({ event_id: src.id });
      const sourceFields = await base44.asServiceRole.entities.EventFieldAssignment.filter({ event_id: src.id });

      const interval = pattern === 'fortnightly' ? 14 : pattern === 'monthly' ? 30 : 7;
      const created = [];

      for (let i = 1; i <= (count || 4); i++) {
        const srcDate = new Date(src.event_date + 'T12:00:00');
        srcDate.setDate(srcDate.getDate() + interval * i);
        const dateStr = srcDate.toISOString().slice(0, 10);

        // Compute shifted datetimes
        const origStart = new Date(src.start_datetime);
        const origEnd = new Date(src.end_datetime);
        const dayDiff = interval * i * 86400000;
        const newStart = new Date(origStart.getTime() + dayDiff);
        const newEnd = new Date(origEnd.getTime() + dayDiff);

        const slug = `${src.slug.replace(/-\d{4}-\d{2}-\d{2}$/, '')}-${dateStr}`;
        const ev = await base44.asServiceRole.entities.Event.create({
          workspace_id: src.workspace_id, template_id: src.template_id || '', series_id: src.series_id || '',
          name: src.name, slug, description: src.description || '',
          event_mode: src.event_mode, event_date: dateStr,
          start_datetime: newStart.toISOString(), end_datetime: newEnd.toISOString(),
          timezone: src.timezone, visibility_mode: src.visibility_mode,
          location_id: src.location_id || '', venue_id: '', zoom_mode: src.zoom_mode || 'none',
          recurrence_pattern: pattern || src.recurrence_pattern || 'weekly',
          status: 'draft',
        });

        // Copy ticket types
        for (const tt of sourceTTs) {
          await base44.asServiceRole.entities.TicketType.create({
            event_id: ev.id, name: tt.name, attendance_mode: tt.attendance_mode,
            price: tt.price, requires_payment: tt.requires_payment,
            capacity_limit: tt.capacity_limit, is_active: true, sort_order: tt.sort_order,
            description: tt.description || '',
          });
        }

        // Copy field assignments
        for (const fa of sourceFields) {
          await base44.asServiceRole.entities.EventFieldAssignment.create({
            event_id: ev.id, field_definition_id: fa.field_definition_id,
            is_required_override: fa.is_required_override, sort_order: fa.sort_order,
          });
        }

        created.push({ event_id: ev.id, date: dateStr, slug });
      }

      return Response.json({ status: 'success', created });
    }

    // ── Scheduled: send event reminders ──
    if (action === 'scheduled_reminders') {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const events = await base44.asServiceRole.entities.Event.filter({ event_date: todayStr, status: 'published' });
      if (!events.length) return Response.json({ sent: 0 });

      let totalSent = 0;
      for (const event of events) {
        const startTime = new Date(event.start_datetime);
        const minsUntil = (startTime - now) / 60000;

        const reminderTypes = [];
        if (minsUntil >= 57 && minsUntil <= 63) reminderTypes.push('1hour');
        if (minsUntil >= 2 && minsUntil <= 8) reminderTypes.push('5min');
        if (!reminderTypes.length) continue;

        for (const rt of reminderTypes) {
          try {
            const res = await base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
              action: 'send_reminders', event_id: event.id, reminder_type: rt === '5min' ? '5min' : '1hour',
            });
            totalSent += res?.data?.sent || 0;
          } catch (e) { console.error(`Reminder failed for ${event.name}:`, e.message); }
        }
      }

      return Response.json({ status: 'success', sent: totalSent });
    }

    // ── Scheduled: sales closing reminders ──
    if (action === 'sales_closing_check') {
      const now = new Date();
      const events = await base44.asServiceRole.entities.Event.filter({ status: 'published' });

      const alerts = [];
      for (const event of events) {
        if (!event.sales_close_at) continue;
        const closeAt = new Date(event.sales_close_at);
        const hoursUntilClose = (closeAt - now) / 3600000;
        if (hoursUntilClose > 0 && hoursUntilClose <= 2) {
          alerts.push({ event_id: event.id, event_name: event.name, hours_until_close: Math.round(hoursUntilClose * 10) / 10 });
        }
      }

      return Response.json({ status: 'success', closing_soon: alerts });
    }

    // ── Scheduled: organiser alerts for incomplete events ──
    if (action === 'incomplete_event_check') {
      const now = new Date();
      const sevenDaysOut = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const threeDaysOut = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
      const todayStr = now.toISOString().slice(0, 10);

      // Check both draft and published events for issues
      const allEvents = await base44.asServiceRole.entities.Event.filter({});
      const upcoming = allEvents.filter(e => e.event_date >= todayStr && e.event_date <= sevenDaysOut);

      const issues = [];
      for (const event of upcoming) {
        const warnings = [];
        const severity = event.event_date <= threeDaysOut ? 'high' : 'medium';

        // Missing Zoom link for online/hybrid events
        if (['online_stream', 'hybrid'].includes(event.event_mode) && !event.zoom_link) {
          warnings.push('Missing online meeting link');
        }

        // Venue not confirmed for in-person/hybrid events close to date
        if (['in_person', 'hybrid'].includes(event.event_mode)) {
          if (!event.venue_id && !event.venue_details) {
            warnings.push('No venue assigned');
          } else if (event.venue_confirmed === false && event.event_date <= threeDaysOut) {
            warnings.push('Venue not confirmed (event within 3 days)');
          }
        }

        // No ticket types
        const tts = await base44.asServiceRole.entities.TicketType.filter({ event_id: event.id, is_active: true });
        if (!tts.length) warnings.push('No ticket types configured');

        // Still in draft and event is within 3 days
        if (event.status === 'draft' && event.event_date <= threeDaysOut) {
          warnings.push('Event still in draft status');
        }

        if (warnings.length) {
          issues.push({
            event_id: event.id, event_name: event.name, event_date: event.event_date,
            workspace_id: event.workspace_id, warnings, severity,
          });
        }
      }

      // Create platform alerts
      for (const issue of issues) {
        // Check if alert already exists (prevent duplicates)
        const existing = await base44.asServiceRole.entities.PlatformAlert.filter({
          entity_id: issue.event_id, alert_type: 'capacity_warning', status: 'open',
        }).catch(() => []);
        if (existing.length) continue;

        await base44.asServiceRole.entities.PlatformAlert.create({
          workspace_id: issue.workspace_id || '',
          alert_type: 'capacity_warning',
          severity: issue.severity,
          title: `${issue.severity === 'high' ? '⚠️ ' : ''}Incomplete event: ${issue.event_name}`,
          description: `Event on ${issue.event_date} has ${issue.warnings.length} issue(s): ${issue.warnings.join(', ')}`,
          metadata_json: JSON.stringify({ event_id: issue.event_id, warnings: issue.warnings }),
          status: 'open',
        }).catch(e => console.warn('Alert create failed:', e.message));

        // Send email alert to workspace admin for high severity
        if (issue.severity === 'high' && issue.workspace_id) {
          const memberships = await base44.asServiceRole.entities.WorkspaceMembership.filter({
            workspace_id: issue.workspace_id, role: 'super_admin',
          }).catch(() => []);
          for (const m of memberships.slice(0, 3)) {
            const users = await base44.asServiceRole.entities.PlatformUser.filter({ id: m.user_id }).catch(() => []);
            if (users.length && users[0].email) {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: users[0].email,
                subject: `⚠️ Event Alert: ${issue.event_name} (${issue.event_date})`,
                body: `<div style="font-family:sans-serif;max-width:600px;margin:auto"><h2>Event Alert</h2><p><strong>${issue.event_name}</strong> on ${issue.event_date} has the following issues:</p><ul>${issue.warnings.map(w => `<li>${w}</li>`).join('')}</ul><p>Please review and resolve before the event date.</p></div>`,
                from_name: 'Ticket Deck Alerts',
              }).catch(e => console.warn('Alert email failed:', e.message));
            }
          }
        }
      }

      return Response.json({ status: 'success', incomplete_events: issues });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('eventAutomation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});