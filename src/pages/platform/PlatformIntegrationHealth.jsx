import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Plug, Globe, Video, CreditCard, Mail, CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

const PROVIDER_CONFIG = {
  stripe: { icon: CreditCard, label: 'Stripe', color: 'text-purple-400' },
  zoom: { icon: Video, label: 'Zoom', color: 'text-blue-400' },
  resend: { icon: Mail, label: 'Email (Resend)', color: 'text-emerald-400' },
  custom_domain: { icon: Globe, label: 'Custom Domain', color: 'text-orange-400' },
};

const HEALTH_ICONS = {
  healthy: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  down: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
  unknown: { icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-secondary' },
};

export default function PlatformIntegrationHealth() {
  const [integrations, setIntegrations] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const [res, doms] = await Promise.all([
      base44.functions.invoke('platformAdmin', { action: 'integration_health' }),
      base44.entities.CustomDomain.filter({}),
    ]);
    if (res.data.status === 'success') setIntegrations(res.data.integrations);
    setDomains(doms);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Group by provider
  const byProvider = {};
  integrations.forEach(i => {
    if (!byProvider[i.provider]) byProvider[i.provider] = [];
    byProvider[i.provider].push(i);
  });

  const healthySummary = integrations.filter(i => i.health_status === 'healthy' || i.status === 'active').length;
  const degradedSummary = integrations.filter(i => i.health_status === 'degraded').length;
  const downSummary = integrations.filter(i => i.health_status === 'down' || i.status === 'error' || i.status === 'revoked').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Integration Health</h1>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
          <p className="text-2xl font-bold mt-2">{healthySummary}</p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-yellow-400 mx-auto" />
          <p className="text-2xl font-bold mt-2">{degradedSummary}</p>
          <p className="text-xs text-muted-foreground">Degraded</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <XCircle className="h-6 w-6 text-red-400 mx-auto" />
          <p className="text-2xl font-bold mt-2">{downSummary}</p>
          <p className="text-xs text-muted-foreground">Down/Error</p>
        </div>
      </div>

      {/* By provider */}
      {Object.entries(byProvider).map(([provider, items]) => {
        const config = PROVIDER_CONFIG[provider] || { icon: Plug, label: provider, color: 'text-muted-foreground' };
        const Icon = config.icon;

        return (
          <div key={provider} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <h2 className="font-semibold">{config.label}</h2>
              <Badge variant="outline" className="text-xs">{items.length} connections</Badge>
            </div>

            {items.map(int => {
              const health = HEALTH_ICONS[int.health_status] || HEALTH_ICONS.unknown;
              const HealthIcon = health.icon;

              return (
                <div key={int.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${health.bg}`}>
                    <HealthIcon className={`h-5 w-5 ${health.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{int.workspace_name || 'Unknown'}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Status: {int.status}</span>
                      <span>Health: {int.health_status || 'unknown'}</span>
                      {int.last_checked_at && <span>Checked: {new Date(int.last_checked_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <Badge variant={int.status === 'active' ? 'default' : int.status === 'error' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                    {int.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        );
      })}

      {integrations.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No integrations configured across any workspace</p>
      )}

      {/* Custom Domains */}
      {domains.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-orange-400" />
            <h2 className="font-semibold">Custom Domains</h2>
            <Badge variant="outline" className="text-xs">{domains.length}</Badge>
          </div>
          {domains.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{d.domain}</p>
                <p className="text-xs text-muted-foreground">SSL: {d.ssl_status} · DNS verified: {d.dns_verified_at ? new Date(d.dns_verified_at).toLocaleDateString() : 'pending'}</p>
              </div>
              <Badge variant={d.status === 'active' ? 'default' : d.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">{d.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}