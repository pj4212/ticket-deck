import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomFieldInput({ field, value, onChange, error }) {
  const required = field._required;
  const label = field.label;
  const fieldId = `cf-${field.field_key}`;

  const labelEl = (
    <Label htmlFor={fieldId} className="text-sm">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
  );

  const helpText = field.help_text && (
    <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
  );
  const errorText = error && (
    <p className="text-xs text-destructive mt-1">{error}</p>
  );

  switch (field.field_type) {
    case 'dropdown':
      return (
        <div>
          {labelEl}
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger id={fieldId} className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder={`Select ${field.label}...`} />
            </SelectTrigger>
            <SelectContent>
              {(field._options || []).map(opt => (
                <SelectItem key={opt.id || opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helpText}
          {errorText}
        </div>
      );

    case 'radio':
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-3 mt-1.5">
            {(field._options || []).map(opt => (
              <label key={opt.id || opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name={fieldId}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="accent-primary h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {helpText}
          {errorText}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true' || value === true}
              onChange={e => onChange(e.target.checked ? 'true' : '')}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
            />
            <div>
              <span className="text-sm font-medium">{label}</span>
              {required && <span className="text-destructive ml-0.5">*</span>}
              {helpText}
            </div>
          </label>
          {errorText}
        </div>
      );

    case 'textarea':
      return (
        <div>
          {labelEl}
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className={error ? 'border-destructive' : ''}
            placeholder={field.help_text || ''}
          />
          {helpText && !field.help_text && helpText}
          {errorText}
        </div>
      );

    case 'date':
      return (
        <div>
          {labelEl}
          <Input
            id={fieldId}
            type="date"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
          />
          {helpText}
          {errorText}
        </div>
      );

    case 'number':
      return (
        <div>
          {labelEl}
          <Input
            id={fieldId}
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
            placeholder={field.help_text || ''}
          />
          {helpText && !field.help_text && helpText}
          {errorText}
        </div>
      );

    case 'email':
      return (
        <div>
          {labelEl}
          <Input
            id={fieldId}
            type="email"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
            placeholder={field.help_text || 'email@example.com'}
          />
          {helpText && !field.help_text && helpText}
          {errorText}
        </div>
      );

    default: // text
      return (
        <div>
          {labelEl}
          <Input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
            placeholder={field.help_text || ''}
          />
          {helpText && !field.help_text && helpText}
          {errorText}
        </div>
      );
  }
}