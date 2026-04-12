import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.14.0';

const RESERVATION_TTL_MINS = 15;

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

function generateOrderNumber() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TD-${d}-${Math.floor(1000 + Math.random() * 9000)}`;
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
    const body = await req.json();
    const { buyer, attendees, event_id, origin_url, send_all_to_buyer, discount_code, time_slot_id } = body;

    // 1. LOAD EVENT
    const events = await withRetry(() => base44.asServiceRole.entities.Event.filter({ id: event_id }), 'load event');
    if (!events.length) return Response.json({ error: "Event not found" }, { status: 404 });
    const event = events[0];

    // 2. ACCESS RULES
    const accessError = enforceEventAccess(event, body.access_password);
    if (accessError) return Response.json({ error: accessError }, { status: 403 });

    // 3. LOAD TICKET TYPES
    const allTT = await withRetry(() => base44.asServiceRole.entities.TicketType.filter({ event_id: event.id }), 'load tt');
    const ttMap = Object.fromEntries(allTT.map(tt => [tt.id, tt]));

    // 4. VALIDATE ATTENDEES
    const valErr = validateAttendees(attendees, ttMap);
    if (valErr) return Response.json({ error: valErr }, { status: 400 });

    // 5. DUPLICATE CHECK — inside cart + against existing active tickets
    const dupErr = await checkDuplicates(base44, event.id, attendees, ttMap);
    if (dupErr) return Response.json({ error: dupErr }, { status: 409 });

    // 6. CAPACITY CHECK + RESERVE INVENTORY
    const capacityErr = checkCapacity(attendees, ttMap);
    if (capacityErr) return Response.json({ error: capacityErr }, { status: 400 });

    // 6b. TIMED ENTRY SLOT CAPACITY CHECK
    let slotInfo = null;
    if (event.scheduling_mode === 'timed_entry' && time_slot_id) {
      const slotMatches = await withRetry(
        () => base44.asServiceRole.entities.TimeSlot.filter({ id: time_slot_id }),
        'load slot'
      );
      if (!slotMatches.length) return Response.json({ error: 'Time slot not found' }, { status: 404 });
      const slot = slotMatches[0];
      if (!slot.is_active) return Response.json({ error: 'This time slot is no longer available' }, { status: 400 });
      if (slot.event_id !== event.id) return Response.json({ error: 'Time slot does not belong to this event' }, { status: 400 });
      const remaining = slot.capacity - (slot.booked || 0);
      if (attendees.length > remaining) {
        return Response.json({ error: `Only ${remaining} spot${remaining === 1 ? '' : 's'} remaining in this time slot` }, { status: 400 });
      }
      slotInfo = slot;
    }

    // 7. CREATE CHECKOUT DRAFT
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINS * 60 * 1000).toISOString();
    const draft = await withRetry(() => base44.asServiceRole.entities.CheckoutDraft.create({
      workspace_id: event.workspace_id,
      event_id: event.id,
      buyer_email: buyer.email.toLowerCase(),
      buyer_first_name: buyer.first_name,
      buyer_last_name: buyer.last_name,
      buyer_phone: buyer.phone || '',
      send_all_to_buyer: !!send_all_to_buyer,
      status: 'draft',
      expires_at: expiresAt,
    }), 'create draft');

    // 8. CREATE ORDER ITEMS (draft status)
    const orderItems = [];
    for (const att of attendees) {
      const tt = ttMap[att.ticket_type_id];
      const item = await withRetry(() => base44.asServiceRole.entities.OrderItem.create({
        checkout_draft_id: draft.id,
        event_id: event.id,
        ticket_type_id: att.ticket_type_id,
        time_slot_id: time_slot_id || '',
        attendance_mode: tt.attendance_mode,
        attendee_first_name: att.first_name,
        attendee_last_name: att.last_name,
        attendee_email: (att.email || buyer.email).toLowerCase(),
        unit_price: tt.price || 0,
        custom_field_values_json: att.custom_field_values_json || '',
        item_status: 'draft',
      }), `create item ${att.email}`);
      orderItems.push(item);
    }

    // 9. CREATE INVENTORY RESERVATIONS for in_person ticket types
    const inPersonCounts = {};
    for (const att of attendees) {
      const tt = ttMap[att.ticket_type_id];
      if (tt.attendance_mode === 'in_person' && tt.capacity_limit != null) {
        inPersonCounts[tt.id] = (inPersonCounts[tt.id] || 0) + 1;
      }
    }
    for (const [ttId, qty] of Object.entries(inPersonCounts)) {
      await withRetry(() => base44.asServiceRole.entities.InventoryReservation.create({
        workspace_id: event.workspace_id,
        event_id: event.id,
        ticket_type_id: ttId,
        checkout_draft_id: draft.id,
        reserved_quantity: qty,
        expires_at: expiresAt,
        status: 'active',
      }), `reserve ${ttId}`);
      // Increment quantity_reserved on ticket type
      const tt = ttMap[ttId];
      await withRetry(() => base44.asServiceRole.entities.TicketType.update(ttId, {
        quantity_reserved: (tt.quantity_reserved || 0) + qty
      }), `incr reserved ${ttId}`);
    }

    // 10. CALCULATE TOTAL (with optional discount)
    let subtotalAmount = 0;
    for (const att of attendees) {
      subtotalAmount += ttMap[att.ticket_type_id].price || 0;
    }

    let discountAmount = 0;
    let discountCodeId = null;
    if (discount_code) {
      const dcMatches = await withRetry(
        () => base44.asServiceRole.entities.DiscountCode.filter({ workspace_id: event.workspace_id, code: discount_code.toUpperCase().trim(), is_active: true }),
        'load discount'
      );
      if (dcMatches.length) {
        const dc = dcMatches[0];
        const now = new Date().toISOString();
        const dateValid = (!dc.valid_from || now >= dc.valid_from) && (!dc.valid_until || now <= dc.valid_until);
        const usageValid = dc.usage_limit == null || (dc.times_used || 0) < dc.usage_limit;
        let eventValid = true;
        if (dc.applicable_event_ids_json) {
          try { const ids = JSON.parse(dc.applicable_event_ids_json); if (ids.length && !ids.includes(event_id)) eventValid = false; } catch (_) {}
        }
        if (dateValid && usageValid && eventValid) {
          // Determine discountable amount
          let applicableTTIds = null;
          if (dc.applicable_ticket_type_ids_json) {
            try { applicableTTIds = JSON.parse(dc.applicable_ticket_type_ids_json); if (!applicableTTIds.length) applicableTTIds = null; } catch (_) {}
          }
          let discountableAmount = subtotalAmount;
          if (applicableTTIds) {
            discountableAmount = 0;
            for (const att of attendees) {
              if (applicableTTIds.includes(att.ticket_type_id)) discountableAmount += ttMap[att.ticket_type_id].price || 0;
            }
          }
          if (dc.discount_type === 'percentage') {
            discountAmount = discountableAmount * (dc.discount_value / 100);
          } else {
            discountAmount = Math.min(dc.discount_value, discountableAmount);
          }
          discountAmount = Math.round(discountAmount * 100) / 100;
          discountCodeId = dc.id;
          // Increment usage
          await withRetry(() => base44.asServiceRole.entities.DiscountCode.update(dc.id, { times_used: (dc.times_used || 0) + 1 }), 'incr discount usage');
        }
      }
    }

    let totalAmount = Math.max(0, subtotalAmount - discountAmount);
    const isFree = totalAmount === 0;
    const orderNumber = generateOrderNumber();

    if (isFree) {
      // ── FREE ORDER FLOW ──
      return await completeFreeOrder(base44, {
        draft, event, orderItems, ttMap, buyer, totalAmount, orderNumber,
        send_all_to_buyer: !!send_all_to_buyer, inPersonCounts, origin_url,
        slotInfo, time_slot_id,
      });
    } else {
      // ── PAID ORDER FLOW ──
      return await initiatePaidOrder(base44, {
        draft, event, orderItems, ttMap, buyer, attendees, totalAmount, orderNumber,
        send_all_to_buyer: !!send_all_to_buyer, origin_url,
        discountAmount, discountCode: discount_code,
        slotInfo, time_slot_id,
      });
    }

  } catch (error) {
    console.error("createCheckout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Access enforcement ──

function enforceEventAccess(event, password) {
  if (event.status !== 'published') return "Event is not available for booking";
  const now = new Date().toISOString();
  if (event.sales_open_at && now < event.sales_open_at) return "Sales have not opened yet";
  if (event.sales_close_at && now > event.sales_close_at) return "Sales have closed";
  if (event.visibility_mode === 'private_invite_only') return "This event is invite-only";
  if (event.visibility_mode === 'password_protected') {
    if (!password || password !== event.access_password) return "Incorrect event password";
  }
  return null;
}

// ── Validation ──

function validateAttendees(attendees, ttMap) {
  if (!attendees?.length) return "At least one attendee is required";
  for (const att of attendees) {
    if (!att.first_name || !att.last_name || !att.email || !att.ticket_type_id) {
      return "All attendee fields are required";
    }
    if (!ttMap[att.ticket_type_id]) return `Invalid ticket type: ${att.ticket_type_id}`;
    const tt = ttMap[att.ticket_type_id];
    if (!tt.is_active) return `Ticket type "${tt.name}" is not available`;
  }
  return null;
}

function checkCapacity(attendees, ttMap) {
  const counts = {};
  for (const att of attendees) {
    const tt = ttMap[att.ticket_type_id];
    if (tt.capacity_limit != null) {
      counts[tt.id] = (counts[tt.id] || 0) + 1;
    }
  }
  for (const [ttId, count] of Object.entries(counts)) {
    const tt = ttMap[ttId];
    const available = tt.capacity_limit - (tt.quantity_sold || 0) - (tt.quantity_reserved || 0);
    if (count > available) {
      return `Not enough capacity for "${tt.name}". Only ${Math.max(0, available)} spots remaining.`;
    }
  }
  return null;
}

// ── Duplicate detection ──

async function checkDuplicates(base44, eventId, attendees, ttMap) {
  // 1. Intra-cart duplicates: same email + same attendance_mode
  const seen = new Set();
  for (const att of attendees) {
    const tt = ttMap[att.ticket_type_id];
    const key = `${att.email.toLowerCase()}::${tt.attendance_mode}`;
    if (seen.has(key)) {
      return `Duplicate attendee: ${att.email} already has a ${tt.attendance_mode} ticket in this order`;
    }
    seen.add(key);
  }

  // 2. Cross-order duplicates against existing active tickets
  const existingTickets = await withRetry(
    () => base44.asServiceRole.entities.Ticket.filter({ event_id: eventId, ticket_status: 'active' }),
    'load existing tickets'
  );
  const existingKeys = new Set(existingTickets.map(t =>
    `${t.attendee_email.toLowerCase()}::${t.attendance_mode}`
  ));

  for (const att of attendees) {
    const tt = ttMap[att.ticket_type_id];
    const key = `${att.email.toLowerCase()}::${tt.attendance_mode}`;
    if (existingKeys.has(key)) {
      return `${att.email} already has an active ${tt.attendance_mode} ticket for this event`;
    }
  }
  return null;
}

// ── Free order completion ──

async function completeFreeOrder(base44, ctx) {
  const { draft, event, orderItems, ttMap, buyer, totalAmount, orderNumber,
          send_all_to_buyer, inPersonCounts, slotInfo, time_slot_id } = ctx;

  // Create confirmed order
  const order = await withRetry(() => base44.asServiceRole.entities.Order.create({
    workspace_id: event.workspace_id,
    event_id: event.id,
    order_number: orderNumber,
    buyer_first_name: buyer.first_name,
    buyer_last_name: buyer.last_name,
    buyer_email: buyer.email.toLowerCase(),
    buyer_phone: buyer.phone || '',
    total_amount: totalAmount,
    currency: 'AUD',
    payment_status: 'free',
    order_status: 'confirmed',
    order_source: 'online',
    payment_method: 'stripe',
    checkout_draft_id: draft.id,
  }), 'create order');

  // Confirm order items + create tickets
  const tickets = [];
  for (const item of orderItems) {
    // Update item to confirmed with order_id
    await withRetry(() => base44.asServiceRole.entities.OrderItem.update(item.id, {
      order_id: order.id,
      item_status: 'confirmed',
    }), `confirm item ${item.id}`);

    // Create ticket
    const ticket = await withRetry(() => base44.asServiceRole.entities.Ticket.create({
      order_id: order.id,
      order_item_id: item.id,
      event_id: event.id,
      ticket_type_id: item.ticket_type_id,
      time_slot_id: time_slot_id || '',
      attendance_mode: item.attendance_mode,
      attendee_first_name: item.attendee_first_name,
      attendee_last_name: item.attendee_last_name,
      attendee_email: item.attendee_email,
      qr_code_hash: 'pending',
      ticket_status: 'active',
    }), `create ticket ${item.attendee_email}`);

    // Generate QR hash
    const qrHash = await generateQrHash(ticket.id, event.id);
    await withRetry(() => base44.asServiceRole.entities.Ticket.update(ticket.id, { qr_code_hash: qrHash }), `qr ${ticket.id}`);
    ticket.qr_code_hash = qrHash;
    tickets.push(ticket);
  }

  // Update quantity_sold and release reservations
  const soldCounts = {};
  for (const item of orderItems) {
    soldCounts[item.ticket_type_id] = (soldCounts[item.ticket_type_id] || 0) + 1;
  }
  for (const [ttId, count] of Object.entries(soldCounts)) {
    const tt = ttMap[ttId];
    const reserved = inPersonCounts[ttId] || 0;
    await withRetry(() => base44.asServiceRole.entities.TicketType.update(ttId, {
      quantity_sold: (tt.quantity_sold || 0) + count,
      quantity_reserved: Math.max(0, (tt.quantity_reserved || 0) - reserved),
    }), `update sold ${ttId}`);
  }

  // Update time slot booked count
  if (slotInfo && time_slot_id) {
    await withRetry(() => base44.asServiceRole.entities.TimeSlot.update(time_slot_id, {
      booked: (slotInfo.booked || 0) + orderItems.length,
    }), 'update slot booked');
  }

  // Convert reservations
  const reservations = await base44.asServiceRole.entities.InventoryReservation.filter({ checkout_draft_id: draft.id });
  for (const res of reservations) {
    await withRetry(() => base44.asServiceRole.entities.InventoryReservation.update(res.id, { status: 'converted' }), `convert res ${res.id}`);
  }

  // Mark draft completed
  await withRetry(() => base44.asServiceRole.entities.CheckoutDraft.update(draft.id, { status: 'completed' }), 'complete draft');

  // Generate manage token
  const manageToken = await generateManageToken(order.id);

  // Send emails (non-blocking)
  sendOrderEmails(base44, order, event, tickets, ttMap, send_all_to_buyer).catch(e => console.error('Email error:', e.message));

  return Response.json({
    order_number: orderNumber,
    manage_token: manageToken,
    payment_required: false,
  });
}

// ── Paid order initiation ──

async function initiatePaidOrder(base44, ctx) {
  const { draft, event, orderItems, ttMap, buyer, attendees, totalAmount, orderNumber,
          send_all_to_buyer, origin_url, discountAmount = 0, discountCode = '',
          slotInfo, time_slot_id } = ctx;

  // Create pending order (no tickets yet)
  const order = await withRetry(() => base44.asServiceRole.entities.Order.create({
    workspace_id: event.workspace_id,
    event_id: event.id,
    order_number: orderNumber,
    buyer_first_name: buyer.first_name,
    buyer_last_name: buyer.last_name,
    buyer_email: buyer.email.toLowerCase(),
    buyer_phone: buyer.phone || '',
    total_amount: totalAmount,
    currency: 'AUD',
    payment_status: 'pending',
    order_status: 'confirmed',
    order_source: 'online',
    payment_method: 'stripe',
    checkout_draft_id: draft.id,
  }), 'create order');

  // Update order items with order_id, status to reserved
  for (const item of orderItems) {
    await withRetry(() => base44.asServiceRole.entities.OrderItem.update(item.id, {
      order_id: order.id,
      item_status: 'reserved',
    }), `reserve item ${item.id}`);
  }

  // Load workspace Stripe credentials
  const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter({
    workspace_id: event.workspace_id,
    provider: 'stripe',
    status: 'active',
  });

  let stripeKey = null;
  if (integrations.length && integrations[0].credentials_json_encrypted) {
    try {
      const creds = JSON.parse(integrations[0].credentials_json_encrypted);
      stripeKey = creds.secret_key;
    } catch (e) { /* fall through */ }
  }

  // Fallback to workspace settings if integration entity not configured
  if (!stripeKey) {
    const settings = await base44.asServiceRole.entities.WorkspaceSetting.filter({
      workspace_id: event.workspace_id,
      key: 'stripe_secret_key',
    });
    if (settings.length) {
      try { stripeKey = JSON.parse(settings[0].value_json); } catch (e) { stripeKey = settings[0].value_json; }
    }
  }

  if (!stripeKey) {
    return Response.json({ error: "Payment processing is not configured for this workspace" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);

  // Build line items
  const typeQty = {};
  for (const att of attendees) {
    const tt = ttMap[att.ticket_type_id];
    if (tt.price > 0) {
      typeQty[tt.id] = (typeQty[tt.id] || 0) + 1;
    }
  }

  const lineItems = Object.entries(typeQty).map(([ttId, count]) => {
    const tt = ttMap[ttId];
    return {
      price_data: {
        currency: (tt.currency || 'AUD').toLowerCase(),
        product_data: { name: `${tt.name} (${tt.attendance_mode === 'online' ? 'Online' : 'In-Person'})` },
        unit_amount: Math.round(tt.price * 100),
      },
      quantity: count,
    };
  });

  // Add discount as coupon if applicable
  let discounts = [];
  if (discountAmount > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(discountAmount * 100),
      currency: 'aud',
      duration: 'once',
      name: discountCode || 'Discount',
    });
    discounts = [{ coupon: coupon.id }];
  }

  const baseUrl = origin_url || 'https://ticket-deck.com';
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    ...(discounts.length ? { discounts } : {}),
    mode: 'payment',
    success_url: `${baseUrl}/order/${orderNumber}?payment=success`,
    cancel_url: `${baseUrl}/event/${event.slug}?payment=cancelled`,
    customer_email: buyer.email,
    expires_at: Math.floor(Date.now() / 1000) + RESERVATION_TTL_MINS * 60,
    metadata: {
      order_id: order.id,
      order_number: orderNumber,
      checkout_draft_id: draft.id,
      workspace_id: event.workspace_id,
    },
  });

  // Store stripe IDs
  await withRetry(() => base44.asServiceRole.entities.Order.update(order.id, {
    stripe_checkout_session_id: session.id,
  }), 'update stripe session');

  // Mark draft submitted
  await withRetry(() => base44.asServiceRole.entities.CheckoutDraft.update(draft.id, { status: 'submitted' }), 'submit draft');

  return Response.json({
    checkout_url: session.url,
    order_number: orderNumber,
    payment_required: true,
  });
}

// ── Email sending (delegates to workspace email system) ──

async function sendOrderEmails(base44, order, event, tickets, ttMap, sendAllToBuyer) {
  try {
    await base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
      action: 'send_order_emails', order_id: order.id, send_all_to_buyer: sendAllToBuyer,
    });
  } catch (e) {
    console.error('Workspace email failed, using inline fallback:', e.message);
    // Inline fallback
    const buyerName = `${order.buyer_first_name} ${order.buyer_last_name}`;
    const receiptHtml = buildOrderReceiptHtml(order, event, tickets, ttMap, buyerName);
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: order.buyer_email,
      subject: `Booking Confirmed — ${event.name} | Order #${order.order_number}`,
      body: receiptHtml,
      from_name: 'Ticket Deck',
    });
  }

  // Dispatch webhook
  await base44.asServiceRole.functions.invoke('webhookDispatch', {
    action: 'dispatch', workspace_id: order.workspace_id,
    event_type: 'order.created', payload: { order_id: order.id, order_number: order.order_number, total: order.total_amount },
  }).catch(() => {});
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function buildOrderReceiptHtml(order, event, tickets, ttMap, buyerName) {
  const rows = tickets.map(t => {
    const tt = ttMap[t.ticket_type_id];
    const price = tt?.price > 0 ? `$${tt.price.toFixed(2)}` : 'Free';
    return `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${t.attendee_first_name} ${t.attendee_last_name}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${tt?.name||'Ticket'}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${price}</td></tr>`;
  }).join('');
  const total = order.total_amount > 0 ? `$${order.total_amount.toFixed(2)} AUD` : 'Free';
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto"><div style="background:#0f172a;padding:24px;text-align:center;color:white"><h1 style="margin:0;font-size:20px">Booking Confirmed ✓</h1><p style="margin:4px 0 0;opacity:0.7;font-size:14px">Order #${order.order_number}</p></div><div style="padding:24px"><p>Hi <strong>${buyerName}</strong>,</p><p>Your booking for <strong>${event.name}</strong> is confirmed.</p><p><strong>Date:</strong> ${fmtDate(event.event_date)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p><table width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;margin:16px 0"><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left;font-size:12px">Attendee</th><th style="padding:8px;text-align:left;font-size:12px">Type</th><th style="padding:8px;text-align:right;font-size:12px">Price</th></tr>${rows}<tr style="background:#f8fafc"><td colspan="2" style="padding:8px;font-weight:bold">Total</td><td style="padding:8px;text-align:right;font-weight:bold">${total}</td></tr></table></div></div>`;
}

function buildCombinedTicketsHtml(order, event, tickets, ttMap, buyerName) {
  const ticketBlocks = tickets.map((t, i) => {
    const tt = ttMap[t.ticket_type_id];
    const isOnline = t.attendance_mode === 'online';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(t.qr_code_hash)}`;
    const qrBlock = !isOnline ? `<div style="text-align:center;margin:8px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px"><img src="${qrUrl}" width="180" height="180" style="display:block;margin:auto"/></div>` : '';
    return `<div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:8px 0"><strong>Ticket ${i+1}: ${t.attendee_first_name} ${t.attendee_last_name}</strong><br><span style="font-size:13px;color:#64748b">${tt?.name||'General'} · ${isOnline?'Online':'In-Person'}</span>${qrBlock}</div>`;
  }).join('');
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto"><div style="background:#0f172a;padding:24px;text-align:center;color:white"><h1 style="margin:0;font-size:20px">All Your Tickets</h1><p style="margin:4px 0 0;opacity:0.7;font-size:14px">${event.name}</p></div><div style="padding:24px"><p>Hi <strong>${buyerName}</strong>,</p><p>Here are all ${tickets.length} ticket${tickets.length>1?'s':''} for <strong>${event.name}</strong>.</p><p><strong>Date:</strong> ${fmtDate(event.event_date)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p>${ticketBlocks}</div></div>`;
}