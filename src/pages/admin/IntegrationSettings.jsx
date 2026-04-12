import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, Video, Mail, Globe, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function SettingField({ label, value, onChange, type = 'text', placeholder }) {
  const [show, setShow] = useState(false);
  const isSecret = type === 'password';
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input type={isSecret && !show ? 'password' : 'text'} value={value || ''} onChange={onChange} placeholder={placeholder} className="font-mono text-xs" />
        {isSecret && <Button variant="ghost" size="icon" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>}
      </div>
    </div>
  );
}

export default function IntegrationSettings() {
  const { workspaceId } = useOutletContext();
  const [settings, setSettings] = useState({});
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    if (!workspaceId) { setLoading(false); return; }
    const [ws, ints] = await Promise.all([
      base44.entities.WorkspaceSetting.filter({ workspace_id: workspaceId }),
      base44.entities.WorkspaceIntegration.filter({ workspace_id: workspaceId }),
    ]);
    const map = {};
    ws.forEach(s => { try { map[s.key] = JSON.parse(s.value_json); } catch { map[s.key] = s.value_json; } });
    setSettings(map);
    setIntegrations(ints);
    setLoading(false);
  }

  const saveSetting = async (key, value) => {
    const existing = await base44.entities.WorkspaceSetting.filter({ workspace_id: workspaceId, key });
    const valueJson = JSON.stringify(value);
    if (existing.length) {
      await base44.entities.WorkspaceSetting.update(existing[0].id, { value_json: valueJson });
    } else {
      await base44.entities.WorkspaceSetting.create({ workspace_id: workspaceId, key, value_json: valueJson, is_secret: key.includes('secret') || key.includes('key') });
    }
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveStripe = async () => {
    setSaving(true);
    await Promise.all([
      saveSetting('stripe_secret_key', settings.stripe_secret_key || ''),
      saveSetting('stripe_publishable_key', settings.stripe_publishable_key || ''),
      saveSetting('stripe_webhook_secret', settings.stripe_webhook_secret || ''),
    ]);

    // Update or create integration record
    const existing = integrations.find(i => i.provider === 'stripe');
    const hasKey = !!settings.stripe_secret_key;
    if (existing) {
      await base44.entities.WorkspaceIntegration.update(existing.id, {
        status: hasKey ? 'active' : 'not_configured',
        credentials_json_encrypted: JSON.stringify({ secret_key: settings.stripe_secret_key, publishable_key: settings.stripe_publishable_key }),
        health_status: hasKey ? 'healthy' : 'unknown',
      });
    } else if (hasKey) {
      await base44.entities.WorkspaceIntegration.create({
        workspace_id: workspaceId, provider: 'stripe', status: 'active', auth_mode: 'api_key',
        credentials_json_encrypted: JSON.stringify({ secret_key: settings.stripe_secret_key, publishable_key: settings.stripe_publishable_key }),
        health_status: 'healthy',
      });
    }
    toast.success('Stripe settings saved');
    setSaving(false); load();
  };

  const handleSaveZoom = async () => {
    setSaving(true);
    await Promise.all([
      saveSetting('zoom_account_id', settings.zoom_account_id || ''),
      saveSetting('zoom_client_id', settings.zoom_client_id || ''),
      saveSetting('zoom_client_secret', settings.zoom_client_secret || ''),
    ]);

    const existing = integrations.find(i => i.provider === 'zoom');
    const hasKey = !!settings.zoom_account_id;
    if (existing) {
      await base44.entities.WorkspaceIntegration.update(existing.id, {
        status: hasKey ? 'active' : 'not_configured',
        credentials_json_encrypted: JSON.stringify({ account_id: settings.zoom_account_id, client_id: settings.zoom_client_id, client_secret: settings.zoom_client_secret }),
        health_status: hasKey ? 'healthy' : 'unknown',
      });
    } else if (hasKey) {
      await base44.entities.WorkspaceIntegration.create({
        workspace_id: workspaceId, provider: 'zoom', status: 'active', auth_mode: 'api_key',
        credentials_json_encrypted: JSON.stringify({ account_id: settings.zoom_account_id, client_id: settings.zoom_client_id, client_secret: settings.zoom_client_secret }),
        health_status: 'healthy',
      });
    }
    toast.success('Zoom settings saved');
    setSaving(false); load();
  };

  const handleReconcile = async () => {
    setReconciling(true);
    const res = await base44.functions.invoke('stripeRefund', { action: 'reconcile', workspace_id: workspaceId });
    const d = res.data;
    toast.success(`Reconciled ${d.synced} orders. ${d.remaining > 0 ? `${d.remaining} remaining.` : ''}`);
    setReconciling(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const stripeInt = integrations.find(i => i.provider === 'stripe');
  const zoomInt = integrations.find(i => i.provider === 'zoom');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Integrations</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { provider: 'stripe', int: stripeInt, icon: CreditCard, label: 'Stripe', color: 'text-purple-400' },
          { provider: 'zoom', int: zoomInt, icon: Video, label: 'Zoom', color: 'text-blue-400' },
        ].map(({ provider, int, icon: Icon, label, color }) => (
          <div key={provider} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="font-semibold">{label}</span>
            </div>
            {int ? (
              <Badge variant={int.status === 'active' ? 'default' : 'destructive'} className="text-xs">{int.health_status || int.status}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Not configured</Badge>
            )}
          </div>
        ))}
      </div>

      <Tabs defaultValue="stripe">
        <TabsList><TabsTrigger value="stripe">Stripe</TabsTrigger><TabsTrigger value="zoom">Zoom</TabsTrigger></TabsList>

        <TabsContent value="stripe" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <SettingField label="Secret Key" value={settings.stripe_secret_key} onChange={e => setSettings(p => ({ ...p, stripe_secret_key: e.target.value }))} type="password" placeholder="sk_live_..." />
            <SettingField label="Publishable Key" value={settings.stripe_publishable_key} onChange={e => setSettings(p => ({ ...p, stripe_publishable_key: e.target.value }))} placeholder="pk_live_..." />
            <SettingField label="Webhook Secret" value={settings.stripe_webhook_secret} onChange={e => setSettings(p => ({ ...p, stripe_webhook_secret: e.target.value }))} type="password" placeholder="whsec_..." />
            <div className="flex gap-2">
              <Button onClick={handleSaveStripe} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save Stripe Settings</Button>
              {stripeInt?.status === 'active' && (
                <Button variant="outline" onClick={handleReconcile} disabled={reconciling}>
                  {reconciling ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                  Reconcile Fees
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Architecture note: Future migration to Stripe Connect will replace direct API keys with platform-level account references for multi-workspace billing.</p>
          </div>
        </TabsContent>

        <TabsContent value="zoom" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <SettingField label="Account ID" value={settings.zoom_account_id} onChange={e => setSettings(p => ({ ...p, zoom_account_id: e.target.value }))} placeholder="..." />
            <SettingField label="Client ID" value={settings.zoom_client_id} onChange={e => setSettings(p => ({ ...p, zoom_client_id: e.target.value }))} placeholder="..." />
            <SettingField label="Client Secret" value={settings.zoom_client_secret} onChange={e => setSettings(p => ({ ...p, zoom_client_secret: e.target.value }))} type="password" placeholder="..." />
            <Button onClick={handleSaveZoom} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save Zoom Settings</Button>
            <p className="text-xs text-muted-foreground">Architecture note: Future OAuth cleanup will migrate from S2S tokens to per-user OAuth flow for better workspace isolation.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}