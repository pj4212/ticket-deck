import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Globe, DollarSign, Receipt } from 'lucide-react';
import { COMMON_CURRENCIES } from '@/lib/formatters';

const TAX_MODE_OPTIONS = [
  { value: 'inherit', label: 'Inherit from workspace', desc: 'Use workspace tax settings' },
  { value: 'inclusive', label: 'Inclusive', desc: 'Tax included in ticket price' },
  { value: 'exclusive', label: 'Exclusive', desc: 'Tax added at checkout' },
  { value: 'none', label: 'No tax', desc: 'Disable tax for this event' },
];

export default function EventFormStepRegional({ form, updateForm, workspace }) {
  const wsCurrency = workspace?.default_currency || 'USD';
  const wsTaxMode = workspace?.tax_mode || 'none';
  const wsTaxRate = workspace?.tax_rate_percent || 0;
  const wsTaxLabel = workspace?.tax_label || 'Tax';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Regional & Tax</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Override workspace defaults for this event. Leave blank to inherit from workspace settings.
      </p>

      {/* Currency Override */}
      <div>
        <Label className="text-sm flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" /> Currency Override
        </Label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Workspace default: <Badge variant="outline" className="text-xs ml-1">{wsCurrency}</Badge>
        </p>
        <Select value={form.currency || ''} onValueChange={v => updateForm('currency', v === '_inherit' ? '' : v)}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={`Inherit (${wsCurrency})`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_inherit">Inherit ({wsCurrency})</SelectItem>
            {COMMON_CURRENCIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tax Mode Override */}
      <div>
        <Label className="text-sm flex items-center gap-1.5">
          <Receipt className="h-4 w-4" /> Tax Mode
        </Label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Workspace default: <Badge variant="outline" className="text-xs ml-1">{wsTaxMode} ({wsTaxRate}% {wsTaxLabel})</Badge>
        </p>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {TAX_MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateForm('tax_mode_override', opt.value)}
              className={`p-3 border rounded-lg text-left transition-all ${
                (form.tax_mode_override || 'inherit') === opt.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tax Rate & Label Overrides */}
      {form.tax_mode_override && form.tax_mode_override !== 'inherit' && form.tax_mode_override !== 'none' && (
        <div className="grid grid-cols-2 gap-4 p-4 border border-primary/20 bg-primary/5 rounded-xl">
          <div>
            <Label className="text-xs">Tax Rate (%)</Label>
            <Input
              type="number" min="0" max="100" step="0.01"
              value={form.tax_rate_override ?? ''}
              onChange={e => updateForm('tax_rate_override', e.target.value ? Number(e.target.value) : null)}
              placeholder={`Inherit (${wsTaxRate}%)`}
            />
          </div>
          <div>
            <Label className="text-xs">Tax Label</Label>
            <Input
              value={form.tax_label_override || ''}
              onChange={e => updateForm('tax_label_override', e.target.value)}
              placeholder={`Inherit (${wsTaxLabel})`}
            />
          </div>
        </div>
      )}

      {/* Locale Override */}
      <div>
        <Label className="text-sm">Event Locale</Label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Override the language for buyer-facing pages of this event.
        </p>
        <Select value={form.locale || ''} onValueChange={v => updateForm('locale', v === '_inherit' ? '' : v)}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={`Inherit (${workspace?.default_language || 'en'})`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_inherit">Inherit ({workspace?.default_language || 'en'})</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="he">עברית</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}