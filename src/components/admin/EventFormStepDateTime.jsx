import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Repeat } from 'lucide-react';
import RecurrenceHelper from './RecurrenceHelper';

const TIMEZONES = [
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST, UTC+10)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
];

export default function EventFormStepDateTime({ form, updateForm }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Date & Time</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm">Event Date <span className="text-destructive">*</span></Label>
          <Input type="date" value={form.event_date} onChange={e => updateForm('event_date', e.target.value)} />
        </div>
        <div>
          <Label className="text-sm">Start Time <span className="text-destructive">*</span></Label>
          <Input type="datetime-local" value={form.start_datetime} onChange={e => updateForm('start_datetime', e.target.value)} />
        </div>
        <div>
          <Label className="text-sm">End Time <span className="text-destructive">*</span></Label>
          <Input type="datetime-local" value={form.end_datetime} onChange={e => updateForm('end_datetime', e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-sm">Timezone</Label>
        <Select value={form.timezone} onValueChange={v => updateForm('timezone', v)}>
          <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Recurrence */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Recurrence</Label>
        </div>
        <RecurrenceHelper
          value={form.recurrence_pattern || 'none'}
          onChange={v => updateForm('recurrence_pattern', v === 'none' ? '' : v)}
        />
      </div>

      {/* Sales window */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Sales Window</Label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Sales Open</Label>
            <Input type="datetime-local" value={form.sales_open_at || ''} onChange={e => updateForm('sales_open_at', e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to open immediately.</p>
          </div>
          <div>
            <Label className="text-sm">Sales Close</Label>
            <Input type="datetime-local" value={form.sales_close_at || ''} onChange={e => updateForm('sales_close_at', e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-close 1hr after event end.</p>
          </div>
        </div>
      </div>
    </div>
  );
}