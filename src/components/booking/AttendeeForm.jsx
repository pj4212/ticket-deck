import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Monitor, MapPin, UserCheck } from "lucide-react";
import CustomFieldInput from "./CustomFieldInput";

export default function AttendeeForm({
  index, total, ticketTypeName, attendanceMode, attendee, onChange,
  isBuyerSlot = false, emailOptional = false, customFields = [],
  errors = {}
}) {
  const update = (field, value) => onChange({ [field]: value });
  const updateCustom = (key, value) => {
    onChange({ custom_fields: { ...(attendee.custom_fields || {}), [key]: value } });
  };

  const isOnline = attendanceMode === 'online';
  const ModeIcon = isOnline ? Monitor : MapPin;
  const modeLabel = isOnline ? 'Online' : 'In-Person';
  const modeColor = isOnline ? 'text-blue-500' : 'text-emerald-500';

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      errors._hasErrors ? 'border-destructive/50' : isBuyerSlot ? 'border-primary/30' : 'border-border'
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Ticket {index + 1}
            {total > 1 && <span className="text-muted-foreground font-normal"> of {total}</span>}
          </span>
          <span className="text-xs text-muted-foreground">— {ticketTypeName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ModeIcon className={`h-3.5 w-3.5 ${modeColor}`} />
          <Badge variant="outline" className="text-xs">{modeLabel}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isBuyerSlot && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg px-3 py-2 -mt-1 mb-1">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span>Auto-filled from your details above</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">First Name <span className="text-destructive">*</span></Label>
            <Input
              value={attendee.first_name}
              onChange={e => update('first_name', e.target.value)}
              disabled={isBuyerSlot}
              className={errors.first_name ? 'border-destructive' : ''}
              placeholder="First name"
            />
            {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
          </div>
          <div>
            <Label className="text-sm">Last Name <span className="text-destructive">*</span></Label>
            <Input
              value={attendee.last_name}
              onChange={e => update('last_name', e.target.value)}
              disabled={isBuyerSlot}
              className={errors.last_name ? 'border-destructive' : ''}
              placeholder="Last name"
            />
            {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
          </div>
        </div>

        {(!emailOptional || isBuyerSlot) && (
          <div>
            <Label className="text-sm">Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={attendee.email}
              onChange={e => update('email', e.target.value)}
              disabled={isBuyerSlot}
              className={errors.email ? 'border-destructive' : ''}
              placeholder="attendee@example.com"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
        )}

        {/* Custom fields */}
        {customFields.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            {customFields.map(field => (
              <CustomFieldInput
                key={field.id}
                field={field}
                value={attendee.custom_fields?.[field.field_key] || ''}
                onChange={v => updateCustom(field.field_key, v)}
                error={errors[`cf_${field.field_key}`]}
              />
            ))}
          </div>
        )}

        {/* Duplicate warning */}
        {errors._duplicate && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
            <span>⚠️ {errors._duplicate}</span>
          </div>
        )}
      </div>
    </div>
  );
}