import { ShoppingCart, Monitor, MapPin, Tag, Clock } from "lucide-react";
import { formatCurrency } from '@/lib/formatters';

export default function OrderSummary({ selections, ticketTypes, discount, slotLabel, currency, numberLocale }) {
  const cur = currency || 'USD';
  const loc = numberLocale || 'en-US';
  const fmtPrice = (amt) => amt > 0 ? formatCurrency(amt, cur, loc) : 'Free';
  const items = [];
  let subtotal = 0;
  let ticketCount = 0;

  for (const [ttId, qty] of Object.entries(selections)) {
    if (qty <= 0) continue;
    const tt = ticketTypes.find(t => t.id === ttId);
    if (!tt) continue;
    const lineTotal = (tt.price || 0) * qty;
    subtotal += lineTotal;
    ticketCount += qty;
    items.push({
      id: tt.id,
      name: tt.name,
      mode: tt.attendance_mode,
      qty,
      price: tt.price,
      subtotal: lineTotal,
      currency: tt.currency || 'USD',
    });
  }

  if (items.length === 0) return null;

  // Calculate discount
  let discountAmount = 0;
  if (discount) {
    const applicableIds = discount.applicable_ticket_type_ids;
    let discountableTotal = subtotal;
    if (applicableIds && applicableIds.length > 0) {
      discountableTotal = items
        .filter(i => applicableIds.includes(i.id))
        .reduce((s, i) => s + i.subtotal, 0);
    }
    if (discount.discount_type === 'percentage') {
      discountAmount = discountableTotal * (discount.discount_value / 100);
    } else {
      discountAmount = Math.min(discount.discount_value, discountableTotal);
    }
  }
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="border border-primary/20 rounded-xl overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-primary/20">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-foreground text-sm">
          Order Summary
          <span className="text-muted-foreground font-normal ml-2">
            {ticketCount} ticket{ticketCount > 1 ? 's' : ''}
          </span>
        </h3>
      </div>

      <div className="px-4 py-3 space-y-2">
        {items.map((item, i) => {
          const ModeIcon = item.mode === 'online' ? Monitor : MapPin;
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <ModeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  <span className="font-medium">{item.qty}×</span> {item.name}
                </span>
              </div>
              <span className="font-semibold shrink-0 ml-3">
                {fmtPrice(item.subtotal)}
              </span>
            </div>
          );
        })}
      </div>

      {discountAmount > 0 && (
        <div className="px-4 py-2 border-t border-border flex justify-between items-center text-sm">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Tag className="h-3.5 w-3.5" />
            <span>Discount ({discount.code})</span>
          </div>
          <span className="text-emerald-400 font-medium">-{formatCurrency(discountAmount, cur, loc)}</span>
        </div>
      )}

      {slotLabel && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Time Slot: <span className="text-foreground font-medium">{slotLabel}</span></span>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border flex justify-between items-center">
        <span className="font-bold text-foreground">Total</span>
        <span className="font-bold text-lg text-foreground">
          {fmtPrice(total)}
        </span>
      </div>
    </div>
  );
}