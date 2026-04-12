import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Palette, Mail, Image, Type } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailBrandingConfig({ workspaceId }) {
  const [workspace, setWorkspace] = useState(null);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    sender_name: '',
    support_email: '',
    logo_url: '',
    primary_color: '#0f172a',
    secondary_color: '#818cf8',
    email_footer_text: '',
  });

  useEffect(() => {
    async function load() {
      if (!workspaceId) { setLoading(false); return; }
      const [wsList, themes] = await Promise.all([
        base44.entities.Workspace.filter({ id: workspaceId }),
        base44.entities.BrandTheme.filter({ workspace_id: workspaceId }),
      ]);
      const ws = wsList[0];
      const t = themes[0];
      setWorkspace(ws);
      setTheme(t);
      setForm({
        sender_name: ws?.sender_name || ws?.name || '',
        support_email: ws?.support_email || '',
        logo_url: t?.logo_url || ws?.logo_url || '',
        primary_color: t?.primary_color || '#0f172a',
        secondary_color: t?.secondary_color || '#818cf8',
        email_footer_text: t?.email_footer_text || '',
      });
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const handleSave = async () => {
    setSaving(true);
    // Update workspace
    if (workspace) {
      await base44.entities.Workspace.update(workspace.id, {
        sender_name: form.sender_name,
        support_email: form.support_email,
      });
    }
    // Update or create BrandTheme
    const themeData = {
      workspace_id: workspaceId,
      logo_url: form.logo_url,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      email_footer_text: form.email_footer_text,
    };
    if (theme) {
      await base44.entities.BrandTheme.update(theme.id, themeData);
    } else {
      const created = await base44.entities.BrandTheme.create(themeData);
      setTheme(created);
    }
    toast.success('Email branding saved');
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Email Branding</h2>
          <p className="text-sm text-muted-foreground">Configure how your transactional emails look to attendees.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sender identity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" />Sender Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Sender Name</Label>
              <Input value={form.sender_name} onChange={e => setForm(p => ({ ...p, sender_name: e.target.value }))} placeholder="My Organisation" />
              <p className="text-xs text-muted-foreground mt-1">Shown as the "from" name on emails.</p>
            </div>
            <div>
              <Label className="text-xs">Support Email (reply-to)</Label>
              <Input type="email" value={form.support_email} onChange={e => setForm(p => ({ ...p, support_email: e.target.value }))} placeholder="support@example.com" />
              <p className="text-xs text-muted-foreground mt-1">Displayed in email footer. Attendees can reply to this address.</p>
            </div>
          </CardContent>
        </Card>

        {/* Visual brand */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4" />Visual Brand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Logo</Label>
              <div className="flex items-center gap-3">
                {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-8 max-w-[120px] object-contain rounded" />}
                <div>
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
                  <p className="text-xs text-muted-foreground mt-1">Recommended: PNG or SVG, max 200px wide.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email header background & buttons.</p>
              </div>
              <div>
                <Label className="text-xs">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Accent links & highlights.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer text */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Type className="h-4 w-4" />Email Footer</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={form.email_footer_text} onChange={e => setForm(p => ({ ...p, email_footer_text: e.target.value }))} placeholder="e.g. ABN 12 345 678 901 · PO Box 1234, Brisbane QLD 4000" rows={2} />
          <p className="text-xs text-muted-foreground mt-1">Custom text shown at the bottom of every email. Good for legal info, address, or ABN.</p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border" style={{ maxWidth: 400 }}>
            <div style={{ background: form.primary_color, padding: '20px', textAlign: 'center' }}>
              {form.logo_url ? <img src={form.logo_url} alt="Logo" style={{ height: 28, margin: '0 auto 8px' }} /> : <p style={{ color: form.secondary_color, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>{form.sender_name || 'Your Organisation'}</p>}
              <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Booking Confirmed ✓</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '4px 0 0' }}>Order #TD-1234</p>
            </div>
            <div style={{ padding: 16, fontSize: 12, color: '#334155' }}>
              <p>Hi <strong>Sarah</strong>,</p>
              <p style={{ color: '#64748b' }}>Your booking is confirmed. Check your email for tickets.</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
              <p style={{ margin: 0 }}>Sent by {form.sender_name || 'Your Organisation'}</p>
              {form.support_email && <p style={{ margin: '2px 0 0' }}>Questions? <span style={{ color: form.secondary_color }}>{form.support_email}</span></p>}
              {form.email_footer_text && <p style={{ margin: '2px 0 0' }}>{form.email_footer_text}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}