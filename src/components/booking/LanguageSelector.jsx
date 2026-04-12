import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LOCALES } from '@/lib/i18n/locales';

export default function LanguageSelector({ languages, currentLocale, onChange }) {
  if (!languages || languages.length <= 1) return null;

  const handleChange = (val) => {
    // Update URL param to persist language choice
    const url = new URL(window.location.href);
    if (val === 'en') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', val);
    }
    window.history.replaceState({}, '', url.toString());
    onChange?.(val);
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={currentLocale} onValueChange={handleChange}>
        <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-0 bg-transparent shadow-none px-1.5 gap-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map(code => {
            const meta = SUPPORTED_LOCALES[code];
            return (
              <SelectItem key={code} value={code}>
                {meta?.nativeName || code}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}