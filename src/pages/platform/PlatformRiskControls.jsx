import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, ShieldAlert, AlertTriangle, XCircle, CheckCircle2,
  Eye, RefreshCw, TrendingDown, Mail
} from 'lucide-react';
import { toast } from 'sonner';

const ALERT_ICONS = {
  high_refund_rate: TrendingDown, failed_webhook: XCircle, failed_payment: XCircle,
  email_bounce: Mail, email_complaint: Mail, suspicious_activity: ShieldAlert,
  integration_error: AlertTriangle, trial_expiring: AlertTriangle,
  subscription_past_due: AlertTriangle, capacity_warning: AlertTriangle,
};

const SEVERITY_COLORS = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function PlatformRiskControls() {
  const { isReadOnly } = useOutletContext();
  const [alerts, setAlerts] = useState([]);
  const [workspaces, setWorkspaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [acting, setActing] = useState(null);

  // Risk detection data
  const [riskData, setRiskData] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [al, ws, orders] = await Promise.all([
      base44.entities.PlatformAlert.filter({}),
      base44.entities.Workspace.filter({}),
      base44.entities.Order.filter({}),
    ]);

    setWorkspaces(Object.fromEntries(ws.map(w => [w.id, w])));
    setAlerts(al.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    }));

    // Calculate risk signals
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const recentOrders = orders.filter(o => o.created_date >= thirtyDaysAgo);

    // Refund rate per workspace
    const wsOrders = {};
    recentOrders.forEach(o => {
      if (!wsOrders[o.workspace_id]) wsOrders[o.workspace_id] = { total: 0, refunded: 0, failed: 0 };
      wsOrders[o.workspace_id].total++;
      if (['refunded', 'partially_refunded'].includes(o.payment_status)) wsOrders[o.workspace_id].refunded++;
      if (o.payment_status === 'failed') wsOrders[o.workspace_id].failed++;
    });

    const highRefund = Object.entries(wsOrders).filter(([_, d]) => d.total >= 5 && d.refunded / d.total > 0.15).map(([wsId, d]) => ({
      workspace: ws.find(w => w.id === wsId)?.name || wsId,
      rate: Math.round((d.refunded / d.total) * 100),
      total: d.total, refunded: d.refunded,
    }));

    const highFailure = Object.entries(wsOrders).filter(([_, d]) => d.total >= 3 && d.failed / d.total > 0.1).map(([wsId, d]) => ({
      workspace: ws.find(w => w.id === wsId)?.name || wsId,
      rate: Math.round((d.failed / d.total) * 100),
      total: d.total, failed: d.failed,
    }));

    setRiskData({ highRefund, highFailure });
    setLoading(false);
  }

  const handleResolve = async (alert, status) => {
    setActing(alert.id);
    await base44.functions.invoke('platformAdmin', { action: 'resolve_alert', alert_id: alert.id, resolution_status: status });
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status, resolved_at: new Date().toISOString() } : a));
    toast.success(`Alert ${status}`);
    setActing(null);
  };

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (typeFilter !== 'all' && a.alert_type !== typeFilter) return false;
    return true;
  });

  const alertTypes = [...new Set(alerts.map(a => a.alert_type))];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Risk & Abuse Controls</h1>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
      </div>

      {/* Risk Signals */}
      {riskData && (riskData.highRefund.length > 0 || riskData.highFailure.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Detected Risk Signals</h2>
          {riskData.highRefund.map((r, i) => (
            <div key={`ref-${i}`} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">High Refund Rate: {r.workspace}</p>
                <p className="text-xs text-muted-foreground">{r.rate}% refund rate ({r.refunded}/{r.total} orders in 30d)</p>
              </div>
            </div>
          ))}
          {riskData.highFailure.map((r, i) => (
            <div key={`fail-${i}`} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">High Payment Failure: {r.workspace}</p>
                <p className="text-xs text-muted-foreground">{r.rate}% failure rate ({r.failed}/{r.total} orders in 30d)</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'open', 'acknowledged', 'resolved', 'dismissed'].map(f => (
          <Button key={f} size="sm" onClick={() => setFilter(f)}
            className={filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}>
            {f === 'all' ? `All (${alerts.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${alerts.filter(a => a.status === f).length})`}
          </Button>
        ))}
        {alertTypes.length > 1 && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Type filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {alertTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {filtered.map(alert => {
          const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
          const ws = workspaces[alert.workspace_id];

          return (
            <div key={alert.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${
                  alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-orange-400' : alert.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <Badge className={`text-xs ${SEVERITY_COLORS[alert.severity] || ''}`}>{alert.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{alert.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  {ws && <p className="text-xs text-muted-foreground mt-0.5">Workspace: {ws.name}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-1">{alert.created_date ? new Date(alert.created_date).toLocaleString() : ''}</p>
                </div>
                {!isReadOnly && alert.status === 'open' && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleResolve(alert, 'acknowledged')} disabled={acting === alert.id}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleResolve(alert, 'resolved')} disabled={acting === alert.id}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No alerts match your filters</p>}
      </div>
    </div>
  );
}