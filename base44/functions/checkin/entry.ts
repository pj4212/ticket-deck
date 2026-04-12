import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function withRetry(fn, label = 'op', maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const s = err?.statusCode || err?.status || 0;
      const retryable = s === 429 || s >= 500 || err?.code === 'ETIMEDOUT';
      if (!retryable || attempt === maxRetries) throw err;
      const delay = Math.min(500 * Math.pow(2, attempt - 1) + Math.random() * 300, 10000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, ticket_id, qr_hash } = body;
    // Support both event_id and legacy occurrence_id
    const eventId = body.event_id || body.occurrence_id;

    if (action === 'checkin') {
      // Lookup ticket
      let ticket;
      if (qr_hash) {
        const tickets = await base44.asServiceRole.entities.Ticket.filter({ qr_code_hash: qr_hash });
        if (!tickets.length) return Response.json({ status: 'error', reason: 'Ticket not found' });
        ticket = tickets[0];
      } else if (ticket_id) {
        const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
        if (!tickets.length) return Response.json({ status: 'error', reason: 'Ticket not found' });
        ticket = tickets[0];
      } else {
        return Response.json({ status: 'error', reason: 'No ticket identifier provided' });
      }

      // Validate QR hash match
      if (ticket_id && qr_hash && ticket.qr_code_hash !== qr_hash) {
        return Response.json({ status: 'error', reason: 'Invalid ticket' });
      }

      // Event match check
      let crossEventWarning = null;
      if (eventId && ticket.event_id !== eventId) {
        let ticketEvent = null;
        try {
          const evts = await base44.asServiceRole.entities.Event.filter({ id: ticket.event_id });
          if (evts.length) ticketEvent = evts[0];
        } catch (_) {}

        const today = new Date().toISOString().slice(0, 10);
        const ticketDate = ticketEvent?.event_date || '';

        if (ticketDate !== today) {
          return Response.json({
            status: 'error',
            reason: `Wrong event — ticket is for "${ticketEvent?.name || 'unknown'}" on ${ticketDate || 'unknown'}`,
            ticket
          });
        }
        crossEventWarning = ticketEvent?.name || 'a different event';
      }

      // Status checks
      if (ticket.ticket_status === 'cancelled') return Response.json({ status: 'error', reason: 'Ticket cancelled', ticket });
      if (ticket.ticket_status === 'refunded') return Response.json({ status: 'error', reason: 'Ticket refunded', ticket });

      if (ticket.check_in_status === 'checked_in') {
        return Response.json({
          status: 'warning',
          reason: `Already checked in${ticket.checked_in_at ? ` at ${new Date(ticket.checked_in_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ''}`,
          ticket
        });
      }

      // Atomic check-in
      const now = new Date().toISOString();
      await withRetry(() => base44.asServiceRole.entities.Ticket.update(ticket.id, {
        check_in_status: 'checked_in',
        checked_in_at: now,
        checked_in_by: user.id,
      }), `checkin ${ticket.id}`);

      // Append-only CheckInLog
      await withRetry(() => base44.asServiceRole.entities.CheckInLog.create({
        ticket_id: ticket.id,
        event_id: ticket.event_id,
        action: 'check_in',
        performed_by: user.id,
      }), `log ${ticket.id}`);

      // Build warnings
      const warnings = [];
      if (crossEventWarning) warnings.push(`Different event: ${crossEventWarning}`);
      if (ticket.attendance_mode === 'online') warnings.push('Online ticket — not for in-person entry');

      const updatedTicket = { ...ticket, check_in_status: 'checked_in', checked_in_at: now };

      // Dispatch webhook: ticket.checked_in
      base44.asServiceRole.functions.invoke('webhookDispatch', {
        action: 'dispatch',
        workspace_id: ticket.event_id ? (await base44.asServiceRole.entities.Event.filter({ id: ticket.event_id }).then(e => e[0]?.workspace_id).catch(() => '')) : '',
        event_type: 'ticket.checked_in',
        payload: {
          ticket_id: ticket.id,
          event_id: ticket.event_id,
          attendee_email: ticket.attendee_email,
          attendee_name: `${ticket.attendee_first_name} ${ticket.attendee_last_name}`,
          checked_in_at: now,
        },
      }).catch(() => {});

      if (warnings.length > 0) {
        return Response.json({ status: 'warning_checked_in', reason: warnings.join(' | '), ticket: updatedTicket });
      }

      return Response.json({ status: 'success', ticket: updatedTicket });
    }

    if (action === 'undo_checkin') {
      const tickets = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
      if (!tickets.length) return Response.json({ status: 'error', reason: 'Invalid ticket' });
      const ticket = tickets[0];

      if (ticket.check_in_status !== 'checked_in') {
        return Response.json({ status: 'warning', reason: 'Not checked in' });
      }

      await withRetry(() => base44.asServiceRole.entities.Ticket.update(ticket.id, {
        check_in_status: 'not_checked_in', checked_in_at: '', checked_in_by: '',
      }), `undo ${ticket.id}`);

      await withRetry(() => base44.asServiceRole.entities.CheckInLog.create({
        ticket_id: ticket.id, event_id: ticket.event_id,
        action: 'undo_check_in', performed_by: user.id,
      }), `log undo ${ticket.id}`);

      return Response.json({
        status: 'success',
        ticket: { ...ticket, check_in_status: 'not_checked_in', checked_in_at: '', checked_in_by: '' }
      });
    }

    if (action === 'poll') {
      // Minimal payload polling — only return check-in status
      const tickets = await base44.asServiceRole.entities.Ticket.filter({
        event_id: eventId,
        ticket_status: 'active',
      });
      return Response.json({
        status: 'success',
        tickets: tickets.map(t => ({ id: t.id, check_in_status: t.check_in_status, checked_in_at: t.checked_in_at || '' })),
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("checkin error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});