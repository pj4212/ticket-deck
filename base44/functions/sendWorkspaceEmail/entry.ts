import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Workspace-branded transactional email system ──
// Resolves sender identity + brand from workspace & BrandTheme.
// All emails include manage-order links, venue/zoom details, support contact.
// Logs every send to EmailLog for audit/retry.

async function getWorkspaceBrand(base44, workspaceId) {
  const defaults = {
    senderName: 'Ticket Deck',
    headerBg: '#0f172a', accentColor: '#818cf8', buttonBg: '#6366f1',
    logoUrl: '', supportEmail: '', footerText: '',
    currency: 'USD', numberLocale: 'en-US', timezone: 'UTC', locale: 'en',
  };
  if (!workspaceId) return defaults;

  const [workspaces, themes] = await Promise.all([
    base44.asServiceRole.entities.Workspace.filter({ id: workspaceId }),
    base44.asServiceRole.entities.BrandTheme.filter({ workspace_id: workspaceId }),
  ]);
  const ws = workspaces[0];
  const theme = themes[0];

  return {
    senderName: ws?.sender_name || ws?.name || defaults.senderName,
    headerBg: theme?.primary_color || defaults.headerBg,
    accentColor: theme?.secondary_color || defaults.accentColor,
    buttonBg: theme?.primary_color || defaults.buttonBg,
    logoUrl: theme?.logo_url || ws?.logo_url || '',
    supportEmail: ws?.support_email || '',
    footerText: theme?.email_footer_text || '',
    currency: ws?.default_currency || defaults.currency,
    numberLocale: ws?.default_number_format || defaults.numberLocale,
    timezone: ws?.default_timezone || defaults.timezone,
    locale: ws?.default_language || defaults.locale,
  };
}

async function getManageOrderUrl(base44, orderId) {
  try {
    const res = await base44.asServiceRole.functions.invoke('manageOrder', { action: 'generate_token', order_id: orderId });
    const token = res.manage_token;
    // We return relative path — the caller will prepend the base URL
    return { path: `/manage/`, token };
  } catch (_) {
    return null;
  }
}

// ── Layout helpers ──

function buildHeader(brand, title, subtitle) {
  const logo = brand.logoUrl
    ? `<img src="${brand.logoUrl}" height="36" style="display:block;margin:0 auto 14px;" alt="" />`
    : `<p style="margin:0 0 14px;font-size:13px;color:${brand.accentColor};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">${brand.senderName}</p>`;
  return `<tr><td style="background:${brand.headerBg};padding:32px 40px;text-align:center;">${logo}<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${title}</h1>${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${subtitle}</p>` : ''}</td></tr>`;
}

function buildFooter(brand) {
  const support = brand.supportEmail
    ? `<p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Questions? <a href="mailto:${brand.supportEmail}" style="color:${brand.accentColor};">${brand.supportEmail}</a></p>`
    : '';
  const custom = brand.footerText
    ? `<p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">${brand.footerText}</p>`
    : '';
  return `<tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">Sent by ${brand.senderName}</p>${support}${custom}</td></tr>`;
}

function wrap(brand, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">${inner}</table></td></tr></table></body></html>`;
}

function fmtDate(d, tz, loc) {
  if (!d) return '';
  const dt = new Date(d.includes('T') ? d : d + 'T00:00:00Z');
  return dt.toLocaleDateString(loc || 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz || 'UTC' });
}
function fmtTime(d, tz, loc) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString(loc || 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz || 'UTC' });
}
function fmtCurrency(v, cur, loc) {
  try { return new Intl.NumberFormat(loc || 'en-US', { style: 'currency', currency: cur || 'USD' }).format(v || 0); }
  catch { return `${cur || 'USD'} ${(v || 0).toFixed(2)}`; }
}

function manageButton(brand, url, label) {
  if (!url) return '';
  return `<tr><td style="padding:16px 40px;text-align:center;"><a href="${url}" style="display:inline-block;background:${brand.buttonBg};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">${label || 'Manage Order →'}</a></td></tr>`;
}

function venueBlock(event, venue) {
  if (!venue && !event.venue_details) return '';
  const name = venue?.name || '';
  const addr = venue?.address || event.venue_details || '';
  let links = '';
  if (venue?.venue_link) links += `<a href="${venue.venue_link}" style="color:#6366f1;font-size:12px;text-decoration:none;">Get Directions</a> `;
  if (venue?.parking_link) links += `<a href="${venue.parking_link}" style="color:#6366f1;font-size:12px;text-decoration:none;">Parking Info</a>`;
  return `<tr><td style="padding:8px 40px;"><table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;"><tr><td><p style="margin:0;font-size:14px;font-weight:600;color:#166534;">📍 ${name || 'Venue'}</p>${addr ? `<p style="margin:4px 0 0;font-size:13px;color:#334155;">${addr}</p>` : ''}${links ? `<p style="margin:8px 0 0;">${links}</p>` : ''}</td></tr></table></td></tr>`;
}

function onlineBlock(event) {
  const link = event.zoom_link;
  if (!link && event.event_mode !== 'online_stream' && event.event_mode !== 'hybrid') return '';
  if (link) {
    return `<tr><td style="padding:8px 40px;"><table width="100%" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;"><tr><td><p style="margin:0;font-size:14px;font-weight:600;color:#1d4ed8;">🖥 Online Access</p><p style="margin:4px 0 0;font-size:13px;color:#334155;">Join link will be available from your ticket email.</p></td></tr></table></td></tr>`;
  }
  return `<tr><td style="padding:8px 40px;"><table width="100%" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;"><tr><td><p style="margin:0;font-size:13px;color:#1d4ed8;">Online joining details will be sent before the event.</p></td></tr></table></td></tr>`;
}

function eventInfoBlock(event, brand) {
  const tz = event.timezone || brand?.timezone || 'UTC';
  const loc = brand?.numberLocale || 'en-US';
  const mode = event.event_mode === 'online_stream' ? '🖥 Online' : event.event_mode === 'hybrid' ? '🌐 Hybrid' : '📍 In-Person';
  const tzLabel = tz.split('/').pop().replace(/_/g, ' ');
  return `<tr><td style="padding:12px 40px;"><table width="100%" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px;"><tr><td><p style="margin:0;font-size:13px;color:#94a3b8;">Date</p><p style="margin:2px 0 10px;font-size:14px;color:#334155;font-weight:600;">${fmtDate(event.event_date, tz, loc)}</p><p style="margin:0;font-size:13px;color:#94a3b8;">Time</p><p style="margin:2px 0 10px;font-size:14px;color:#334155;font-weight:600;">${fmtTime(event.start_datetime, tz, loc)} – ${fmtTime(event.end_datetime, tz, loc)} (${tzLabel})</p><p style="margin:0;font-size:13px;color:#94a3b8;">Format</p><p style="margin:2px 0 0;font-size:14px;color:#334155;font-weight:600;">${mode}</p></td></tr></table></td></tr>`;
}

// ── Template builders ──

function buildOrderReceipt(brand, order, event, tickets, ttMap, manageUrl, venue) {
  const cur = order.currency || brand.currency || 'USD';
  const loc = brand.numberLocale || 'en-US';
  const rows = tickets.map(t => {
    const tt = ttMap[t.ticket_type_id];
    const modeIcon = t.attendance_mode === 'online' ? '🖥' : '📍';
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${t.attendee_first_name} ${t.attendee_last_name}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${modeIcon} ${tt?.name || 'Ticket'}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;">${tt?.price > 0 ? fmtCurrency(tt.price, cur, loc) : 'Free'}</td></tr>`;
  }).join('');
  const total = order.total_amount > 0 ? fmtCurrency(order.total_amount, cur, loc) : 'Free';
  const taxRow = (order.tax_amount > 0 && order.tax_label) ? `<tr style="background:#f8fafc;"><td colspan="2" style="padding:8px 12px;font-size:12px;color:#64748b;">${order.tax_label} (${order.tax_rate_percent || 0}%)</td><td style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b;">${fmtCurrency(order.tax_amount, cur, loc)}</td></tr>` : '';

  return wrap(brand, `
    ${buildHeader(brand, 'Booking Confirmed ✓', `Order #${order.order_number}`)}
    <tr><td style="padding:28px 40px 12px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${order.buyer_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;">Your booking for <strong>${event.name}</strong> is confirmed.</p></td></tr>
    ${eventInfoBlock(event, brand)}
    ${(event.event_mode === 'in_person' || event.event_mode === 'hybrid') ? venueBlock(event, venue) : ''}
    ${(event.event_mode === 'online_stream' || event.event_mode === 'hybrid') ? onlineBlock(event) : ''}
    <tr><td style="padding:16px 40px;"><table width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;"><tr style="background:#f1f5f9;"><th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;">Attendee</th><th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;">Type</th><th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#94a3b8;">Price</th></tr>${rows}${taxRow}<tr style="background:#f8fafc;"><td colspan="2" style="padding:8px 12px;font-weight:700;font-size:13px;">Total</td><td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;">${total}</td></tr></table></td></tr>
    ${manageButton(brand, manageUrl, 'View Order & Tickets →')}
    ${buildFooter(brand)}
  `);
}

function buildTicketConfirmation(brand, ticket, event, ttName, manageUrl, venue) {
  const isOnline = ticket.attendance_mode === 'online';
  const qrUrl = !isOnline && ticket.qr_code_hash && ticket.qr_code_hash !== 'pending'
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qr_code_hash)}`
    : '';
  const qrBlock = qrUrl ? `<tr><td style="padding:8px 40px 20px;text-align:center;"><p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Check-In QR</p><img src="${qrUrl}" width="200" height="200" style="border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#fff;" /><p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Show this at the door for fast entry</p></td></tr>` : '';
  const modeLabel = isOnline ? '🖥 Online' : '📍 In-Person';
  const tz = event.timezone || brand?.timezone || 'UTC';
  const loc = brand?.numberLocale || 'en-US';

  let accessBlock = '';
  if (isOnline) {
    const joinUrl = ticket.zoom_join_url || event.zoom_link || '';
    if (joinUrl) {
      accessBlock = `<tr><td style="padding:8px 40px;"><table width="100%" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;"><tr><td style="text-align:center;"><p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1d4ed8;">🖥 Join Online</p><a href="${joinUrl}" style="display:inline-block;background:${brand.buttonBg};color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Join Webinar →</a></td></tr></table></td></tr>`;
    } else {
      accessBlock = `<tr><td style="padding:8px 40px;"><table width="100%" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;"><tr><td><p style="margin:0;font-size:13px;color:#1d4ed8;">Your online join link will be emailed before the event starts.</p></td></tr></table></td></tr>`;
    }
  } else if (venue || event.venue_details) {
    accessBlock = venueBlock(event, venue);
  }

  return wrap(brand, `
    ${buildHeader(brand, 'Your Ticket', event.name)}
    <tr><td style="padding:28px 40px 12px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${ticket.attendee_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;"><strong>Type:</strong> ${ttName} (${modeLabel})<br><strong>Date:</strong> ${fmtDate(event.event_date, tz, loc)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime, tz, loc)} – ${fmtTime(event.end_datetime, tz, loc)} (${tz.split('/').pop().replace(/_/g, ' ')})</p></td></tr>
    ${accessBlock}
    ${qrBlock}
    ${manageButton(brand, manageUrl, 'View Your Tickets →')}
    <tr><td style="padding:0 40px 20px;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">Need to change attendee details or request a refund? Use the link above.</p></td></tr>
    ${buildFooter(brand)}
  `);
}

function buildReminderEmail(brand, ticket, event, reminderType, manageUrl, venue) {
  const isOnline = ticket.attendance_mode === 'online';
  const is24h = reminderType === '24hour';
  const tz = event.timezone || brand?.timezone || 'UTC';
  const title = is24h ? '📅 Tomorrow\'s Event' : '⏰ Starting Soon';
  const bodyText = is24h
    ? 'Your event is happening tomorrow. Here\'s everything you need.'
    : 'Your event starts shortly. Make sure you\'re ready!';

  let accessBlock = '';
  if (isOnline) {
    const joinUrl = ticket.zoom_join_url || event.zoom_link || '';
    if (joinUrl) {
      accessBlock = `<tr><td style="padding:8px 40px;text-align:center;"><a href="${joinUrl}" style="display:inline-block;background:${brand.buttonBg};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">${is24h ? 'Bookmark Join Link →' : 'Join Now →'}</a></td></tr>`;
    }
  } else {
    if (venue || event.venue_details) {
      accessBlock = venueBlock(event, venue);
    }
    if (ticket.qr_code_hash && ticket.qr_code_hash !== 'pending') {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qr_code_hash)}`;
      accessBlock += `<tr><td style="padding:8px 40px 20px;text-align:center;"><img src="${qrUrl}" width="160" height="160" style="border:1px solid #e2e8f0;border-radius:8px;padding:4px;background:#fff;" /><p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Show at door for entry</p></td></tr>`;
    }
  }

  return wrap(brand, `
    ${buildHeader(brand, title, event.name)}
    <tr><td style="padding:28px 40px 12px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${ticket.attendee_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">${bodyText}</p></td></tr>
    ${eventInfoBlock(event, brand)}
    ${accessBlock}
    ${manageButton(brand, manageUrl, 'View Your Tickets →')}
    ${buildFooter(brand)}
  `);
}

function buildEventUpdateEmail(brand, event, message, manageUrl) {
  return wrap(brand, `
    ${buildHeader(brand, '📢 Event Update', event.name)}
    <tr><td style="padding:28px 40px;"><p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p></td></tr>
    ${eventInfoBlock(event, brand)}
    ${manageUrl ? manageButton(brand, manageUrl, 'View Your Tickets →') : ''}
    ${buildFooter(brand)}
  `);
}

// ── Send + log ──

async function sendAndLog(base44, workspaceId, emailType, recipientEmail, subject, html, relatedType, relatedId, replyTo) {
  const log = await base44.asServiceRole.entities.EmailLog.create({
    workspace_id: workspaceId, email_type: emailType, recipient_email: recipientEmail,
    subject, related_entity_type: relatedType || '', related_entity_id: relatedId || '', status: 'queued',
  });

  try {
    const emailParams = { to: recipientEmail, subject, body: html };
    if (replyTo) emailParams.from_name = replyTo; // Use workspace sender name
    await base44.asServiceRole.integrations.Core.SendEmail(emailParams);
    await base44.asServiceRole.entities.EmailLog.update(log.id, { status: 'sent', sent_at: new Date().toISOString() });
    return { success: true, log_id: log.id };
  } catch (err) {
    await base44.asServiceRole.entities.EmailLog.update(log.id, { status: 'failed', error_message: err.message });
    console.error(`Email failed [${emailType}] to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message, log_id: log.id };
  }
}

async function loadVenueForEvent(base44, event) {
  if (!event.venue_id) return null;
  const venues = await base44.asServiceRole.entities.Venue.filter({ id: event.venue_id });
  return venues[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── Send order receipt + ticket confirmations ──
    if (action === 'send_order_emails') {
      const { order_id } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      const [events, tickets, ticketTypes] = await Promise.all([
        base44.asServiceRole.entities.Event.filter({ id: order.event_id }),
        base44.asServiceRole.entities.Ticket.filter({ order_id: order.id }),
        base44.asServiceRole.entities.TicketType.filter({ event_id: order.event_id }),
      ]);
      const event = events[0];
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

      const ttMap = Object.fromEntries(ticketTypes.map(tt => [tt.id, tt]));
      const brand = await getWorkspaceBrand(base44, order.workspace_id);
      const venue = await loadVenueForEvent(base44, event);

      // Generate manage-order URL
      let manageUrl = '';
      try {
        const tokenRes = await base44.asServiceRole.functions.invoke('manageOrder', { action: 'generate_token', order_id: order.id });
        // We'll use a generic base URL — the recipient clicks through
        manageUrl = `https://ticketdeck.app/manage/${order.order_number}`;
      } catch (_) {}

      const results = [];

      // Order receipt to buyer
      const receiptHtml = buildOrderReceipt(brand, order, event, tickets, ttMap, manageUrl, venue);
      results.push(await sendAndLog(base44, order.workspace_id, 'order_receipt', order.buyer_email,
        `Booking Confirmed — ${event.name} | Order #${order.order_number}`,
        receiptHtml, 'Order', order.id, brand.senderName));

      // Ticket confirmations
      const activeTickets = tickets.filter(t => t.ticket_status === 'active');
      for (const ticket of activeTickets) {
        const tt = ttMap[ticket.ticket_type_id];
        const recipient = body.send_all_to_buyer ? order.buyer_email : ticket.attendee_email;
        const ticketHtml = buildTicketConfirmation(brand, ticket, event, tt?.name || 'Ticket', manageUrl, venue);
        results.push(await sendAndLog(base44, order.workspace_id, 'ticket_confirmation', recipient,
          `Your ${ticket.attendance_mode === 'online' ? 'Online' : 'In-Person'} Ticket — ${event.name}`,
          ticketHtml, 'Ticket', ticket.id, brand.senderName));
      }

      return Response.json({ status: 'success', sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length });
    }

    // ── Send event reminders ──
    if (action === 'send_reminders') {
      const { event_id, reminder_type } = body;
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      if (!events.length) return Response.json({ error: 'Event not found' }, { status: 404 });
      const event = events[0];
      const brand = await getWorkspaceBrand(base44, event.workspace_id);
      const venue = await loadVenueForEvent(base44, event);
      const tickets = await base44.asServiceRole.entities.Ticket.filter({ event_id, ticket_status: 'active' });

      // Deduplicate by email (keep first ticket per email for greeting)
      const byEmail = {};
      tickets.forEach(t => { if (!byEmail[t.attendee_email]) byEmail[t.attendee_email] = t; });

      // Get manage URLs from orders
      const orderIds = [...new Set(tickets.map(t => t.order_id).filter(Boolean))];
      const orderMap = {};
      if (orderIds.length) {
        const allOrders = await base44.asServiceRole.entities.Order.filter({});
        allOrders.forEach(o => { orderMap[o.id] = o; });
      }

      const results = [];
      const label = reminder_type === '24hour' ? '24-Hour' : '1-Hour';
      for (const ticket of Object.values(byEmail)) {
        const order = orderMap[ticket.order_id];
        const manageUrl = order ? `https://ticketdeck.app/manage/${order.order_number}` : '';
        const html = buildReminderEmail(brand, ticket, event, reminder_type, manageUrl, venue);
        results.push(await sendAndLog(base44, event.workspace_id,
          reminder_type === '24hour' ? 'event_reminder_24h' : 'event_reminder_1h',
          ticket.attendee_email, `${label} Reminder — ${event.name}`,
          html, 'Event', event_id, brand.senderName));
      }

      return Response.json({ status: 'success', sent: results.filter(r => r.success).length, recipients: Object.keys(byEmail).length });
    }

    // ── Send event update ──
    if (action === 'send_event_update') {
      const { event_id, message } = body;
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      if (!events.length) return Response.json({ error: 'Event not found' }, { status: 404 });
      const event = events[0];
      const brand = await getWorkspaceBrand(base44, event.workspace_id);
      const tickets = await base44.asServiceRole.entities.Ticket.filter({ event_id, ticket_status: 'active' });

      const byEmail = {};
      tickets.forEach(t => { if (!byEmail[t.attendee_email]) byEmail[t.attendee_email] = t; });

      const results = [];
      for (const email of Object.keys(byEmail)) {
        const html = buildEventUpdateEmail(brand, event, message);
        results.push(await sendAndLog(base44, event.workspace_id, 'event_update', email,
          `Event Update — ${event.name}`, html, 'Event', event_id, brand.senderName));
      }

      return Response.json({ status: 'success', sent: results.filter(r => r.success).length });
    }

    // ── Resend ticket email (single ticket) ──
    if (action === 'resend_ticket') {
      const { ticket_id } = body;
      const ticketArr = await base44.asServiceRole.entities.Ticket.filter({ id: ticket_id });
      if (!ticketArr.length) return Response.json({ error: 'Ticket not found' }, { status: 404 });
      const ticket = ticketArr[0];
      const events = await base44.asServiceRole.entities.Event.filter({ id: ticket.event_id });
      const event = events[0];
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

      const tts = await base44.asServiceRole.entities.TicketType.filter({ event_id: event.id });
      const tt = tts.find(t => t.id === ticket.ticket_type_id);
      const brand = await getWorkspaceBrand(base44, event.workspace_id);
      const venue = await loadVenueForEvent(base44, event);
      const orders = await base44.asServiceRole.entities.Order.filter({ id: ticket.order_id });
      const order = orders[0];
      const manageUrl = order ? `https://ticketdeck.app/manage/${order.order_number}` : '';

      const html = buildTicketConfirmation(brand, ticket, event, tt?.name || 'Ticket', manageUrl, venue);
      const result = await sendAndLog(base44, event.workspace_id, 'ticket_confirmation', ticket.attendee_email,
        `Your ${ticket.attendance_mode === 'online' ? 'Online' : 'In-Person'} Ticket — ${event.name}`,
        html, 'Ticket', ticket.id, brand.senderName);

      return Response.json(result);
    }

    // ── Retry failed email ──
    if (action === 'retry_email') {
      const { email_log_id } = body;
      const logs = await base44.asServiceRole.entities.EmailLog.filter({ id: email_log_id });
      if (!logs.length) return Response.json({ error: 'Log not found' }, { status: 404 });
      const log = logs[0];
      if (log.status !== 'failed') return Response.json({ error: 'Only failed emails can be retried' }, { status: 400 });
      await base44.asServiceRole.entities.EmailLog.update(log.id, { retry_count: (log.retry_count || 0) + 1, status: 'queued' });
      return Response.json({ status: 'success', message: 'Marked for retry' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('sendWorkspaceEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});