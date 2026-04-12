import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, Loader2, X, CheckCircle2 } from 'lucide-react';

export default function DiscountCodeInput({ eventId, ticketTypeIds, onDiscountApplied, onDiscountRemoved }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('validateDiscount', {
      code: code.trim(),
      event_id: eventId,
      ticket_type_ids: ticketTypeIds,
    });
    setLoading(false);
    if (res.data.valid) {
      setApplied(res.data.discount);
      onDiscountApplied(res.data.discount);
    } else {
      setError(res.data.error || 'Invalid code');
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    setError('');
    onDiscountRemoved();
  };

  if (applied) {
    return (
      <div className="flex items-center gap-3 p-3 border border-emerald-500/30 bg-emerald-500/10 rounded-xl">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {applied.code} — {applied.discount_type === 'percentage' ? `${applied.discount_value}% off` : `$${applied.discount_value.toFixed(2)} off`}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Discount Code</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Enter code"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
          className="flex-1 uppercase"
        />
        <Button variant="outline" onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}