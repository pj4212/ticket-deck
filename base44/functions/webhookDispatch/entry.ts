import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Outbound webhook dispatch with logging and retries ──

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10000;

async function deliverWebhook(base44, endpoint, eventPayload, eventType, workspaceId, attempt = 1) {
  const startMs = Date.now();
  let signature = '';

  // HMAC sign
  if (endpoint.secret) {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(endpoint.secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify(eventPayload)));
    signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Create or update log entry
  const logData = {
    workspace_id: workspaceId,
    endpoint_id: endpoint.id,
    event_type: eventType,
    event_id_ref: eventPayload.id || '',
    url: endpoint.url,
    request_body_json: JSON.stringify(eventPayload).substring(0, 5000),
    attempt_number: attempt,
    max_attempts: MAX_ATTEMPTS,
    delivery_status: 'pending',
  };

  let logEntry;
  try {
    logEntry = await base44.asServiceRole.entities.WebhookDeliveryLog.create(logData);
  } catch (e) {
    console.warn('Failed to create delivery log:', e.message);
  }

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': String(startMs),
        'X-Event-Type': eventType,
        'User-Agent': 'TicketDeck-Webhooks/1.0',
      },
      body: JSON.stringify(eventPayload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const durationMs = Date.now() - startMs;
    let responseBody = '';
    try { responseBody = (await res.text()).substring(0, 2000); } catch (_) {}

    if (res.ok) {
      // Success
      if (logEntry) {
        await base44.asServiceRole.entities.WebhookDeliveryLog.update(logEntry.id, {
          delivery_status: 'success', response_status: res.status, response_body: responseBody, duration_ms: durationMs,
        }).catch(() => {});
      }
      await base44.asServiceRole.entities.WebhookEndpoint.update(endpoint.id, {
        last_triggered_at: new Date().toISOString(), failure_count: 0,
      }).catch(() => {});
      return { success: true, status: res.status };
    } else {
      // HTTP error
      const shouldRetry = attempt < MAX_ATTEMPTS && (res.status >= 500 || res.status === 429);
      if (logEntry) {
        await base44.asServiceRole.entities.WebhookDeliveryLog.update(logEntry.id, {
          delivery_status: shouldRetry ? 'retrying' : 'failed',
          response_status: res.status, response_body: responseBody, duration_ms: durationMs,
          error_message: `HTTP ${res.status}`,
          next_retry_at: shouldRetry ? new Date(Date.now() + attempt * 30000).toISOString() : '',
        }).catch(() => {});
      }
      await base44.asServiceRole.entities.WebhookEndpoint.update(endpoint.id, {
        failure_count: (endpoint.failure_count || 0) + 1,
      }).catch(() => {});

      if (shouldRetry) {
        await new Promise(r => setTimeout(r, attempt * 5000));
        return deliverWebhook(base44, endpoint, eventPayload, eventType, workspaceId, attempt + 1);
      }
      return { success: false, status: res.status, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const shouldRetry = attempt < MAX_ATTEMPTS;

    if (logEntry) {
      await base44.asServiceRole.entities.WebhookDeliveryLog.update(logEntry.id, {
        delivery_status: shouldRetry ? 'retrying' : 'failed',
        duration_ms: durationMs, error_message: err.message,
        next_retry_at: shouldRetry ? new Date(Date.now() + attempt * 30000).toISOString() : '',
      }).catch(() => {});
    }
    await base44.asServiceRole.entities.WebhookEndpoint.update(endpoint.id, {
      failure_count: (endpoint.failure_count || 0) + 1,
    }).catch(() => {});

    if (shouldRetry) {
      await new Promise(r => setTimeout(r, attempt * 5000));
      return deliverWebhook(base44, endpoint, eventPayload, eventType, workspaceId, attempt + 1);
    }
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── Dispatch event to workspace webhooks ──
    if (action === 'dispatch') {
      const { workspace_id, event_type, payload } = body;
      if (!workspace_id || !event_type) return Response.json({ error: 'workspace_id and event_type required' }, { status: 400 });

      const endpoints = await base44.asServiceRole.entities.WebhookEndpoint.filter({ workspace_id, is_active: true });
      if (!endpoints.length) return Response.json({ status: 'success', dispatched: 0 });

      let dispatched = 0;
      let failed = 0;

      for (const ep of endpoints) {
        let eventTypes = [];
        try { eventTypes = JSON.parse(ep.event_types || '[]'); } catch (_) {}
        if (eventTypes.length && !eventTypes.includes(event_type) && !eventTypes.includes('*')) continue;

        const eventPayload = {
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: event_type,
          workspace_id,
          created_at: new Date().toISOString(),
          data: payload,
        };

        const result = await deliverWebhook(base44, ep, eventPayload, event_type, workspace_id);
        if (result.success) dispatched++;
        else failed++;
      }

      // Also upsert CRM contacts for order/ticket events
      if (['order.created', 'order.completed'].includes(event_type) && payload?.order_id) {
        upsertContactFromOrder(base44, workspace_id, payload.order_id).catch(e =>
          console.warn('Contact upsert failed:', e.message)
        );
      }

      return Response.json({ status: 'success', dispatched, failed });
    }

    // ── Retry a failed delivery ──
    if (action === 'retry_delivery') {
      const user = await base44.auth.me();
      if (!user || !['admin', 'super_admin', 'event_admin'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { log_id } = body;
      const logs = await base44.asServiceRole.entities.WebhookDeliveryLog.filter({ id: log_id });
      if (!logs.length) return Response.json({ error: 'Log not found' }, { status: 404 });
      const log = logs[0];

      const endpoints = await base44.asServiceRole.entities.WebhookEndpoint.filter({ id: log.endpoint_id });
      if (!endpoints.length) return Response.json({ error: 'Endpoint not found' }, { status: 404 });
      const ep = endpoints[0];

      let eventPayload;
      try { eventPayload = JSON.parse(log.request_body_json); } catch (_) {
        return Response.json({ error: 'Cannot parse original payload' }, { status: 400 });
      }

      const result = await deliverWebhook(base44, ep, eventPayload, log.event_type, log.workspace_id);
      return Response.json({ status: result.success ? 'success' : 'failed', result });
    }

    // ── Test endpoint ──
    if (action === 'test_endpoint') {
      const user = await base44.auth.me();
      if (!user || !['admin', 'super_admin', 'event_admin'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { endpoint_id, workspace_id } = body;
      const endpoints = await base44.asServiceRole.entities.WebhookEndpoint.filter({ id: endpoint_id });
      if (!endpoints.length) return Response.json({ error: 'Endpoint not found' }, { status: 404 });
      const ep = endpoints[0];

      const testPayload = {
        id: `test_${Date.now()}`,
        type: 'test.ping',
        workspace_id: workspace_id || ep.workspace_id,
        created_at: new Date().toISOString(),
        data: { message: 'This is a test webhook from Ticket Deck', timestamp: new Date().toISOString() },
      };

      const result = await deliverWebhook(base44, ep, testPayload, 'test.ping', workspace_id || ep.workspace_id);
      return Response.json({ status: result.success ? 'success' : 'failed', result });
    }

    // ── Get delivery logs for an endpoint ──
    if (action === 'get_delivery_logs') {
      const user = await base44.auth.me();
      if (!user || !['admin', 'super_admin', 'event_admin'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { endpoint_id, workspace_id } = body;
      const filter = endpoint_id ? { endpoint_id } : { workspace_id };
      const logs = await base44.asServiceRole.entities.WebhookDeliveryLog.filter(filter, '-created_date', 50);
      return Response.json({ status: 'success', logs });
    }

    // ── List available event types ──
    if (action === 'list_event_types') {
      return Response.json({
        status: 'success',
        event_types: [
          { type: 'order.created', description: 'New order placed' },
          { type: 'order.completed', description: 'Payment confirmed' },
          { type: 'order.refunded', description: 'Order refunded' },
          { type: 'ticket.issued', description: 'Ticket created/issued' },
          { type: 'ticket.checked_in', description: 'Attendee checked in' },
          { type: 'ticket.cancelled', description: 'Ticket cancelled' },
          { type: 'ticket.refunded', description: 'Ticket refunded' },
          { type: 'event.published', description: 'Event published' },
          { type: 'event.cancelled', description: 'Event cancelled' },
          { type: 'event.updated', description: 'Event details changed' },
          { type: 'test.ping', description: 'Test ping' },
          { type: '*', description: 'All events' },
        ],
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('webhookDispatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── CRM contact upsert from order ──
async function upsertContactFromOrder(base44, workspaceId, orderId) {
  const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
  if (!orders.length) return;
  const order = orders[0];

  // Upsert buyer
  const existing = await base44.asServiceRole.entities.ContactExport.filter({
    workspace_id: workspaceId, email: order.buyer_email,
  });

  if (existing.length) {
    await base44.asServiceRole.entities.ContactExport.update(existing[0].id, {
      first_name: order.buyer_first_name,
      last_name: order.buyer_last_name,
      phone: order.buyer_phone || existing[0].phone || '',
      source_order_id: orderId,
      source_event_id: order.event_id,
    });
  } else {
    await base44.asServiceRole.entities.ContactExport.create({
      workspace_id: workspaceId,
      email: order.buyer_email,
      first_name: order.buyer_first_name,
      last_name: order.buyer_last_name,
      phone: order.buyer_phone || '',
      contact_type: 'buyer',
      source_order_id: orderId,
      source_event_id: order.event_id,
      sync_status: 'pending',
    });
  }

  // Upsert attendees from order items
  const items = await base44.asServiceRole.entities.OrderItem.filter({ order_id: orderId });
  for (const item of items) {
    if (item.attendee_email === order.buyer_email) continue;
    const existingAtt = await base44.asServiceRole.entities.ContactExport.filter({
      workspace_id: workspaceId, email: item.attendee_email,
    });
    if (!existingAtt.length) {
      await base44.asServiceRole.entities.ContactExport.create({
        workspace_id: workspaceId,
        email: item.attendee_email,
        first_name: item.attendee_first_name,
        last_name: item.attendee_last_name,
        contact_type: 'attendee',
        source_order_id: orderId,
        source_event_id: order.event_id,
        sync_status: 'pending',
      });
    }
  }
}