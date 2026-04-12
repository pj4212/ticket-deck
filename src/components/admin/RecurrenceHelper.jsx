import { Badge } from '@/components/ui/badge';
import { Repeat, Calendar } from 'lucide-react';

const OPTIONS = [
  { value: 'none', label: 'One-off', desc: 'Single event, no repetition' },
  { value: 'weekly', label: 'Weekly', desc: 'Repeats every week on the same day' },
  { value: 'fortnightly', label: 'Fortnightly', desc: 'Repeats every two weeks' },
  { value: 'monthly', label: 'Monthly', desc: 'Repeats monthly on the same date' },
  { value: 'custom', label: 'Custom', desc: 'Use series linking for irregular schedules' },
];

export default function RecurrenceHelper({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 p-3 border rounded-lg transition-all text-center ${
              value === opt.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-primary/30'
            }`}
          >
            {opt.value === 'none' ? (
              <Calendar className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Repeat className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
      {value !== 'none' && (
        <p className="text-xs text-muted-foreground">
          {value === 'custom'
            ? 'For irregular schedules, create a series and duplicate events into it.'
            : `This event repeats ${value}. Use "Duplicate" from the event list to quickly create future sessions.`}
        </p>
      )}
    </div>
  );
}