import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { code, event_id, ticket_type_ids } = await req.json();

    if (!code || !event_id) {
      return Response.json({ valid: false, error: 'Code and event are required' });
    }

    // Find matching code in workspace
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events.length) return Response.json({ valid: false, error: 'Event not found' });
    const event = events[0];

    const codes = await base44.asServiceRole.entities.DiscountCode.filter({
      workspace_id: event.workspace_id,
      code: code.toUpperCase().trim(),
      is_active: true,
    });

    if (!codes.length) {
      return Response.json({ valid: false, error: 'Invalid discount code' });
    }

    const dc = codes[0];
    const now = new Date().toISOString();

    // Check date validity
    if (dc.valid_from && now < dc.valid_from) {
      return Response.json({ valid: false, error: 'This code is not yet active' });
    }
    if (dc.valid_until && now > dc.valid_until) {
      return Response.json({ valid: false, error: 'This code has expired' });
    }

    // Check usage limit
    if (dc.usage_limit != null && (dc.times_used || 0) >= dc.usage_limit) {
      return Response.json({ valid: false, error: 'This code has reached its usage limit' });
    }

    // Check event applicability
    if (dc.applicable_event_ids_json) {
      try {
        const eventIds = JSON.parse(dc.applicable_event_ids_json);
        if (eventIds.length > 0 && !eventIds.includes(event_id)) {
          return Response.json({ valid: false, error: 'This code is not valid for this event' });
        }
      } catch (_) {}
    }

    // Check ticket type applicability
    let applicableTicketTypeIds = null;
    if (dc.applicable_ticket_type_ids_json) {
      try {
        applicableTicketTypeIds = JSON.parse(dc.applicable_ticket_type_ids_json);
        if (applicableTicketTypeIds.length === 0) applicableTicketTypeIds = null;
      } catch (_) {}
    }

    return Response.json({
      valid: true,
      discount: {
        id: dc.id,
        code: dc.code,
        discount_type: dc.discount_type,
        discount_value: dc.discount_value,
        applicable_ticket_type_ids: applicableTicketTypeIds,
        per_order_limit: dc.per_order_limit || 1,
      },
    });
  } catch (error) {
    console.error('validateDiscount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});