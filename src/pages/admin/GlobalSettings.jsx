import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useWorkspace from '@/hooks/useWorkspace';
import LocaleSettingsTab from '@/components/admin/settings/LocaleSettingsTab';
import TaxSettingsTab from '@/components/admin/settings/TaxSettingsTab';
import PaymentSettingsTab from '@/components/admin/settings/PaymentSettingsTab';
import LegalSettingsTab from '@/components/admin/settings/LegalSettingsTab';
import AddressSettingsTab from '@/components/admin/settings/AddressSettingsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Globe, Receipt, CreditCard, Scale, MapPin } from 'lucide-react';

export default function GlobalSettings() {
  const { activeWorkspace, workspaceId, loading: wsLoading } = useWorkspace();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (wsLoading) return;
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.entities.Workspace.filter({ id: workspaceId }).then(ws => {
      setWorkspace(ws[0] || null);
      setLoading(false);
    });
  }, [workspaceId, wsLoading]);

  const handleSave = async (updates) => {
    if (!workspace) return;
    setSaving(true);
    await base44.entities.Workspace.update(workspace.id, updates);
    setWorkspace(prev => ({ ...prev, ...updates }));
    setSaving(false);
  };

  if (loading || wsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return <div className="p-6 text-muted-foreground">No workspace selected.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Global Settings</h1>
      <p className="text-muted-foreground mb-6">
        Configure locale, currency, tax, payments, and legal settings for your workspace.
      </p>

      <Tabs defaultValue="locale" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="locale" className="gap-1.5">
            <Globe className="w-4 h-4" /> Locale & Regional
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5">
            <Receipt className="w-4 h-4" /> Tax
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-1.5">
            <CreditCard className="w-4 h-4" /> Payment
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-1.5">
            <Scale className="w-4 h-4" /> Legal & Compliance
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-1.5">
            <MapPin className="w-4 h-4" /> Address Format
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locale">
          <LocaleSettingsTab workspace={workspace} onSave={handleSave} saving={saving} />
        </TabsContent>
        <TabsContent value="tax">
          <TaxSettingsTab workspace={workspace} onSave={handleSave} saving={saving} />
        </TabsContent>
        <TabsContent value="payment">
          <PaymentSettingsTab workspace={workspace} onSave={handleSave} saving={saving} />
        </TabsContent>
        <TabsContent value="legal">
          <LegalSettingsTab workspace={workspace} onSave={handleSave} saving={saving} />
        </TabsContent>
        <TabsContent value="address">
          <AddressSettingsTab workspace={workspace} onSave={handleSave} saving={saving} />
        </TabsContent>
      </Tabs>
    </div>
  );
}