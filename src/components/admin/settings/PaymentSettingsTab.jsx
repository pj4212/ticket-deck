import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useWorkspace from '@/hooks/useWorkspace';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, CheckCircle, AlertCircle, Settings } from 'lucide-react';

export default function PaymentSettingsTab({ workspace, onSave, saving }) {
  const { workspaceId } = useWorkspace();
  const [integrations, setIntegrations] = useState([]);
  const [loadingInt, setLoadingInt] = useState(true);

  const [methods, setMethods] = useState({
    stripe: true,
    cash: false,
    bank_transfer: false,
    card_external: false,
  });

  useEffect(() => {
    if (!workspaceId) return;
    base44.entities.WorkspaceIntegration.filter({ workspace_id: workspaceId }).then(ints => {
      setIntegrations(ints);
      setLoadingInt(false);
    });
  }, [workspaceId]);

  useEffect(() => {
    if (!workspace?.supported_payment_methods_json) return;
    try {
      const parsed = JSON.parse(workspace.supported_payment_methods_json);
      if (parsed && typeof parsed === 'object') setMethods(prev => ({ ...prev, ...parsed }));
    } catch (_) {}
  }, [workspace]);

  const handleSaveMethods = () => {
    onSave({ supported_payment_methods_json: JSON.stringify(methods) });
  };

  const paymentProviders = integrations.filter(i =>
    ['stripe', 'stripe_connect', 'paypal', 'square', 'adyen'].includes(i.provider)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            Connected payment integrations for this workspace. Configure providers in the Integrations page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInt ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : paymentProviders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No payment providers configured</p>
              <p className="text-sm mt-1">Go to Settings → Integrations to connect Stripe or another provider.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentProviders.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium capitalize">{p.provider.replace('_', ' ')}</p>
                      {p.provider_region && (
                        <p className="text-xs text-muted-foreground">Region: {p.provider_region}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.health_status === 'healthy' ? (
                      <Badge className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Healthy
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <AlertCircle className="w-3 h-3" /> {p.health_status || 'Unknown'}
                      </Badge>
                    )}
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accepted Payment Methods</CardTitle>
          <CardDescription>
            Enable payment methods available for manual/box-office orders. Online checkout uses the connected provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'stripe', label: 'Online Card Payment (Stripe)', desc: 'For online checkout' },
            { key: 'cash', label: 'Cash', desc: 'For box office / door sales' },
            { key: 'bank_transfer', label: 'Bank Transfer', desc: 'Manual payment reconciliation' },
            { key: 'card_external', label: 'External Card Terminal', desc: 'For in-person card payments' },
          ].map(m => (
            <div key={m.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
              <Switch
                checked={methods[m.key] || false}
                onCheckedChange={v => setMethods(prev => ({ ...prev, [m.key]: v }))}
              />
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveMethods} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Payment Methods'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}