import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Pre-checkout validation endpoint — called before createCheckout to give fast feedback

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_id, attendees, access_password } = await req.json();

    const errors = [];

    // 1. Load event
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events.length) {
      return Response.json({ valid: false, errors: [{ field: 'event', message: 'Event not found' }] });
    }
    const event = events[0];

    // 2. Access rules
    if (event.status !== 'published') {
      errors.push({ field: 'event', message: 'Event is not available for booking' });
    }
    const now = new Date().toISOString();
    if (event.sales_open_at && now < event.sales_open_at) {
      errors.push({ field: 'event', message: 'Sales have not opened yet' });
    }
    if (event.sales_close_at && now > event.sales_close_at) {
      errors.push({ field: 'event', message: 'Sales have closed' });
    }
    if (event.visibility_mode === 'private_invite_only') {
      errors.push({ field: 'event', message: 'This event is invite-only' });
    }
    if (event.visibility_mode === 'password_protected' && access_password !== event.access_password) {
      errors.push({ field: 'password', message: 'Incorrect event password' });
    }

    if (errors.length) return Response.json({ valid: false, errors });

    // 3. Load ticket types
    const ticketTypes = await base44.asServiceRole.entities.TicketType.filter({ event_id: event.id });
    const ttMap = Object.fromEntries(ticketTypes.map(tt => [tt.id, tt]));

    if (!attendees?.length) {
      return Response.json({ valid: false, errors: [{ field: 'attendees', message: 'At least one attendee is required' }] });
    }

    // 4. Validate each attendee
    for (let i = 0; i < attendees.length; i++) {
      const att = attendees[i];
      if (!att.first_name || !att.last_name || !att.email) {
        errors.push({ field: `attendees[${i}]`, message: 'Name and email are required' });
        continue;
      }
      if (!/\S+@\S+\.\S+/.test(att.email)) {
        errors.push({ field: `attendees[${i}].email`, message: 'Invalid email address' });
      }
      const tt = ttMap[att.ticket_type_id];
      if (!tt) {
        errors.push({ field: `attendees[${i}].ticket_type_id`, message: 'Invalid ticket type' });
        continue;
      }
      if (!tt.is_active) {
        errors.push({ field: `attendees[${i}].ticket_type_id`, message: `"${tt.name}" is not available` });
      }
      // Per-order limit
      if (tt.per_order_limit) {
        const countInCart = attendees.filter(a => a.ticket_type_id === tt.id).length;
        if (countInCart > tt.per_order_limit) {
          errors.push({ field: `attendees[${i}].ticket_type_id`, message: `Maximum ${tt.per_order_limit} tickets per order for "${tt.name}"` });
        }
      }
    }

    // 5. Capacity check
    const capacityCounts = {};
    for (const att of attendees) {
      const tt = ttMap[att.ticket_type_id];
      if (tt && tt.capacity_limit != null) {
        capacityCounts[tt.id] = (capacityCounts[tt.id] || 0) + 1;
      }
    }
    for (const [ttId, count] of Object.entries(capacityCounts)) {
      const tt = ttMap[ttId];
      const available = tt.capacity_limit - (tt.quantity_sold || 0) - (tt.quantity_reserved || 0);
      if (count > available) {
        errors.push({ field: 'capacity', message: `Only ${Math.max(0, available)} spots remaining for "${tt.name}"` });
      }
    }

    // 6. Intra-cart duplicate check
    const seen = new Set();
    for (let i = 0; i < attendees.length; i++) {
      const att = attendees[i];
      const tt = ttMap[att.ticket_type_id];
      if (!tt) continue;
      const key = `${att.email.toLowerCase()}::${tt.attendance_mode}`;
      if (seen.has(key)) {
        errors.push({ field: `attendees[${i}]`, message: `${att.email} already has a ${tt.attendance_mode} ticket in this order` });
      }
      seen.add(key);
    }

    // 7. Cross-order duplicate check
    if (errors.length === 0) {
      const existingTickets = await base44.asServiceRole.entities.Ticket.filter({
        event_id: event.id,
        ticket_status: 'active',
      });
      const existingKeys = new Set(existingTickets.map(t => `${t.attendee_email.toLowerCase()}::${t.attendance_mode}`));

      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const tt = ttMap[att.ticket_type_id];
        if (!tt) continue;
        const key = `${att.email.toLowerCase()}::${tt.attendance_mode}`;
        if (existingKeys.has(key)) {
          errors.push({ field: `attendees[${i}]`, message: `${att.email} already has an active ${tt.attendance_mode} ticket for this event` });
        }
      }
    }

    return Response.json({ valid: errors.length === 0, errors });
  } catch (error) {
    console.error("validateCheckout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});