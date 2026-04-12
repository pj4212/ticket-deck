import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function generateManageToken(orderId) {
  const secret = Deno.env.get("QR_SECRET_SALT");
  const data = new TextEncoder().encode(orderId + ':manage:' + secret);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
}

async function generateQrHash(ticketData) {
  const secret = Deno.env.get("QR_SECRET_SALT");
  const raw = `${ticketData.event_id}:${ticketData.attendee_email}:${Date.now()}:${secret}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── LOOKUP ORDER (buyer or admin) ──
    if (action === 'lookup') {
      const { order_number, manage_token } = body;
      if (!order_number) return Response.json({ error: 'Order number required' }, { status: 400 });

      const orders = await base44.asServiceRole.entities.Order.filter({ order_number });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      // Auth: token or logged-in buyer or admin
      const expectedToken = await generateManageToken(order.id);
      let authorized = false;
      let isAdmin = false;

      if (manage_token === expectedToken) {
        authorized = true;
      }
      if (!authorized) {
        try {
          const user = await base44.auth.me();
          if (user) {
            if (user.email?.toLowerCase() === order.buyer_email?.toLowerCase()) authorized = true;
            if (['admin', 'super_admin', 'event_admin'].includes(user.role)) { authorized = true; isAdmin = true; }
          }
        } catch (_) {}
      }
      if (!authorized) return Response.json({ error: 'Access denied' }, { status: 403 });

      // Load data
      const [events, allTickets, orderItems] = await Promise.all([
        base44.asServiceRole.entities.Event.filter({ id: order.event_id }),
        base44.asServiceRole.entities.Ticket.filter({ order_id: order.id }),
        base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id }),
      ]);
      const event = events[0] || null;
      let ttMap = {};
      if (event) {
        const tts = await base44.asServiceRole.entities.TicketType.filter({ event_id: event.id });
        ttMap = Object.fromEntries(tts.map(tt => [tt.id, tt]));
      }

      // Venue info
      let venue = null;
      if (event?.venue_id) {
        const venues = await base44.asServiceRole.entities.Venue.filter({ id: event.venue_id });
        venue = venues[0] || null;
      }

      const ticketData = allTickets.map(t => ({
        id: t.id,
        attendee_first_name: t.attendee_first_name,
        attendee_last_name: t.attendee_last_name,
        attendee_email: t.attendee_email,
        attendance_mode: t.attendance_mode,
        ticket_type_id: t.ticket_type_id,
        ticket_type_name: ttMap[t.ticket_type_id]?.name || 'Ticket',
        qr_code_hash: t.qr_code_hash,
        qr_code_url: t.qr_code_hash && t.qr_code_hash !== 'pending'
          ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(t.qr_code_hash)}`
          : '',
        check_in_status: t.check_in_status,
        zoom_join_url: t.zoom_join_url || '',
        ticket_status: t.ticket_status,
        original_ticket_id: t.original_ticket_id || '',
        replacement_ticket_id: t.replacement_ticket_id || '',
      }));

      // Check if sales are still open (for attendee detail editing)
      const now = new Date();
      const salesClose = event?.sales_close_at ? new Date(event.sales_close_at) : null;
      const canEditAttendees = salesClose ? now < salesClose : true;

      return Response.json({
        order: {
          id: order.id,
          order_number: order.order_number,
          buyer_first_name: order.buyer_first_name,
          buyer_last_name: order.buyer_last_name,
          buyer_email: order.buyer_email,
          buyer_phone: order.buyer_phone || '',
          total_amount: order.total_amount,
          currency: order.currency || 'AUD',
          payment_status: order.payment_status,
          order_status: order.order_status,
          created_date: order.created_date,
        },
        event: event ? {
          id: event.id,
          name: event.name,
          slug: event.slug,
          event_date: event.event_date,
          start_datetime: event.start_datetime,
          end_datetime: event.end_datetime,
          timezone: event.timezone,
          event_mode: event.event_mode,
          venue_details: event.venue_details || '',
          zoom_link: event.zoom_link || '',
        } : null,
        venue: venue ? { name: venue.name, address: venue.address, venue_link: venue.venue_link, parking_link: venue.parking_link } : null,
        tickets: ticketData,
        can_edit_attendees: canEditAttendees,
        is_admin: isAdmin,
      });
    }

    // ── GENERATE MANAGE TOKEN ──
    if (action === 'generate_token') {
      const { order_id } = body;
      if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });
      const token = await generateManageToken(order_id);
      return Response.json({ manage_token: token });
    }

    // ── ADMIN ACTIONS (require admin auth) ──
    const adminActions = ['cancel_order', 'mark_refund_requested', 'mark_refunded', 'cancel_ticket', 'reschedule_ticket', 'resend_emails'];
    if (adminActions.includes(action)) {
      const user = await base44.auth.me();
      if (!user || !['admin', 'super_admin', 'event_admin'].includes(user.role)) {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { order_id } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      // CANCEL ORDER
      if (action === 'cancel_order') {
        const tickets = await base44.asServiceRole.entities.Ticket.filter({ order_id: order.id });
        for (const t of tickets) {
          if (t.ticket_status === 'active') {
            await base44.asServiceRole.entities.Ticket.update(t.id, { ticket_status: 'cancelled' });
            base44.asServiceRole.functions.invoke('webhookDispatch', {
              action: 'dispatch', workspace_id: order.workspace_id,
              event_type: 'ticket.cancelled',
              payload: { ticket_id: t.id, order_id: order.id, event_id: order.event_id, attendee_email: t.attendee_email },
            }).catch(() => {});
          }
        }
        await base44.asServiceRole.entities.Order.update(order.id, { order_status: 'cancelled' });
        return Response.json({ success: true, message: 'Order cancelled' });
      }

      // MARK REFUND REQUESTED
      if (action === 'mark_refund_requested') {
        await base44.asServiceRole.entities.Order.update(order.id, { order_status: 'refund_requested' });
        return Response.json({ success: true });
      }

      // MARK REFUNDED
      if (action === 'mark_refunded') {
        const tickets = await base44.asServiceRole.entities.Ticket.filter({ order_id: order.id });
        for (const t of tickets) {
          if (t.ticket_status === 'active') {
            await base44.asServiceRole.entities.Ticket.update(t.id, { ticket_status: 'refunded' });
            base44.asServiceRole.functions.invoke('webhookDispatch', {
              action: 'dispatch', workspace_id: order.workspace_id,
              event_type: 'ticket.refunded',
              payload: { ticket_id: t.id, order_id: order.id, event_id: order.event_id, attendee_email: t.attendee_email },
            }).catch(() => {});
          }
        }
        await base44.asServiceRole.entities.Order.update(order.id, {
          order_status: 'cancelled',
          payment_status: 'refunded',
        });
        return Response.json({ success: true });
      }

      // CANCEL TICKET
      if (action === 'cancel_ticket') {
        const { ticket_id } = body;
        await base44.asServiceRole.entities.Ticket.update(ticket_id, { ticket_status: 'cancelled' });
        base44.asServiceRole.functions.invoke('webhookDispatch', {
          action: 'dispatch', workspace_id: order.workspace_id,
          event_type: 'ticket.cancelled',
          payload: { ticket_id, order_id: order.id, event_id: order.event_id },
        }).catch(() => {});
        return Response.json({ success: true });
      }

      // RESCHEDULE TICKET (preserves lineage)
      if (action === 'reschedule_ticket') {
        const { ticket_id, target_event_id } = body;
        const ticketArr = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
        if (!ticketArr.length) return Response.json({ error: 'Ticket not found' }, { status: 404 });
        const oldTicket = ticketArr[0];

        // Generate new QR
        const newQr = await generateQrHash({ event_id: target_event_id, attendee_email: oldTicket.attendee_email });

        // Find matching ticket type on target event
        const targetTTs = await base44.asServiceRole.entities.TicketType.filter({ event_id: target_event_id });
        const matchingTT = targetTTs.find(tt => tt.attendance_mode === oldTicket.attendance_mode && tt.is_active)
          || targetTTs.find(tt => tt.is_active);
        if (!matchingTT) return Response.json({ error: 'No eligible ticket types on target event' }, { status: 400 });

        // Create new ticket with lineage
        const newTicket = await base44.asServiceRole.entities.Ticket.create({
          order_id: oldTicket.order_id,
          order_item_id: oldTicket.order_item_id || '',
          event_id: target_event_id,
          ticket_type_id: matchingTT.id,
          attendance_mode: oldTicket.attendance_mode,
          attendee_first_name: oldTicket.attendee_first_name,
          attendee_last_name: oldTicket.attendee_last_name,
          attendee_email: oldTicket.attendee_email,
          qr_code_hash: newQr,
          ticket_status: 'active',
          original_ticket_id: oldTicket.id,
        });

        // Mark old ticket as rescheduled with link to replacement
        await base44.asServiceRole.entities.Ticket.update(oldTicket.id, {
          ticket_status: 'rescheduled',
          replacement_ticket_id: newTicket.id,
        });

        // Notify attendee
        const targetEvents = await base44.asServiceRole.entities.Event.filter({ id: target_event_id });
        const targetEvent = targetEvents[0];
        if (targetEvent) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: oldTicket.attendee_email,
            subject: `Your ticket has been rescheduled to ${targetEvent.name}`,
            body: `<p>Hi ${oldTicket.attendee_first_name},</p><p>Your ticket has been rescheduled.</p><p><strong>New Event:</strong> ${targetEvent.name}<br><strong>Date:</strong> ${targetEvent.event_date}</p><p>Your new QR code and details are available in your order.</p>`,
          });
        }

        return Response.json({ success: true, new_ticket_id: newTicket.id });
      }

      // RESEND EMAILS
      if (action === 'resend_emails') {
        await base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
          action: 'send_order_emails',
          order_id: order.id,
        });
        return Response.json({ success: true });
      }
    }

    // ── BUYER ACTIONS ──

    // REQUEST CANCELLATION (buyer)
    if (action === 'request_cancellation') {
      const { order_number, manage_token } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ order_number });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      const expectedToken = await generateManageToken(order.id);
      let authorized = false;
      if (manage_token === expectedToken) authorized = true;
      if (!authorized) {
        try { const u = await base44.auth.me(); if (u?.email?.toLowerCase() === order.buyer_email?.toLowerCase()) authorized = true; } catch (_) {}
      }
      if (!authorized) return Response.json({ error: 'Access denied' }, { status: 403 });

      await base44.asServiceRole.entities.Order.update(order.id, { order_status: 'refund_requested' });
      return Response.json({ success: true, message: 'Cancellation/refund requested. The organiser will review your request.' });
    }

    // UPDATE ATTENDEE DETAILS (buyer, before sales close)
    if (action === 'update_attendee') {
      const { order_number, manage_token, ticket_id, first_name, last_name, email } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ order_number });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      const expectedToken = await generateManageToken(order.id);
      let authorized = false;
      if (manage_token === expectedToken) authorized = true;
      if (!authorized) {
        try { const u = await base44.auth.me(); if (u?.email?.toLowerCase() === order.buyer_email?.toLowerCase()) authorized = true; } catch (_) {}
      }
      if (!authorized) return Response.json({ error: 'Access denied' }, { status: 403 });

      // Check sales window
      const events = await base44.asServiceRole.entities.Event.filter({ id: order.event_id });
      const event = events[0];
      if (event?.sales_close_at && new Date() > new Date(event.sales_close_at)) {
        return Response.json({ error: 'Sales have closed. Contact the organiser to update details.' }, { status: 400 });
      }

      const updates = {};
      if (first_name) updates.attendee_first_name = first_name;
      if (last_name) updates.attendee_last_name = last_name;
      if (email) updates.attendee_email = email;

      await base44.asServiceRole.entities.Ticket.update(ticket_id, updates);
      return Response.json({ success: true });
    }

    // RESEND CONFIRMATION (buyer)
    if (action === 'buyer_resend') {
      const { order_number, manage_token } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ order_number });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      const expectedToken = await generateManageToken(order.id);
      let authorized = false;
      if (manage_token === expectedToken) authorized = true;
      if (!authorized) {
        try { const u = await base44.auth.me(); if (u?.email?.toLowerCase() === order.buyer_email?.toLowerCase()) authorized = true; } catch (_) {}
      }
      if (!authorized) return Response.json({ error: 'Access denied' }, { status: 403 });

      await base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
        action: 'send_order_emails',
        order_id: order.id,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("manageOrder error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});