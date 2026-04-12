import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Save, Info } from 'lucide-react';

export default function TaxSettingsTab({ workspace, onSave, saving }) {
  const [form, setForm] = useState({
    tax_mode: 'none',
    tax_label: '',
    tax_rate_percent: 0,
    tax_registration_number: '',
  });

  useEffect(() => {
    if (!workspace) return;
    setForm({
      tax_mode: workspace.tax_mode || 'none',
      tax_label: workspace.tax_label || '',
      tax_rate_percent: workspace.tax_rate_percent || 0,
      tax_registration_number: workspace.tax_registration_number || '',
    });
  }, [workspace]);

  const handleSubmit = () => onSave(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Configuration</CardTitle>
        <CardDescription>
          Configure how tax is calculated and displayed on orders. Events can inherit these defaults or override them individually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How tax modes work</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>None</strong> — No tax calculated or displayed</li>
              <li><strong>Inclusive</strong> — Ticket prices already include tax (common in EU, AU, NZ)</li>
              <li><strong>Exclusive</strong> — Tax added on top of ticket prices (common in US, CA)</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tax Mode</Label>
            <Select value={form.tax_mode} onValueChange={v => setForm(f => ({ ...f, tax_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Tax</SelectItem>
                <SelectItem value="inclusive">Tax Inclusive (price includes tax)</SelectItem>
                <SelectItem value="exclusive">Tax Exclusive (tax added on top)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tax Label</Label>
            <Input
              value={form.tax_label}
              onChange={e => setForm(f => ({ ...f, tax_label: e.target.value }))}
              placeholder="e.g. GST, VAT, Sales Tax, HST"
              disabled={form.tax_mode === 'none'}
            />
            <p className="text-xs text-muted-foreground">Displayed to buyers on checkout and receipts</p>
          </div>

          <div className="space-y-1.5">
            <Label>Default Tax Rate (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.tax_rate_percent}
              onChange={e => setForm(f => ({ ...f, tax_rate_percent: parseFloat(e.target.value) || 0 }))}
              disabled={form.tax_mode === 'none'}
            />
            <p className="text-xs text-muted-foreground">
              {form.tax_mode === 'inclusive'
                ? `${form.tax_label || 'Tax'} is embedded in the ticket price`
                : form.tax_mode === 'exclusive'
                ? `${form.tax_rate_percent}% ${form.tax_label || 'Tax'} will be added at checkout`
                : 'Enable a tax mode to configure rates'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Tax Registration Number</Label>
            <Input
              value={form.tax_registration_number}
              onChange={e => setForm(f => ({ ...f, tax_registration_number: e.target.value }))}
              placeholder="e.g. ABN, VAT ID, EIN"
            />
            <p className="text-xs text-muted-foreground">Shown on invoices and receipts</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Tax Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}