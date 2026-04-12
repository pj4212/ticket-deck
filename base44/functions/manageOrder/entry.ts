import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Buyer-facing order management endpoint
// Supports token-based access (no login required) and authenticated access

async function generateManageToken(orderId) {
  const secret = Deno.env.get("QR_SECRET_SALT");
  const data = new TextEncoder().encode(orderId + ':manage:' + secret);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, order_number, manage_token } = body;

    // ── LOOKUP ORDER ──
    if (action === 'lookup') {
      if (!order_number) {
        return Response.json({ error: 'Order number is required' }, { status: 400 });
      }

      const orders = await base44.asServiceRole.entities.Order.filter({ order_number });
      if (!orders.length) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }
      const order = orders[0];

      // Verify access: either valid manage_token or authenticated buyer
      const expectedToken = await generateManageToken(order.id);
      let authorized = false;

      if (manage_token === expectedToken) {
        authorized = true;
      } else {
        try {
          const user = await base44.auth.me();
          if (user && user.email?.toLowerCase() === order.buyer_email?.toLowerCase()) {
            authorized = true;
          }
        } catch (e) { /* not authenticated, that's ok */ }
      }

      if (!authorized) {
        return Response.json({ error: 'Invalid or missing access token' }, { status: 403 });
      }

      // Load related data
      const [events, tickets, orderItems] = await Promise.all([
        base44.asServiceRole.entities.Event.filter({ id: order.event_id }),
        base44.asServiceRole.entities.Ticket.filter({ order_id: order.id }),
        base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id }),
      ]);

      const event = events[0] || null;
      let ticketTypes = [];
      if (event) {
        ticketTypes = await base44.asServiceRole.entities.TicketType.filter({ event_id: event.id });
      }
      const ttMap = Object.fromEntries(ticketTypes.map(tt => [tt.id, tt]));

      // Build response
      const ticketData = tickets
        .filter(t => t.ticket_status === 'active')
        .map(t => ({
          id: t.id,
          attendee_first_name: t.attendee_first_name,
          attendee_last_name: t.attendee_last_name,
          attendee_email: t.attendee_email,
          attendance_mode: t.attendance_mode,
          ticket_type_name: ttMap[t.ticket_type_id]?.name || 'Ticket',
          qr_code_hash: t.qr_code_hash,
          qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(t.qr_code_hash)}`,
          check_in_status: t.check_in_status,
          zoom_join_url: t.zoom_join_url || '',
        }));

      return Response.json({
        order: {
          order_number: order.order_number,
          buyer_first_name: order.buyer_first_name,
          buyer_last_name: order.buyer_last_name,
          buyer_email: order.buyer_email,
          total_amount: order.total_amount,
          currency: order.currency || 'AUD',
          payment_status: order.payment_status,
          order_status: order.order_status,
          created_at: order.created_date,
        },
        event: event ? {
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
        tickets: ticketData,
      });
    }

    // ── GENERATE MANAGE TOKEN ──
    // Internal use: called by createCheckout to generate a token for a new order
    if (action === 'generate_token') {
      const { order_id } = body;
      if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });
      const token = await generateManageToken(order_id);
      return Response.json({ manage_token: token });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("manageOrder error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});