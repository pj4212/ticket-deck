import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const FEATURE_FLAGS = [
  { key: 'custom_domains', label: 'Custom Domains', description: 'Use own domain for event pages' },
  { key: 'advanced_reporting', label: 'Advanced Reporting', description: 'Detailed analytics and CSV export' },
  { key: 'recurring_automation', label: 'Recurring Events', description: 'Auto-create sessions on schedule' },
  { key: 'offline_scanner', label: 'Offline Scanner', description: 'Scan tickets without internet' },
  { key: 'api_access', label: 'API Access', description: 'REST API for third-party integrations' },
  { key: 'white_label_email', label: 'White-Label Email', description: 'Custom email branding and sender' },
  { key: 'zoom_integration', label: 'Zoom Integration', description: 'Auto-create webinars and track attendance' },
  { key: 'multi_location', label: 'Multi-Location', description: 'Manage events across multiple venues' },
];

export default function PlatformFeatureFlags() {
  const { isReadOnly } = useOutletContext();
  const [subscriptions, setSubscriptions] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [s, w, p] = await Promise.all([
      base44.entities.WorkspaceSubscription.filter({}),
      base44.entities.Workspace.filter({}),
      base44.entities.SubscriptionPlan.filter({}),
    ]);
    setSubscriptions(s);
    setWorkspaces(w);
    setPlans(p);
    setLoading(false);
  }

  const wsMap = Object.fromEntries(workspaces.map(w => [w.id, w]));
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

  const getFlags = (sub) => {
    const planFlags = safeJSON(planMap[sub.plan_id]?.feature_flags_json);
    const overrides = safeJSON(sub.feature_overrides_json);
    return { ...planFlags, ...overrides };
  };

  const safeJSON = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

  const toggleFlag = async (sub, key, current) => {
    setSaving(`${sub.id}-${key}`);
    const overrides = safeJSON(sub.feature_overrides_json);
    overrides[key] = !current;

    await base44.functions.invoke('platformAdmin', {
      action: 'update_feature_flags',
      subscription_id: sub.id,
      feature_overrides: overrides,
    });

    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, feature_overrides_json: JSON.stringify(overrides) } : s));
    setSaving(null);
    toast.success(`${key} ${!current ? 'enabled' : 'disabled'}`);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Feature Flags & Entitlements</h1>
        <p className="text-sm text-muted-foreground">Toggle features per workspace subscription. Overrides persist across plan changes.</p>
      </div>

      {subscriptions.length === 0 && <p className="text-center text-muted-foreground py-8">No subscriptions to manage</p>}

      {subscriptions.map(sub => {
        const ws = wsMap[sub.workspace_id];
        const plan = planMap[sub.plan_id];
        const flags = getFlags(sub);
        const overrides = safeJSON(sub.feature_overrides_json);

        return (
          <div key={sub.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{ws?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">Plan: {plan?.name || 'None'} · {sub.billing_status}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {FEATURE_FLAGS.map(ff => {
                const enabled = !!flags[ff.key];
                const isOverride = ff.key in overrides;
                const isSaving = saving === `${sub.id}-${ff.key}`;

                return (
                  <div key={ff.key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ff.label}</p>
                        {isOverride && <Badge variant="outline" className="text-xs">Override</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{ff.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch checked={enabled} onCheckedChange={() => !isReadOnly && toggleFlag(sub, ff.key, enabled)} disabled={isReadOnly || isSaving} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}