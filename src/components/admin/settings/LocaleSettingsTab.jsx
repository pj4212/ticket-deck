import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getLocaleOptions } from '@/lib/i18n/locales';
import { getCurrencyOptions } from '@/lib/formatters';
import { getCountryOptions, TIMEZONE_OPTIONS } from '@/lib/countries';
import { Save } from 'lucide-react';

export default function LocaleSettingsTab({ workspace, onSave, saving }) {
  const [form, setForm] = useState({
    default_country: '',
    default_language: 'en',
    default_currency: 'USD',
    default_timezone: '',
    default_date_format: 'DD MMM YYYY',
    default_number_format: 'en-US',
    default_phone_country_code: '',
    sender_locale: 'en',
  });

  useEffect(() => {
    if (!workspace) return;
    setForm({
      default_country: workspace.default_country || '',
      default_language: workspace.default_language || 'en',
      default_currency: workspace.default_currency || 'USD',
      default_timezone: workspace.default_timezone || '',
      default_date_format: workspace.default_date_format || 'DD MMM YYYY',
      default_number_format: workspace.default_number_format || 'en-US',
      default_phone_country_code: workspace.default_phone_country_code || '',
      sender_locale: workspace.sender_locale || 'en',
    });
  }, [workspace]);

  const handleSubmit = () => onSave(form);

  const localeOptions = getLocaleOptions();
  const currencyOptions = getCurrencyOptions();
  const countryOptions = getCountryOptions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locale & Regional Settings</CardTitle>
        <CardDescription>
          Set the default country, language, currency, and timezone for your workspace.
          These defaults apply to all events unless overridden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Default Country</Label>
            <Select value={form.default_country} onValueChange={v => setForm(f => ({ ...f, default_country: v }))}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countryOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Default Language</Label>
            <Select value={form.default_language} onValueChange={v => setForm(f => ({ ...f, default_language: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {localeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Default Currency</Label>
            <Select value={form.default_currency} onValueChange={v => setForm(f => ({ ...f, default_currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencyOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Default Timezone</Label>
            <Select value={form.default_timezone} onValueChange={v => setForm(f => ({ ...f, default_timezone: v }))}>
              <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Number Format Locale</Label>
            <Select value={form.default_number_format} onValueChange={v => setForm(f => ({ ...f, default_number_format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">1,234.56 (English US)</SelectItem>
                <SelectItem value="en-GB">1,234.56 (English UK)</SelectItem>
                <SelectItem value="en-AU">1,234.56 (English AU)</SelectItem>
                <SelectItem value="de-DE">1.234,56 (German)</SelectItem>
                <SelectItem value="fr-FR">1 234,56 (French)</SelectItem>
                <SelectItem value="es-ES">1.234,56 (Spanish)</SelectItem>
                <SelectItem value="pt-BR">1.234,56 (Portuguese BR)</SelectItem>
                <SelectItem value="ja-JP">1,234 (Japanese)</SelectItem>
                <SelectItem value="zh-CN">1,234.56 (Chinese)</SelectItem>
                <SelectItem value="ko-KR">1,234 (Korean)</SelectItem>
                <SelectItem value="ar-SA">١٬٢٣٤٫٥٦ (Arabic)</SelectItem>
                <SelectItem value="hi-IN">1,23,456 (Hindi)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Default Phone Country Code</Label>
            <Input
              value={form.default_phone_country_code}
              onChange={e => setForm(f => ({ ...f, default_phone_country_code: e.target.value }))}
              placeholder="+1, +44, +61, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date Format</Label>
            <Select value={form.default_date_format} onValueChange={v => setForm(f => ({ ...f, default_date_format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD MMM YYYY">15 Jun 2025</SelectItem>
                <SelectItem value="MMM DD, YYYY">Jun 15, 2025</SelectItem>
                <SelectItem value="YYYY-MM-DD">2025-06-15</SelectItem>
                <SelectItem value="DD/MM/YYYY">15/06/2025</SelectItem>
                <SelectItem value="MM/DD/YYYY">06/15/2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Email Sender Language</Label>
            <Select value={form.sender_locale} onValueChange={v => setForm(f => ({ ...f, sender_locale: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {localeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Locale Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}