import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.14.0';

// ── Helpers ──

async function withRetry(fn, label = 'op', maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      const s = err?.statusCode || err?.status || 0;
      const retryable = s === 429 || s >= 500 || err?.code === 'ETIMEDOUT';
      if (!retryable || attempt === maxRetries) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000) + Math.random() * 500;
      console.warn(`${label} attempt ${attempt} failed, retry in ${Math.round(delay)}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function generateQrHash(ticketId, eventId) {
  const salt = Deno.env.get("QR_SECRET_SALT");
  const data = new TextEncoder().encode(ticketId + eventId + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
}

async function generateManageToken(orderId) {
  const secret = Deno.env.get("QR_SECRET_SALT");
  const data = new TextEncoder().encode(orderId + ':manage:' + secret);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
}

// ── Main handler ──

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    // Parse event — we need metadata first to find workspace Stripe credentials
    let rawEvent;
    try { rawEvent = JSON.parse(rawBody); } catch (e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const session = rawEvent.data?.object;
    const workspaceId = session?.metadata?.workspace_id;

    // Load workspace Stripe webhook secret for signature verification
    let webhookSecret = null;
    if (workspaceId) {
      const settings = await base44.asServiceRole.entities.WorkspaceSetting.filter({
        workspace_id: workspaceId,
        key: 'stripe_webhook_secret',
      });
      if (settings.length) {
        try { webhookSecret = JSON.parse(settings[0].value_json); } catch (e) { webhookSecret = settings[0].value_json; }
      }
    }

    // Load workspace Stripe secret key
    let stripeKey = null;
    if (workspaceId) {
      const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter({
        workspace_id: workspaceId,
        provider: 'stripe',
        status: 'active',
      });
      if (integrations.length && integrations[0].credentials_json_encrypted) {
        try {
          const creds = JSON.parse(integrations[0].credentials_json_encrypted);
          stripeKey = creds.secret_key;
        } catch (e) { /* fall through */ }
      }
      if (!stripeKey) {
        const settings = await base44.asServiceRole.entities.WorkspaceSetting.filter({
          workspace_id: workspaceId,
          key: 'stripe_secret_key',
        });
        if (settings.length) {
          try { stripeKey = JSON.parse(settings[0].value_json); } catch (e) { stripeKey = settings[0].value_json; }
        }
      }
    }

    // Verify signature if we have a webhook secret
    let event = rawEvent;
    if (webhookSecret && signature && stripeKey) {
      const stripe = new Stripe(stripeKey);
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    }

    console.log("Stripe webhook event:", event.type, "workspace:", workspaceId);

    // ── checkout.session.completed ──
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(base44, event.data.object);
    }

    // ── checkout.session.expired or payment failure ──
    if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      await handlePaymentFailed(base44, event.data.object);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});

// ── checkout.session.completed handler (idempotent) ──

async function handleCheckoutCompleted(base44, session) {
  const orderId = session.metadata?.order_id;
  const orderNumber = session.metadata?.order_number;
  const draftId = session.metadata?.checkout_draft_id;

  if (!orderId) {
    console.error("No order_id in session metadata");
    return;
  }

  // Load order
  const orders = await withRetry(() => base44.asServiceRole.entities.Order.filter({ id: orderId }), 'load order');
  if (!orders.length) {
    console.error("Order not found:", orderId);
    return;
  }
  const order = orders[0];

  // IDEMPOTENCY: if already completed, do nothing
  if (order.payment_status === 'completed') {
    console.log("Order already completed (idempotent skip):", orderNumber);
    return;
  }

  // Mark payment completed
  await withRetry(() => base44.asServiceRole.entities.Order.update(order.id, {
    payment_status: 'completed',
    stripe_payment_intent_id: session.payment_intent || '',
  }), 'update payment status');

  // Load event and ticket types
  const events = await withRetry(() => base44.asServiceRole.entities.Event.filter({ id: order.event_id }), 'load event');
  const event = events[0];

  const ticketTypes = await withRetry(() => base44.asServiceRole.entities.TicketType.filter({ event_id: order.event_id }), 'load tt');
  const ttMap = Object.fromEntries(ticketTypes.map(tt => [tt.id, tt]));

  // Load draft order items
  const allItems = await withRetry(() => base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id }), 'load items');
  const items = allItems.filter(i => i.item_status === 'reserved' || i.item_status === 'draft');

  // Confirm items and create tickets
  const tickets = [];
  const soldCounts = {};

  for (const item of items) {
    // Confirm item
    await withRetry(() => base44.asServiceRole.entities.OrderItem.update(item.id, { item_status: 'confirmed' }), `confirm item ${item.id}`);

    // Create ticket
    const ticket = await withRetry(() => base44.asServiceRole.entities.Ticket.create({
      order_id: order.id,
      order_item_id: item.id,
      event_id: order.event_id,
      ticket_type_id: item.ticket_type_id,
      attendance_mode: item.attendance_mode,
      attendee_first_name: item.attendee_first_name,
      attendee_last_name: item.attendee_last_name,
      attendee_email: item.attendee_email,
      qr_code_hash: 'pending',
      ticket_status: 'active',
    }), `create ticket ${item.attendee_email}`);

    // Generate QR hash
    const qrHash = await generateQrHash(ticket.id, order.event_id);
    await withRetry(() => base44.asServiceRole.entities.Ticket.update(ticket.id, { qr_code_hash: qrHash }), `qr ${ticket.id}`);
    ticket.qr_code_hash = qrHash;
    tickets.push(ticket);

    soldCounts[item.ticket_type_id] = (soldCounts[item.ticket_type_id] || 0) + 1;
  }

  // Update quantity_sold, release quantity_reserved
  const reservations = draftId
    ? await base44.asServiceRole.entities.InventoryReservation.filter({ checkout_draft_id: draftId })
    : [];
  const reservedByType = {};
  for (const res of reservations) {
    reservedByType[res.ticket_type_id] = (reservedByType[res.ticket_type_id] || 0) + res.reserved_quantity;
    await withRetry(() => base44.asServiceRole.entities.InventoryReservation.update(res.id, { status: 'converted' }), `convert res ${res.id}`);
  }

  for (const [ttId, count] of Object.entries(soldCounts)) {
    const tt = ttMap[ttId];
    if (tt) {
      const reservedRelease = reservedByType[ttId] || 0;
      await withRetry(() => base44.asServiceRole.entities.TicketType.update(ttId, {
        quantity_sold: (tt.quantity_sold || 0) + count,
        quantity_reserved: Math.max(0, (tt.quantity_reserved || 0) - reservedRelease),
      }), `update sold ${ttId}`);
    }
  }

  // Mark draft completed
  if (draftId) {
    await withRetry(() => base44.asServiceRole.entities.CheckoutDraft.update(draftId, { status: 'completed' }), 'complete draft');
  }

  // Send emails
  if (event) {
    sendOrderEmails(base44, order, event, tickets, ttMap, order.send_all_to_buyer).catch(e => console.error('Email error:', e.message));
  }

  // Audit log
  await base44.asServiceRole.entities.AuditLog.create({
    workspace_id: order.workspace_id,
    actor_type: 'webhook',
    action_type: 'create',
    entity_type: 'Order',
    entity_id: order.id,
    metadata_json: JSON.stringify({ order_number: orderNumber, tickets_created: tickets.length }),
  }).catch(e => console.warn('Audit log failed:', e.message));

  console.log("Order completed successfully:", orderNumber, "tickets:", tickets.length);
}

// ── Payment failure / session expiry handler ──

async function handlePaymentFailed(base44, session) {
  const orderId = session.metadata?.order_id;
  const draftId = session.metadata?.checkout_draft_id;

  if (!orderId) return;

  const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
  if (!orders.length || orders[0].payment_status !== 'pending') return;
  const order = orders[0];

  // Mark order failed
  await withRetry(() => base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'failed' }), 'fail order');

  // Cancel order items
  const items = await base44.asServiceRole.entities.OrderItem.filter({ order_id: orderId });
  for (const item of items) {
    await withRetry(() => base44.asServiceRole.entities.OrderItem.update(item.id, { item_status: 'cancelled' }), `cancel item ${item.id}`);
  }

  // Release reservations
  if (draftId) {
    const reservations = await base44.asServiceRole.entities.InventoryReservation.filter({ checkout_draft_id: draftId });
    for (const res of reservations) {
      if (res.status === 'active') {
        await withRetry(() => base44.asServiceRole.entities.InventoryReservation.update(res.id, { status: 'released' }), `release res ${res.id}`);
        // Decrement quantity_reserved
        const tts = await base44.asServiceRole.entities.TicketType.filter({ id: res.ticket_type_id });
        if (tts.length) {
          await withRetry(() => base44.asServiceRole.entities.TicketType.update(tts[0].id, {
            quantity_reserved: Math.max(0, (tts[0].quantity_reserved || 0) - res.reserved_quantity),
          }), `release reserved ${tts[0].id}`);
        }
      }
    }
    // Mark draft expired
    await withRetry(() => base44.asServiceRole.entities.CheckoutDraft.update(draftId, { status: 'expired' }), 'expire draft');
  }

  console.log("Order payment failed, resources released:", orderId);
}

// ── Email sending (shared with createCheckout) ──

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

async function sendOrderEmails(base44, order, event, tickets, ttMap, sendAllToBuyer) {
  const buyerName = `${order.buyer_first_name} ${order.buyer_last_name}`;

  // Order receipt
  const total = order.total_amount > 0 ? `$${order.total_amount.toFixed(2)} AUD` : 'Free';
  const rows = tickets.map(t => {
    const tt = ttMap[t.ticket_type_id];
    const price = tt?.price > 0 ? `$${tt.price.toFixed(2)}` : 'Free';
    return `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${t.attendee_first_name} ${t.attendee_last_name}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${tt?.name||'Ticket'}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${price}</td></tr>`;
  }).join('');
  const receiptHtml = `<div style="font-family:sans-serif;max-width:600px;margin:auto"><div style="background:#0f172a;padding:24px;text-align:center;color:white"><h1 style="margin:0;font-size:20px">Booking Confirmed ✓</h1><p style="margin:4px 0 0;opacity:0.7;font-size:14px">Order #${order.order_number}</p></div><div style="padding:24px"><p>Hi <strong>${buyerName}</strong>,</p><p>Your booking for <strong>${event.name}</strong> is confirmed.</p><p><strong>Date:</strong> ${fmtDate(event.event_date)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p><table width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;margin:16px 0"><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left;font-size:12px">Attendee</th><th style="padding:8px;text-align:left;font-size:12px">Type</th><th style="padding:8px;text-align:right;font-size:12px">Price</th></tr>${rows}<tr style="background:#f8fafc"><td colspan="2" style="padding:8px;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-weight:bold">${total}</td></tr></table></div></div>`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: order.buyer_email, subject: `Booking Confirmed — ${event.name} | Order #${order.order_number}`,
    body: receiptHtml, from_name: 'Session Pass',
  });

  // Ticket emails
  for (const ticket of tickets) {
    const tt = ttMap[ticket.ticket_type_id];
    const isOnline = ticket.attendance_mode === 'online';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qr_code_hash)}`;
    const qrBlock = !isOnline ? `<div style="text-align:center;margin:16px 0;padding:16px;border:2px solid #e2e8f0;border-radius:12px"><img src="${qrUrl}" width="240" height="240" style="display:block;margin:auto"/><p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Scan at door for entry</p></div>` : '';
    const recipient = sendAllToBuyer ? order.buyer_email : ticket.attendee_email;
    const ticketHtml = `<div style="font-family:sans-serif;max-width:600px;margin:auto"><div style="background:#0f172a;padding:24px;text-align:center;color:white"><h1 style="margin:0;font-size:20px">Your Ticket</h1><p style="margin:4px 0 0;opacity:0.7;font-size:14px">${event.name}</p></div><div style="padding:24px"><p>Hi <strong>${ticket.attendee_first_name}</strong>,</p><p><strong>Type:</strong> ${tt?.name||'General'} (${isOnline?'Online':'In-Person'})<br><strong>Date:</strong> ${fmtDate(event.event_date)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p>${qrBlock}</div></div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient, subject: `Your ${isOnline ? 'Online' : 'In-Person'} Ticket — ${event.name}`,
      body: ticketHtml, from_name: 'Session Pass',
    });
  }
}