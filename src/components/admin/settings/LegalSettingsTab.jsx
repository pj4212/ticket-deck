import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, ExternalLink } from 'lucide-react';

export default function LegalSettingsTab({ workspace, onSave, saving }) {
  const [form, setForm] = useState({
    legal_privacy_url: '',
    legal_terms_url: '',
    legal_refund_url: '',
    legal_footer_text: '',
    support_email: '',
    reply_to_email: '',
  });

  useEffect(() => {
    if (!workspace) return;
    setForm({
      legal_privacy_url: workspace.legal_privacy_url || '',
      legal_terms_url: workspace.legal_terms_url || '',
      legal_refund_url: workspace.legal_refund_url || '',
      legal_footer_text: workspace.legal_footer_text || '',
      support_email: workspace.support_email || '',
      reply_to_email: workspace.reply_to_email || '',
    });
  }, [workspace]);

  const handleSubmit = () => onSave(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal & Compliance</CardTitle>
        <CardDescription>
          Configure legal links, email contacts, and compliance footer text.
          These appear on checkout pages, order confirmations, and emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Privacy Policy URL</Label>
            <Input
              value={form.legal_privacy_url}
              onChange={e => setForm(f => ({ ...f, legal_privacy_url: e.target.value }))}
              placeholder="https://yoursite.com/privacy"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Terms of Service URL</Label>
            <Input
              value={form.legal_terms_url}
              onChange={e => setForm(f => ({ ...f, legal_terms_url: e.target.value }))}
              placeholder="https://yoursite.com/terms"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Refund Policy URL</Label>
            <Input
              value={form.legal_refund_url}
              onChange={e => setForm(f => ({ ...f, legal_refund_url: e.target.value }))}
              placeholder="https://yoursite.com/refunds"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Support Email</Label>
            <Input
              type="email"
              value={form.support_email}
              onChange={e => setForm(f => ({ ...f, support_email: e.target.value }))}
              placeholder="support@yourorg.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reply-To Email</Label>
            <Input
              type="email"
              value={form.reply_to_email}
              onChange={e => setForm(f => ({ ...f, reply_to_email: e.target.value }))}
              placeholder="hello@yourorg.com"
            />
            <p className="text-xs text-muted-foreground">Used as the reply-to address on all outgoing emails</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Legal Footer Text</Label>
          <Textarea
            value={form.legal_footer_text}
            onChange={e => setForm(f => ({ ...f, legal_footer_text: e.target.value }))}
            placeholder="© 2025 Your Organization. All rights reserved. ABN: 12 345 678 901"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">Appears at the bottom of all outgoing emails and receipts</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Legal Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}