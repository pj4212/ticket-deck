import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Internal webhook dispatch system ──
// Dispatches internal events to workspace webhook endpoints.
// Skeleton for future external API — endpoints receive signed payloads.
//
// Architecture note: This is an internal-only dispatch layer.
// A future public API would add authentication, rate limiting, and
// versioned event schemas. This function provides the foundation.

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
        // Check if endpoint subscribes to this event type
        let eventTypes = [];
        try { eventTypes = JSON.parse(ep.event_types || '[]'); } catch (_) {}
        if (eventTypes.length && !eventTypes.includes(event_type) && !eventTypes.includes('*')) continue;

        // Build signed payload
        const ts = Date.now();
        const eventPayload = {
          id: `evt_${ts}_${Math.random().toString(36).slice(2, 8)}`,
          type: event_type,
          workspace_id,
          created_at: new Date().toISOString(),
          data: payload,
        };

        // Sign with HMAC if secret exists
        let signature = '';
        if (ep.secret) {
          const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(ep.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(JSON.stringify(eventPayload)));
          signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        try {
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': String(ts),
              'X-Event-Type': event_type,
            },
            body: JSON.stringify(eventPayload),
            signal: AbortSignal.timeout(10000),
          });

          if (res.ok) {
            dispatched++;
            await base44.asServiceRole.entities.WebhookEndpoint.update(ep.id, { last_triggered_at: new Date().toISOString(), failure_count: 0 });
          } else {
            failed++;
            await base44.asServiceRole.entities.WebhookEndpoint.update(ep.id, { failure_count: (ep.failure_count || 0) + 1 });
          }
        } catch (err) {
          failed++;
          await base44.asServiceRole.entities.WebhookEndpoint.update(ep.id, { failure_count: (ep.failure_count || 0) + 1 });
          console.error(`Webhook delivery failed to ${ep.url}:`, err.message);
        }
      }

      return Response.json({ status: 'success', dispatched, failed });
    }

    // ── List available event types (for configuration UI) ──
    if (action === 'list_event_types') {
      return Response.json({
        status: 'success',
        event_types: [
          { type: 'order.created', description: 'New order placed' },
          { type: 'order.completed', description: 'Payment confirmed' },
          { type: 'order.refunded', description: 'Order refunded' },
          { type: 'ticket.checked_in', description: 'Ticket checked in' },
          { type: 'ticket.cancelled', description: 'Ticket cancelled' },
          { type: 'event.published', description: 'Event published' },
          { type: 'event.cancelled', description: 'Event cancelled' },
          { type: 'event.updated', description: 'Event details changed' },
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