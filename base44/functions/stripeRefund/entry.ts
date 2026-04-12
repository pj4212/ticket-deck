import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.14.0';

// ── Workspace-scoped Stripe refund + reconciliation ──
// Architecture note: Currently uses direct API keys per workspace.
// Future Stripe Connect migration would replace this with platform-level
// account references and `stripe.refunds.create({ ... }, { stripeAccount })`.

async function getStripeKey(base44, workspaceId) {
  // Try WorkspaceIntegration
  const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter({ workspace_id: workspaceId, provider: 'stripe', status: 'active' });
  if (integrations.length && integrations[0].credentials_json_encrypted) {
    try { return JSON.parse(integrations[0].credentials_json_encrypted).secret_key; } catch (_) {}
  }
  // Fallback to WorkspaceSetting
  const settings = await base44.asServiceRole.entities.WorkspaceSetting.filter({ workspace_id: workspaceId, key: 'stripe_secret_key' });
  if (settings.length) { try { return JSON.parse(settings[0].value_json); } catch { return settings[0].value_json; } }
  throw new Error('Stripe not configured for this workspace');
}

async function withRetry(fn, label = 'op', maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── Full refund ──
    if (action === 'refund') {
      const { order_id, reason } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      if (!order.stripe_payment_intent_id) return Response.json({ error: 'No payment to refund (free order)' }, { status: 400 });
      if (order.payment_status === 'refunded') return Response.json({ error: 'Already refunded' }, { status: 400 });

      const stripeKey = await getStripeKey(base44, order.workspace_id);
      const stripe = new Stripe(stripeKey);

      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
      });

      await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'refunded', order_status: 'cancelled' });

      // Cancel all tickets
      const tickets = await base44.asServiceRole.entities.Ticket.filter({ order_id: order.id });
      for (const ticket of tickets) {
        await base44.asServiceRole.entities.Ticket.update(ticket.id, { ticket_status: 'refunded' });
      }

      // Cancel order items
      const items = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id });
      for (const item of items) {
        await base44.asServiceRole.entities.OrderItem.update(item.id, { item_status: 'refunded' });
      }

      // Update ticket type sold counts
      const soldDelta = {};
      tickets.forEach(t => { soldDelta[t.ticket_type_id] = (soldDelta[t.ticket_type_id] || 0) + 1; });
      for (const [ttId, count] of Object.entries(soldDelta)) {
        const tts = await base44.asServiceRole.entities.TicketType.filter({ id: ttId });
        if (tts.length) {
          await base44.asServiceRole.entities.TicketType.update(ttId, { quantity_sold: Math.max(0, (tts[0].quantity_sold || 0) - count) });
        }
      }

      // Audit log
      await base44.asServiceRole.entities.AuditLog.create({
        workspace_id: order.workspace_id, actor_user_id: user.id, actor_type: 'workspace_member',
        action_type: 'refund', entity_type: 'Order', entity_id: order.id,
        metadata_json: JSON.stringify({ refund_id: refund.id, amount: refund.amount / 100, reason }),
        severity: 'warning',
      }).catch(() => {});

      return Response.json({ status: 'success', refund_id: refund.id, amount: refund.amount / 100 });
    }

    // ── Partial refund ──
    if (action === 'partial_refund') {
      const { order_id, amount, ticket_ids, reason } = body;
      const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
      if (!orders.length) return Response.json({ error: 'Order not found' }, { status: 404 });
      const order = orders[0];

      if (!order.stripe_payment_intent_id) return Response.json({ error: 'No payment to refund' }, { status: 400 });

      const stripeKey = await getStripeKey(base44, order.workspace_id);
      const stripe = new Stripe(stripeKey);

      const refundAmount = Math.round(amount * 100); // cents
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: refundAmount,
        reason: 'requested_by_customer',
      });

      await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'partially_refunded' });

      // Cancel specific tickets if provided
      if (ticket_ids && ticket_ids.length) {
        for (const ticketId of ticket_ids) {
          await base44.asServiceRole.entities.Ticket.update(ticketId, { ticket_status: 'refunded' });
        }
      }

      await base44.asServiceRole.entities.AuditLog.create({
        workspace_id: order.workspace_id, actor_user_id: user.id, actor_type: 'workspace_member',
        action_type: 'partial_refund', entity_type: 'Order', entity_id: order.id,
        metadata_json: JSON.stringify({ refund_id: refund.id, amount: amount, ticket_ids: ticket_ids || [] }),
        severity: 'warning',
      }).catch(() => {});

      return Response.json({ status: 'success', refund_id: refund.id, amount: refund.amount / 100 });
    }

    // ── Reconcile: sync Stripe fees for workspace ──
    if (action === 'reconcile') {
      const { workspace_id } = body;
      const stripeKey = await getStripeKey(base44, workspace_id);
      const stripe = new Stripe(stripeKey);

      const orders = await base44.asServiceRole.entities.Order.filter({ workspace_id, payment_status: 'completed' });
      const toSync = orders.filter(o => o.stripe_payment_intent_id && o.total_amount > 0 && !o.stripe_fee);

      let synced = 0, errors = 0;
      for (const order of toSync.slice(0, 50)) { // Limit to 50 per run
        try {
          const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, { expand: ['latest_charge.balance_transaction'] });
          const bt = pi.latest_charge?.balance_transaction;
          if (bt && typeof bt !== 'string') {
            await base44.asServiceRole.entities.Order.update(order.id, { stripe_fee: bt.fee / 100 });
            synced++;
          }
        } catch (_) { errors++; }
      }

      return Response.json({ status: 'success', synced, errors, remaining: Math.max(0, toSync.length - 50) });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('stripeRefund error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});