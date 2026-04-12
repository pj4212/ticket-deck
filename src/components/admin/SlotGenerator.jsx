import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Loader2 } from 'lucide-react';
import { format, addDays, parseISO, eachDayOfInterval } from 'date-fns';

export default function SlotGenerator({ eventId, defaultCapacity, onGenerated }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [interval, setInterval] = useState(30);
  const [capacity, setCapacity] = useState(defaultCapacity || 20);
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [generating, setGenerating] = useState(false);

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (d) => {
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const generateSlots = () => {
    if (!dateFrom || !dateTo || !startTime || !endTime) return [];
    const days = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) });
    const slots = [];

    for (const day of days) {
      const dayOfWeek = day.getDay();
      if (!daysOfWeek.includes(dayOfWeek)) continue;

      const slotDate = format(day, 'yyyy-MM-dd');
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      for (let m = startMins; m + interval <= endMins; m += interval) {
        const sH = Math.floor(m / 60);
        const sM = m % 60;
        const eH = Math.floor((m + interval) / 60);
        const eM = (m + interval) % 60;
        slots.push({
          event_id: eventId,
          slot_date: slotDate,
          start_time: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
          end_time: `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`,
          capacity: capacity,
          booked: 0,
          is_active: true,
        });
      }
    }
    return slots;
  };

  const handleGenerate = async () => {
    const slots = generateSlots();
    if (slots.length === 0) return;
    setGenerating(true);
    await onGenerated(slots);
    setGenerating(false);
  };

  const preview = generateSlots();

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-card">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Generate Slots</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To Date</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Start Time</Label>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">End Time</Label>
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Interval (min)</Label>
          <Select value={String(interval)} onValueChange={v => setInterval(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[15, 30, 45, 60, 90, 120].map(v => (
                <SelectItem key={v} value={String(v)}>{v} min</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Capacity per Slot</Label>
        <Input type="number" min="1" value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="max-w-[120px]" />
      </div>

      <div>
        <Label className="text-xs mb-1.5 block">Days</Label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`w-9 h-9 rounded-full text-xs font-semibold transition-colors ${
                daysOfWeek.includes(i)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {preview.length > 0 && (
        <p className="text-xs text-muted-foreground">
          This will create <span className="font-semibold text-foreground">{preview.length}</span> slots across {new Set(preview.map(s => s.slot_date)).size} days.
        </p>
      )}

      <Button onClick={handleGenerate} disabled={generating || preview.length === 0} className="gap-1.5">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        Generate {preview.length} Slots
      </Button>
    </div>
  );
}