import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Platform admin check via PlatformRoleAssignment
    const pUsers = await base44.asServiceRole.entities.PlatformUser.filter({ email: user.email });
    if (!pUsers.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const platformUser = pUsers[0];

    const roles = await base44.asServiceRole.entities.PlatformRoleAssignment.filter({ user_id: platformUser.id, is_active: true });
    const isPlatformAdmin = roles.some(r => ['platform_owner', 'platform_admin'].includes(r.role));
    const isPlatformSupport = roles.some(r => ['platform_owner', 'platform_admin', 'platform_support'].includes(r.role));

    if (!isPlatformSupport) return Response.json({ error: 'Forbidden: Platform role required' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // ===== SUSPEND WORKSPACE =====
    if (action === 'suspend_workspace') {
      if (!isPlatformAdmin) return Response.json({ error: 'Admin required' }, { status: 403 });
      const { workspace_id, reason } = body;
      const now = new Date().toISOString();

      await base44.asServiceRole.entities.Workspace.update(workspace_id, {
        is_active: false,
        suspended_at: now,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        workspace_id, actor_user_id: platformUser.id, actor_type: 'platform_admin',
        action_type: 'suspend', entity_type: 'Workspace', entity_id: workspace_id,
        metadata_json: JSON.stringify({ reason: reason || '' }), severity: 'critical',
      });

      return Response.json({ status: 'success', message: 'Workspace suspended' });
    }

    // ===== UNSUSPEND WORKSPACE =====
    if (action === 'unsuspend_workspace') {
      if (!isPlatformAdmin) return Response.json({ error: 'Admin required' }, { status: 403 });
      const { workspace_id } = body;

      await base44.asServiceRole.entities.Workspace.update(workspace_id, {
        is_active: true, suspended_at: '',
      });

      await base44.asServiceRole.entities.AuditLog.create({
        workspace_id, actor_user_id: platformUser.id, actor_type: 'platform_admin',
        action_type: 'unsuspend', entity_type: 'Workspace', entity_id: workspace_id,
        severity: 'warning',
      });

      return Response.json({ status: 'success', message: 'Workspace unsuspended' });
    }

    // ===== ASSIGN PLAN =====
    if (action === 'assign_plan') {
      if (!isPlatformAdmin) return Response.json({ error: 'Admin required' }, { status: 403 });
      const { workspace_id, plan_id, billing_status, trial_days } = body;

      // Check existing subscription
      const existing = await base44.asServiceRole.entities.WorkspaceSubscription.filter({ workspace_id });
      const now = new Date();
      const subData = {
        workspace_id, plan_id,
        billing_status: billing_status || 'trialing',
        current_period_start: now.toISOString(),
        current_period_end: new Date(now.getTime() + 30 * 86400000).toISOString(),
      };

      if (billing_status === 'trialing' && trial_days) {
        subData.trial_ends_at = new Date(now.getTime() + trial_days * 86400000).toISOString();
      }

      let sub;
      if (existing.length) {
        sub = await base44.asServiceRole.entities.WorkspaceSubscription.update(existing[0].id, subData);
      } else {
        sub = await base44.asServiceRole.entities.WorkspaceSubscription.create(subData);
      }

      await base44.asServiceRole.entities.AuditLog.create({
        workspace_id, actor_user_id: platformUser.id, actor_type: 'platform_admin',
        action_type: 'plan_assign', entity_type: 'WorkspaceSubscription', entity_id: sub?.id || existing[0]?.id || '',
        metadata_json: JSON.stringify({ plan_id, billing_status: subData.billing_status }),
      });

      return Response.json({ status: 'success', subscription: sub });
    }

    // ===== EXTEND TRIAL =====
    if (action === 'extend_trial') {
      if (!isPlatformAdmin) return Response.json({ error: 'Admin required' }, { status: 403 });
      const { subscription_id, extra_days } = body;

      const subs = await base44.asServiceRole.entities.WorkspaceSubscription.filter({ id: subscription_id });
      if (!subs.length) return Response.json({ error: 'Subscription not found' }, { status: 404 });
      const sub = subs[0];

      const currentEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
      const newEnd = new Date(currentEnd.getTime() + (extra_days || 14) * 86400000);

      await base44.asServiceRole.entities.WorkspaceSubscription.update(sub.id, {
        trial_ends_at: newEnd.toISOString(),
        billing_status: 'trialing',
      });

      await base44.asServiceRole.entities.AuditLog.create({
        workspace_id: sub.workspace_id, actor_user_id: platformUser.id, actor_type: 'platform_admin',
        action_type: 'trial_extend', entity_type: 'WorkspaceSubscription', entity_id: sub.id,
        metadata_json: JSON.stringify({ extra_days, new_trial_end: newEnd.toISOString() }),
      });

      return Response.json({ status: 'success', new_trial_end: newEnd.toISOString() });
    }

    // ===== UPDATE FEATURE FLAGS =====
    if (action === 'update_feature_flags') {
      if (!isPlatformAdmin) return Response.json({ error: 'Admin required' }, { status: 403 });
      const { subscription_id, feature_overrides } = body;

      await base44.asServiceRole.entities.WorkspaceSubscription.update(subscription_id, {
        feature_overrides_json: JSON.stringify(feature_overrides),
      });

      await base44.asServiceRole.entities.AuditLog.create({
        actor_user_id: platformUser.id, actor_type: 'platform_admin',
        action_type: 'feature_flag_toggle', entity_type: 'WorkspaceSubscription', entity_id: subscription_id,
        metadata_json: JSON.stringify({ feature_overrides }),
      });

      return Response.json({ status: 'success' });
    }

    // ===== PLATFORM STATS =====
    if (action === 'get_stats') {
      const [workspaces, subscriptions, orders, tickets, alerts, integrations] = await Promise.all([
        base44.asServiceRole.entities.Workspace.filter({}),
        base44.asServiceRole.entities.WorkspaceSubscription.filter({}),
        base44.asServiceRole.entities.Order.filter({}),
        base44.asServiceRole.entities.Ticket.filter({}),
        base44.asServiceRole.entities.PlatformAlert.filter({ status: 'open' }),
        base44.asServiceRole.entities.WorkspaceIntegration.filter({}),
      ]);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      const recentOrders = orders.filter(o => o.created_date >= thirtyDaysAgo);
      const gmv30d = recentOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const failedPayments = orders.filter(o => o.payment_status === 'failed' && o.created_date >= thirtyDaysAgo).length;
      const refundedOrders = orders.filter(o => ['refunded', 'partially_refunded'].includes(o.payment_status) && o.created_date >= thirtyDaysAgo).length;
      const activeSubscriptions = subscriptions.filter(s => ['active', 'trialing'].includes(s.billing_status)).length;
      const pastDueSubscriptions = subscriptions.filter(s => s.billing_status === 'past_due').length;
      const totalTickets = tickets.length;
      const checkedIn = tickets.filter(t => t.check_in_status === 'checked_in').length;
      const unhealthyIntegrations = integrations.filter(i => ['error', 'revoked'].includes(i.status) || i.health_status === 'down').length;

      return Response.json({
        status: 'success',
        stats: {
          total_workspaces: workspaces.length,
          active_workspaces: workspaces.filter(w => w.is_active).length,
          suspended_workspaces: workspaces.filter(w => !w.is_active).length,
          active_subscriptions: activeSubscriptions,
          past_due_subscriptions: pastDueSubscriptions,
          total_orders: orders.length,
          gmv_30d: gmv30d,
          failed_payments_30d: failedPayments,
          refunded_orders_30d: refundedOrders,
          total_tickets: totalTickets,
          checked_in_tickets: checkedIn,
          open_alerts: alerts.length,
          unhealthy_integrations: unhealthyIntegrations,
        },
      });
    }

    // ===== SUPPORT LOOKUP =====
    if (action === 'support_lookup') {
      const { lookup_type, query } = body;

      if (lookup_type === 'workspace') {
        const workspaces = await base44.asServiceRole.entities.Workspace.filter({});
        const q = query.toLowerCase();
        const matches = workspaces.filter(w =>
          w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q) || w.id === query
        );
        return Response.json({ status: 'success', results: matches.slice(0, 20) });
      }

      if (lookup_type === 'user') {
        const users = await base44.asServiceRole.entities.PlatformUser.filter({});
        const q = query.toLowerCase();
        const matches = users.filter(u =>
          u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.id === query
        );
        return Response.json({ status: 'success', results: matches.slice(0, 20) });
      }

      if (lookup_type === 'order') {
        const orders = await base44.asServiceRole.entities.Order.filter({});
        const q = query.toLowerCase();
        const matches = orders.filter(o =>
          o.order_number?.toLowerCase().includes(q) || o.buyer_email?.toLowerCase().includes(q) || o.id === query
        );
        return Response.json({ status: 'success', results: matches.slice(0, 20) });
      }

      if (lookup_type === 'ticket') {
        const tickets = await base44.asServiceRole.entities.Ticket.filter({});
        const q = query.toLowerCase();
        const matches = tickets.filter(t =>
          t.attendee_email?.toLowerCase().includes(q) || t.qr_code_hash?.includes(query) || t.id === query
        );
        return Response.json({ status: 'success', results: matches.slice(0, 20) });
      }

      return Response.json({ error: 'Invalid lookup type' }, { status: 400 });
    }

    // ===== RESOLVE ALERT =====
    if (action === 'resolve_alert') {
      const { alert_id, resolution_status } = body;
      await base44.asServiceRole.entities.PlatformAlert.update(alert_id, {
        status: resolution_status || 'resolved',
        resolved_by: platformUser.id,
        resolved_at: new Date().toISOString(),
      });
      return Response.json({ status: 'success' });
    }

    // ===== INTEGRATION HEALTH CHECK =====
    if (action === 'integration_health') {
      const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter({});
      const workspaces = await base44.asServiceRole.entities.Workspace.filter({});
      const wsMap = Object.fromEntries(workspaces.map(w => [w.id, w]));

      const results = integrations.map(i => ({
        ...i,
        workspace_name: wsMap[i.workspace_id]?.name || 'Unknown',
        workspace_slug: wsMap[i.workspace_id]?.slug || '',
      }));

      return Response.json({ status: 'success', integrations: results });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("platformAdmin error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});