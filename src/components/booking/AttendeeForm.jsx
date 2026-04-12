import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AttendeeForm({
  index, total, ticketTypeName, attendanceMode, attendee, onChange,
  isBuyerSlot = false, emailOptional = false, customFields = []
}) {
  const update = (field, value) => onChange({ [field]: value });
  const updateCustom = (key, value) => {
    onChange({ custom_fields: { ...(attendee.custom_fields || {}), [key]: value } });
  };

  const modeLabel = attendanceMode === 'online' ? 'Online' : 'In-Person';

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">
          Ticket {index + 1} of {total} — {ticketTypeName} ({modeLabel})
        </h4>
      </div>

      {isBuyerSlot && <p className="text-sm text-muted-foreground -mt-2">Auto-filled from buyer details</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First Name *</Label>
          <Input value={attendee.first_name} onChange={e => update('first_name', e.target.value)} disabled={isBuyerSlot} />
        </div>
        <div>
          <Label className="text-xs">Last Name *</Label>
          <Input value={attendee.last_name} onChange={e => update('last_name', e.target.value)} disabled={isBuyerSlot} />
        </div>
      </div>

      {!emailOptional && (
        <div>
          <Label className="text-xs">Email *</Label>
          <Input type="email" value={attendee.email} onChange={e => update('email', e.target.value)} disabled={isBuyerSlot} />
        </div>
      )}

      {/* Custom fields */}
      {customFields.map(field => (
        <CustomFieldInput key={field.id} field={field} value={attendee.custom_fields?.[field.field_key] || ''} onChange={v => updateCustom(field.field_key, v)} />
      ))}
    </div>
  );
}

function CustomFieldInput({ field, value, onChange }) {
  const required = field._required;
  const label = `${field.label}${required ? ' *' : ''}`;

  switch (field.field_type) {
    case 'dropdown':
      return (
        <div>
          <Label className="text-xs">{label}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={`Select ${field.label}...`} /></SelectTrigger>
            <SelectContent>
              {(field._options || []).map(opt => (
                <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.help_text && <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>}
        </div>
      );
    case 'radio':
      return (
        <div>
          <Label className="text-xs">{label}</Label>
          <div className="flex flex-wrap gap-3 mt-1">
            {(field._options || []).map(opt => (
              <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input type="radio" name={field.field_key} checked={value === opt.value} onChange={() => onChange(opt.value)} className="accent-primary" />
                {opt.label}
              </label>
            ))}
          </div>
          {field.help_text && <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>}
        </div>
      );
    case 'checkbox':
      return (
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={value === 'true' || value === true} onChange={e => onChange(e.target.checked ? 'true' : '')} className="mt-1 h-4 w-4 rounded border-input accent-primary" />
          <div><span className="text-sm font-medium">{field.label}</span>{field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}</div>
        </label>
      );
    case 'textarea':
      return (
        <div>
          <Label className="text-xs">{label}</Label>
          <Textarea value={value} onChange={e => onChange(e.target.value)} rows={2} />
          {field.help_text && <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>}
        </div>
      );
    default:
      return (
        <div>
          <Label className="text-xs">{label}</Label>
          <Input type={field.field_type === 'email' ? 'email' : field.field_type === 'number' ? 'number' : 'text'} value={value} onChange={e => onChange(e.target.value)} />
          {field.help_text && <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>}
        </div>
      );
  }
}