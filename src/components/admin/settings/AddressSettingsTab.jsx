import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Save, Info } from 'lucide-react';

const DEFAULT_ADDRESS_CONFIG = {
  collect_address: false,
  require_postal_code: false,
  require_state: false,
  require_country: true,
  require_company: false,
  require_tax_number: false,
  postal_code_label: 'Postal / ZIP code',
  state_label: 'State / Province',
  show_address_line_2: true,
};

export default function AddressSettingsTab({ workspace, onSave, saving }) {
  const [config, setConfig] = useState(DEFAULT_ADDRESS_CONFIG);

  useEffect(() => {
    if (!workspace?.address_format_json) return;
    try {
      const parsed = JSON.parse(workspace.address_format_json);
      if (parsed && typeof parsed === 'object') {
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (_) {}
  }, [workspace]);

  const handleSubmit = () => {
    onSave({ address_format_json: JSON.stringify(config) });
  };

  const toggleField = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Address & Contact Format</CardTitle>
        <CardDescription>
          Configure which address and business fields to collect from buyers during checkout.
          Different regions have different requirements — customize to match your locale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            These settings control the checkout form. Buyers will see the fields you enable here.
            For tax compliance in some regions, you may need to collect a billing address and tax number.
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: 'collect_address', label: 'Collect Billing Address', desc: 'Show address fields on checkout' },
            { key: 'show_address_line_2', label: 'Show Address Line 2', desc: 'Apartment, suite, unit, building' },
            { key: 'require_postal_code', label: 'Require Postal / ZIP Code', desc: 'Make postal code mandatory' },
            { key: 'require_state', label: 'Require State / Province', desc: 'Make state field mandatory' },
            { key: 'require_country', label: 'Require Country', desc: 'Make country selection mandatory' },
            { key: 'require_company', label: 'Collect Company Name', desc: 'Show company field on checkout' },
            { key: 'require_tax_number', label: 'Collect Tax / VAT Number', desc: 'Show tax ID field on checkout' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={config[item.key] || false} onCheckedChange={() => toggleField(item.key)} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label>Postal Code Label</Label>
            <Input
              value={config.postal_code_label}
              onChange={e => setConfig(prev => ({ ...prev, postal_code_label: e.target.value }))}
              placeholder="Postal / ZIP code"
            />
            <p className="text-xs text-muted-foreground">Customize for your region: "ZIP Code", "Postcode", "Pin Code", etc.</p>
          </div>
          <div className="space-y-1.5">
            <Label>State / Province Label</Label>
            <Input
              value={config.state_label}
              onChange={e => setConfig(prev => ({ ...prev, state_label: e.target.value }))}
              placeholder="State / Province"
            />
            <p className="text-xs text-muted-foreground">Customize: "State", "Province", "Region", "Prefecture", etc.</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Address Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}