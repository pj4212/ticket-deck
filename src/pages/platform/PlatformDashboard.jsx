import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, CreditCard, Ticket, DollarSign, AlertTriangle, Plug,
  TrendingUp, Users, Loader2, ChevronRight, ShieldAlert, XCircle
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const card = (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {to && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold mt-3">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function PlatformDashboard() {
  const { platformUser } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [res, alertsData] = await Promise.all([
        base44.functions.invoke('platformAdmin', { action: 'get_stats' }),
        base44.entities.PlatformAlert.filter({ status: 'open' }),
      ]);
      if (res.data.status === 'success') setStats(res.data.stats);
      setAlerts(alertsData.sort((a, b) => {
        const sev = { critical: 0, high: 1, medium: 2, low: 3 };
        return (sev[a.severity] || 3) - (sev[b.severity] || 3);
      }).slice(0, 10));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const s = stats || {};
  const fmtCurrency = (v) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {platformUser?.name || 'Admin'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Total Workspaces" value={s.total_workspaces || 0} sub={`${s.active_workspaces || 0} active · ${s.suspended_workspaces || 0} suspended`} color="bg-blue-500/15 text-blue-400" to="/platform/workspaces" />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={s.active_subscriptions || 0} sub={s.past_due_subscriptions > 0 ? `${s.past_due_subscriptions} past due` : 'All current'} color="bg-emerald-500/15 text-emerald-400" to="/platform/subscriptions" />
        <StatCard icon={Ticket} label="Total Tickets" value={(s.total_tickets || 0).toLocaleString()} sub={`${s.checked_in_tickets || 0} checked in`} color="bg-purple-500/15 text-purple-400" />
        <StatCard icon={DollarSign} label="GMV (30d)" value={fmtCurrency(s.gmv_30d)} sub={`${s.total_orders || 0} total orders`} color="bg-yellow-500/15 text-yellow-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={XCircle} label="Failed Payments (30d)" value={s.failed_payments_30d || 0} color="bg-red-500/15 text-red-400" to="/platform/risk" />
        <StatCard icon={TrendingUp} label="Refunded Orders (30d)" value={s.refunded_orders_30d || 0} color="bg-orange-500/15 text-orange-400" to="/platform/risk" />
        <StatCard icon={Plug} label="Unhealthy Integrations" value={s.unhealthy_integrations || 0} color="bg-rose-500/15 text-rose-400" to="/platform/integrations" />
        <StatCard icon={AlertTriangle} label="Open Alerts" value={s.open_alerts || 0} color="bg-amber-500/15 text-amber-400" to="/platform/risk" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Alerts</h2>
            <Button variant="ghost" size="sm" asChild><Link to="/platform/risk">View All <ChevronRight className="h-4 w-4 ml-1" /></Link></Button>
          </div>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
                <ShieldAlert className={`h-5 w-5 shrink-0 mt-0.5 ${a.severity === 'critical' ? 'text-red-400' : a.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{a.title}</p>
                    <Badge variant="outline" className="text-xs shrink-0">{a.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}