import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Workspace-branded email system ──
// Resolves sender identity and brand from workspace settings.
// Logs all sends to EmailLog for retry/audit.

async function getWorkspaceBrand(base44, workspaceId) {
  const defaults = {
    senderName: 'Ticket Deck',
    headerBg: '#0f172a', accentColor: '#818cf8', buttonBg: '#6366f1',
    logoUrl: '', supportEmail: '',
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
  };
}

function buildHeader(brand, title, subtitle) {
  const logo = brand.logoUrl
    ? `<img src="${brand.logoUrl}" height="32" style="display:block;margin:0 auto 12px;" alt="" />`
    : `<p style="margin:0 0 12px;font-size:13px;color:${brand.accentColor};font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">${brand.senderName}</p>`;
  return `<tr><td style="background:${brand.headerBg};padding:28px 40px;text-align:center;">${logo}<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${title}</h1>${subtitle ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;">${subtitle}</p>` : ''}</td></tr>`;
}

function buildFooter(brand) {
  const support = brand.supportEmail ? `<p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">Questions? <a href="mailto:${brand.supportEmail}" style="color:${brand.accentColor}">${brand.supportEmail}</a></p>` : '';
  return `<tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;"><p style="margin:0;font-size:12px;color:#94a3b8;">Sent by ${brand.senderName}</p>${support}</td></tr>`;
}

function wrap(brand, inner) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">${inner}</table></td></tr></table></body></html>`;
}

function fmtDate(d) { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function fmtTime(d) { if (!d) return ''; return new Date(d).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }); }
function fmtCurrency(v) { return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v || 0); }

// ── Template builders ──

function buildOrderReceipt(brand, order, event, tickets, ttMap) {
  const rows = tickets.map(t => {
    const tt = ttMap[t.ticket_type_id];
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${t.attendee_first_name} ${t.attendee_last_name}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${tt?.name || 'Ticket'}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;">${tt?.price > 0 ? fmtCurrency(tt.price) : 'Free'}</td></tr>`;
  }).join('');
  const total = order.total_amount > 0 ? fmtCurrency(order.total_amount) : 'Free';

  return wrap(brand, `
    ${buildHeader(brand, 'Booking Confirmed ✓', `Order #${order.order_number}`)}
    <tr><td style="padding:28px 40px 12px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${order.buyer_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;">Your booking for <strong>${event.name}</strong> is confirmed.</p></td></tr>
    <tr><td style="padding:8px 40px;"><table width="100%" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px;"><tr><td><p style="margin:0;font-size:13px;color:#94a3b8;">Date</p><p style="margin:2px 0 8px;font-size:14px;color:#334155;font-weight:600;">${fmtDate(event.event_date)}</p><p style="margin:0;font-size:13px;color:#94a3b8;">Time</p><p style="margin:2px 0 0;font-size:14px;color:#334155;font-weight:600;">${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p></td></tr></table></td></tr>
    <tr><td style="padding:16px 40px;"><table width="100%" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;"><tr style="background:#f1f5f9;"><th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;">Attendee</th><th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#94a3b8;">Type</th><th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#94a3b8;">Price</th></tr>${rows}<tr style="background:#f8fafc;"><td colspan="2" style="padding:8px 12px;font-weight:700;font-size:13px;">Total</td><td style="padding:8px 12px;text-align:right;font-weight:700;font-size:13px;">${total}</td></tr></table></td></tr>
    ${buildFooter(brand)}
  `);
}

function buildTicketConfirmation(brand, ticket, event, ttName, sendAllToBuyer) {
  const isOnline = ticket.attendance_mode === 'online';
  const qrUrl = !isOnline && ticket.qr_code_hash && ticket.qr_code_hash !== 'pending'
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qr_code_hash)}`
    : '';
  const qrBlock = qrUrl ? `<tr><td style="padding:8px 40px 20px;text-align:center;"><p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Check-In QR</p><img src="${qrUrl}" width="200" height="200" style="border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#fff;" /></td></tr>` : '';
  const modeLabel = isOnline ? '🖥 Online' : '📍 In-Person';

  return wrap(brand, `
    ${buildHeader(brand, 'Your Ticket', event.name)}
    <tr><td style="padding:28px 40px 12px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${ticket.attendee_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;"><strong>Type:</strong> ${ttName} (${modeLabel})<br><strong>Date:</strong> ${fmtDate(event.event_date)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p></td></tr>
    ${qrBlock}
    ${buildFooter(brand)}
  `);
}

function buildReminderEmail(brand, ticket, event, reminderType) {
  const isOneHour = reminderType === '1hour';
  const title = isOneHour ? '⏰ Starting in 1 Hour' : '🔴 Starting Now!';
  const isOnline = ticket.attendance_mode === 'online';
  const zoomLink = ticket.zoom_join_url || event.zoom_link || '';
  let accessBlock = '';
  if (isOnline && zoomLink) {
    const btnColor = isOneHour ? brand.buttonBg : '#dc2626';
    accessBlock = `<tr><td style="padding:8px 40px 20px;text-align:center;"><a href="${zoomLink}" style="display:inline-block;background:${btnColor};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">${isOneHour ? 'Get Ready to Join →' : 'Join Now →'}</a></td></tr>`;
  } else if (!isOnline && ticket.qr_code_hash && ticket.qr_code_hash !== 'pending') {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.qr_code_hash)}`;
    accessBlock = `<tr><td style="padding:8px 40px 20px;text-align:center;"><img src="${qrUrl}" width="160" height="160" style="border:1px solid #e2e8f0;border-radius:8px;padding:4px;background:#fff;" /><p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Show at door</p></td></tr>`;
  }

  return wrap(brand, `
    ${buildHeader(brand, title, event.name)}
    <tr><td style="padding:28px 40px 12px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${ticket.attendee_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">Your session starts ${isOneHour ? 'in 1 hour' : 'in a few minutes'}.</p><p style="margin:8px 0 0;font-size:14px;color:#334155;"><strong>${fmtDate(event.event_date)}</strong> at <strong>${fmtTime(event.start_datetime)}</strong></p></td></tr>
    ${accessBlock}
    ${buildFooter(brand)}
  `);
}

function buildEventUpdateEmail(brand, event, message) {
  return wrap(brand, `
    ${buildHeader(brand, '📢 Event Update', event.name)}
    <tr><td style="padding:28px 40px;"><p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${message}</p><p style="margin:16px 0 0;font-size:14px;color:#334155;"><strong>Date:</strong> ${fmtDate(event.event_date)}<br><strong>Time:</strong> ${fmtTime(event.start_datetime)} – ${fmtTime(event.end_datetime)}</p></td></tr>
    ${buildFooter(brand)}
  `);
}

function buildSalesClosingEmail(brand, event, ticket) {
  return wrap(brand, `
    ${buildHeader(brand, '🎟 Sales Closing Soon', event.name)}
    <tr><td style="padding:28px 40px;"><p style="margin:0;font-size:15px;color:#334155;">Hi <strong>${ticket.attendee_first_name}</strong>,</p><p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">Just a reminder — this event is coming up and ticket sales will close soon.</p><p style="margin:12px 0 0;font-size:14px;color:#334155;"><strong>${fmtDate(event.event_date)}</strong> at <strong>${fmtTime(event.start_datetime)}</strong></p></td></tr>
    ${buildFooter(brand)}
  `);
}

// ── Send + log ──

async function sendAndLog(base44, workspaceId, emailType, recipientEmail, subject, html, relatedType, relatedId) {
  const log = await base44.asServiceRole.entities.EmailLog.create({
    workspace_id: workspaceId, email_type: emailType, recipient_email: recipientEmail,
    subject, related_entity_type: relatedType || '', related_entity_id: relatedId || '', status: 'queued',
  });

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to: recipientEmail, subject, body: html, from_name: 'Ticket Deck' });
    await base44.asServiceRole.entities.EmailLog.update(log.id, { status: 'sent', sent_at: new Date().toISOString() });
    return { success: true, log_id: log.id };
  } catch (err) {
    await base44.asServiceRole.entities.EmailLog.update(log.id, { status: 'failed', error_message: err.message });
    console.error(`Email failed [${emailType}] to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message, log_id: log.id };
  }
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
      const ttMap = Object.fromEntries(ticketTypes.map(tt => [tt.id, tt]));
      const brand = await getWorkspaceBrand(base44, order.workspace_id);
      const results = [];

      // Order receipt to buyer
      const receiptHtml = buildOrderReceipt(brand, order, event, tickets, ttMap);
      results.push(await sendAndLog(base44, order.workspace_id, 'order_receipt', order.buyer_email, `Booking Confirmed — ${event.name} | Order #${order.order_number}`, receiptHtml, 'Order', order.id));

      // Ticket confirmations
      for (const ticket of tickets) {
        const tt = ttMap[ticket.ticket_type_id];
        const recipient = body.send_all_to_buyer ? order.buyer_email : ticket.attendee_email;
        const ticketHtml = buildTicketConfirmation(brand, ticket, event, tt?.name || 'Ticket', body.send_all_to_buyer);
        results.push(await sendAndLog(base44, order.workspace_id, 'ticket_confirmation', recipient, `Your ${ticket.attendance_mode === 'online' ? 'Online' : 'In-Person'} Ticket — ${event.name}`, ticketHtml, 'Ticket', ticket.id));
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
      const tickets = await base44.asServiceRole.entities.Ticket.filter({ event_id, ticket_status: 'active' });

      // Deduplicate by email
      const byEmail = {};
      tickets.forEach(t => { if (!byEmail[t.attendee_email]) byEmail[t.attendee_email] = t; });

      const results = [];
      const label = reminder_type === '1hour' ? '1-Hour' : '5-Minute';
      for (const ticket of Object.values(byEmail)) {
        const html = buildReminderEmail(brand, ticket, event, reminder_type);
        results.push(await sendAndLog(base44, event.workspace_id, reminder_type === '1hour' ? 'event_reminder_1h' : 'event_reminder_5m', ticket.attendee_email, `${label} Reminder — ${event.name}`, html, 'Event', event_id));
      }

      return Response.json({ status: 'success', sent: results.filter(r => r.success).length });
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
      const html = buildEventUpdateEmail(brand, event, message);
      for (const email of Object.keys(byEmail)) {
        results.push(await sendAndLog(base44, event.workspace_id, 'event_update', email, `Event Update — ${event.name}`, html, 'Event', event_id));
      }

      return Response.json({ status: 'success', sent: results.filter(r => r.success).length });
    }

    // ── Retry failed email ──
    if (action === 'retry_email') {
      const { email_log_id } = body;
      const logs = await base44.asServiceRole.entities.EmailLog.filter({ id: email_log_id });
      if (!logs.length) return Response.json({ error: 'Log not found' }, { status: 404 });
      const log = logs[0];
      if (log.status !== 'failed') return Response.json({ error: 'Only failed emails can be retried' }, { status: 400 });

      // We can't rebuild the HTML, so just mark for retry. In v2 we'd store the HTML.
      await base44.asServiceRole.entities.EmailLog.update(log.id, { retry_count: (log.retry_count || 0) + 1, status: 'queued' });
      return Response.json({ status: 'success', message: 'Marked for retry' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('sendWorkspaceEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});