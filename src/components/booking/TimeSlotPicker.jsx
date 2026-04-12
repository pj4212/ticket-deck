import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function TimeSlotPicker({ slots, selectedSlotId, onSelect, totalTickets }) {
  const activeSlots = useMemo(() => slots.filter(s => s.is_active), [slots]);

  // Get unique dates sorted
  const dates = useMemo(() => {
    const set = new Set(activeSlots.map(s => s.slot_date));
    return [...set].sort();
  }, [activeSlots]);

  const [selectedDate, setSelectedDate] = useState(dates[0] || '');
  const dateIdx = dates.indexOf(selectedDate);

  const daySlots = useMemo(() =>
    activeSlots
      .filter(s => s.slot_date === selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [activeSlots, selectedDate]
  );

  if (activeSlots.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed rounded-xl">
        <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No time slots available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Select a Time Slot</h2>
      </div>

      {/* Date navigation */}
      {dates.length > 1 && (
        <div className="flex items-center justify-between bg-card border rounded-lg px-3 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            disabled={dateIdx <= 0}
            onClick={() => setSelectedDate(dates[dateIdx - 1])}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {selectedDate ? format(parseISO(selectedDate), 'EEEE, d MMMM yyyy') : '—'}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            disabled={dateIdx >= dates.length - 1}
            onClick={() => setSelectedDate(dates[dateIdx + 1])}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {dates.length === 1 && (
        <p className="text-sm text-muted-foreground">
          {format(parseISO(dates[0]), 'EEEE, d MMMM yyyy')}
        </p>
      )}

      {/* Slots grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {daySlots.map(slot => {
          const remaining = Math.max(0, slot.capacity - (slot.booked || 0));
          const isFull = totalTickets > 0 ? remaining < totalTickets : remaining === 0;
          const isSelected = selectedSlotId === slot.id;

          return (
            <button
              key={slot.id}
              onClick={() => !isFull && onSelect(slot.id)}
              disabled={isFull}
              className={`relative p-3 border rounded-xl text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : isFull
                    ? 'border-border opacity-50 cursor-not-allowed'
                    : 'border-border hover:border-primary/40 bg-card cursor-pointer'
              }`}
            >
              <p className="font-semibold text-sm">
                {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
              </p>
              {slot.label && (
                <p className="text-xs text-muted-foreground mt-0.5">{slot.label}</p>
              )}
              <div className="mt-1.5">
                {isFull ? (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />Full
                  </Badge>
                ) : remaining <= 10 ? (
                  <Badge variant="secondary" className="text-xs">{remaining} left</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{remaining} available</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {daySlots.length === 0 && selectedDate && (
        <p className="text-sm text-muted-foreground text-center py-4">No slots for this date.</p>
      )}
    </div>
  );
}