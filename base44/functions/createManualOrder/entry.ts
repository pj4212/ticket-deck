import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function withRetry(fn, label = 'op', maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const s = err?.statusCode || err?.status || 0;
      const retryable = s === 429 || s >= 500;
      if (!retryable || attempt === maxRetries) throw err;
      const delay = 1000 * attempt + Math.random() * 500;
      console.warn(`${label} attempt ${attempt} failed, retry in ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function generateOrderNumber(source) {
  const prefix = source === 'box_office' ? 'BO' : source === 'complimentary' ? 'CP' : 'MN';
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function generateQrHash(ticketId, eventId) {
  const salt = Deno.env.get("QR_SECRET_SALT");
  const data = new TextEncoder().encode(ticketId + eventId + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_admin', 'event_admin'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized: admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      event_id, buyer, attendees, order_source, payment_method,
      admin_notes, time_slot_id
    } = body;

    if (!event_id || !buyer?.first_name || !buyer?.last_name || !buyer?.email) {
      return Response.json({ error: 'Event and buyer details are required' }, { status: 400 });
    }
    if (!attendees?.length) {
      return Response.json({ error: 'At least one attendee is required' }, { status: 400 });
    }

    const source = order_source || 'manual';
    const method = payment_method || (source === 'complimentary' ? 'complimentary' : 'other');

    // Load event
    const events = await withRetry(
      () => base44.asServiceRole.entities.Event.filter({ id: event_id }),
      'load event'
    );
    if (!events.length) return Response.json({ error: 'Event not found' }, { status: 404 });
    const event = events[0];

    // Load workspace for currency
    let workspace = null;
    if (event.workspace_id) {
      const wsList = await withRetry(() => base44.asServiceRole.entities.Workspace.filter({ id: event.workspace_id }), 'load workspace');
      if (wsList.length) workspace = wsList[0];
    }
    const orderCurrency = event.currency || workspace?.default_currency || 'USD';

    // Load ticket types
    const allTT = await withRetry(
      () => base44.asServiceRole.entities.TicketType.filter({ event_id: event.id }),
      'load tt'
    );
    const ttMap = Object.fromEntries(allTT.map(tt => [tt.id, tt]));

    // Validate attendees
    for (const att of attendees) {
      if (!att.first_name || !att.last_name || !att.ticket_type_id) {
        return Response.json({ error: 'All attendees need name and ticket type' }, { status: 400 });
      }
      if (!ttMap[att.ticket_type_id]) {
        return Response.json({ error: `Invalid ticket type: ${att.ticket_type_id}` }, { status: 400 });
      }
    }

    // Check capacity (but don't block admin if override needed — just warn)
    const capacityIssues = [];
    const counts = {};
    for (const att of attendees) {
      counts[att.ticket_type_id] = (counts[att.ticket_type_id] || 0) + 1;
    }
    for (const [ttId, count] of Object.entries(counts)) {
      const tt = ttMap[ttId];
      if (tt.capacity_limit != null) {
        const available = tt.capacity_limit - (tt.quantity_sold || 0) - (tt.quantity_reserved || 0);
        if (count > available) {
          capacityIssues.push(`"${tt.name}" has ${Math.max(0, available)} spots left, need ${count}`);
        }
      }
    }

    // Check time slot capacity
    let slotInfo = null;
    if (event.scheduling_mode === 'timed_entry' && time_slot_id) {
      const slotMatches = await withRetry(
        () => base44.asServiceRole.entities.TimeSlot.filter({ id: time_slot_id }),
        'load slot'
      );
      if (slotMatches.length) {
        slotInfo = slotMatches[0];
        const remaining = slotInfo.capacity - (slotInfo.booked || 0);
        if (attendees.length > remaining) {
          capacityIssues.push(`Time slot has ${Math.max(0, remaining)} spot(s) left, need ${attendees.length}`);
        }
      }
    }

    // If there are capacity issues but user passed force=true, continue; otherwise return warning
    if (capacityIssues.length && !body.force_override) {
      return Response.json({
        error: 'Capacity issues detected',
        capacity_warnings: capacityIssues,
        requires_force: true,
      }, { status: 409 });
    }

    // Calculate total
    const isComp = source === 'complimentary';
    let totalAmount = 0;
    if (!isComp) {
      for (const att of attendees) {
        totalAmount += ttMap[att.ticket_type_id].price || 0;
      }
    }

    const paymentStatus = isComp ? 'free' : (totalAmount === 0 ? 'free' : 'completed');
    const orderNumber = generateOrderNumber(source);

    // Find admin's PlatformUser id if it exists
    let adminPlatformId = '';
    const pUsers = await base44.asServiceRole.entities.PlatformUser.filter({ email: user.email }).catch(() => []);
    if (pUsers.length) adminPlatformId = pUsers[0].id;

    // Create order
    const order = await withRetry(() => base44.asServiceRole.entities.Order.create({
      workspace_id: event.workspace_id,
      event_id: event.id,
      order_number: orderNumber,
      buyer_first_name: buyer.first_name,
      buyer_last_name: buyer.last_name,
      buyer_email: buyer.email.toLowerCase(),
      buyer_phone: buyer.phone || '',
      total_amount: totalAmount,
      currency: orderCurrency,
      payment_status: paymentStatus,
      order_status: 'confirmed',
      order_source: source,
      payment_method: method,
      admin_notes: admin_notes || '',
      created_by_admin_id: adminPlatformId,
    }), 'create order');

    // Create order items + tickets
    const tickets = [];
    const soldCounts = {};

    for (const att of attendees) {
      const tt = ttMap[att.ticket_type_id];

      // Create order item
      const item = await withRetry(() => base44.asServiceRole.entities.OrderItem.create({
        order_id: order.id,
        event_id: event.id,
        ticket_type_id: att.ticket_type_id,
        time_slot_id: time_slot_id || '',
        attendance_mode: tt.attendance_mode,
        attendee_first_name: att.first_name,
        attendee_last_name: att.last_name,
        attendee_email: (att.email || buyer.email).toLowerCase(),
        unit_price: isComp ? 0 : (tt.price || 0),
        item_status: 'confirmed',
      }), `create item ${att.first_name}`);

      // Create ticket
      const ticket = await withRetry(() => base44.asServiceRole.entities.Ticket.create({
        order_id: order.id,
        order_item_id: item.id,
        event_id: event.id,
        ticket_type_id: att.ticket_type_id,
        time_slot_id: time_slot_id || '',
        attendance_mode: tt.attendance_mode,
        attendee_first_name: att.first_name,
        attendee_last_name: att.last_name,
        attendee_email: (att.email || buyer.email).toLowerCase(),
        qr_code_hash: 'pending',
        ticket_status: 'active',
      }), `create ticket ${att.first_name}`);

      // Generate QR hash
      const qrHash = await generateQrHash(ticket.id, event.id);
      await withRetry(() => base44.asServiceRole.entities.Ticket.update(ticket.id, {
        qr_code_hash: qrHash,
      }), `qr ${ticket.id}`);
      ticket.qr_code_hash = qrHash;
      tickets.push(ticket);

      soldCounts[att.ticket_type_id] = (soldCounts[att.ticket_type_id] || 0) + 1;
    }

    // Update quantity_sold on ticket types
    for (const [ttId, count] of Object.entries(soldCounts)) {
      const tt = ttMap[ttId];
      await withRetry(() => base44.asServiceRole.entities.TicketType.update(ttId, {
        quantity_sold: (tt.quantity_sold || 0) + count,
      }), `update sold ${ttId}`);
    }

    // Update time slot booked count
    if (slotInfo && time_slot_id) {
      await withRetry(() => base44.asServiceRole.entities.TimeSlot.update(time_slot_id, {
        booked: (slotInfo.booked || 0) + attendees.length,
      }), 'update slot booked');
    }

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      workspace_id: event.workspace_id,
      actor_user_id: adminPlatformId,
      actor_type: 'workspace_member',
      action_type: 'create',
      entity_type: 'Order',
      entity_id: order.id,
      metadata_json: JSON.stringify({
        order_number: orderNumber,
        source,
        payment_method: method,
        tickets_created: tickets.length,
        admin_email: user.email,
      }),
    }).catch(e => console.warn('Audit log failed:', e.message));

    // Dispatch ticket.issued webhooks
    for (const ticket of tickets) {
      base44.asServiceRole.functions.invoke('webhookDispatch', {
        action: 'dispatch', workspace_id: event.workspace_id,
        event_type: 'ticket.issued',
        payload: { ticket_id: ticket.id, order_id: order.id, event_id: event.id, attendee_email: ticket.attendee_email, attendee_name: `${ticket.attendee_first_name} ${ticket.attendee_last_name}`, source },
      }).catch(() => {});
    }

    // Send confirmation emails (non-blocking) — skip for complimentary unless explicitly wanted
    if (body.send_confirmation !== false) {
      base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
        action: 'send_order_emails',
        order_id: order.id,
        send_all_to_buyer: true,
      }).catch(e => console.warn('Email failed:', e.message));
    }

    console.log(`Manual order created: ${orderNumber} source=${source} method=${method} tickets=${tickets.length}`);

    return Response.json({
      order_number: orderNumber,
      order_id: order.id,
      tickets_created: tickets.length,
      capacity_warnings: capacityIssues.length ? capacityIssues : undefined,
    });

  } catch (error) {
    console.error("createManualOrder error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});