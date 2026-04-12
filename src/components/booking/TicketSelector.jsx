import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Monitor, MapPin, Ticket, AlertTriangle } from "lucide-react";

export default function TicketSelector({ ticketTypes, selections, onSelectionsChange }) {
  const onlineTypes = ticketTypes.filter(tt => tt.attendance_mode === 'online' && tt.is_active);
  const inPersonTypes = ticketTypes.filter(tt => tt.attendance_mode === 'in_person' && tt.is_active);
  const hasMultipleGroups = onlineTypes.length > 0 && inPersonTypes.length > 0;

  const updateQuantity = (ttId, delta) => {
    const next = Math.max(0, (selections[ttId] || 0) + delta);
    onSelectionsChange({ ...selections, [ttId]: next });
  };

  const isSoldOut = (tt) => {
    if (tt.capacity_limit == null) return false;
    return (tt.quantity_sold || 0) + (tt.quantity_reserved || 0) >= tt.capacity_limit;
  };

  const remaining = (tt) => {
    if (tt.capacity_limit == null) return null;
    return Math.max(0, tt.capacity_limit - (tt.quantity_sold || 0) - (tt.quantity_reserved || 0));
  };

  const maxQty = (tt) => {
    const rem = remaining(tt);
    const perOrder = tt.per_order_limit || 10;
    if (rem !== null) return Math.min(rem, perOrder);
    return perOrder;
  };

  const renderTicketType = (tt) => {
    const soldOut = isSoldOut(tt);
    const rem = remaining(tt);
    const qty = selections[tt.id] || 0;
    const max = maxQty(tt);

    return (
      <div
        key={tt.id}
        className={`flex items-start sm:items-center justify-between p-4 border rounded-xl transition-colors ${
          qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
        } ${soldOut ? 'opacity-60' : ''}`}
      >
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{tt.name}</span>
            {soldOut && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />Sold Out
              </Badge>
            )}
            {!soldOut && rem !== null && rem <= 10 && (
              <Badge variant="secondary" className="text-xs">
                {rem} remaining
              </Badge>
            )}
          </div>
          {tt.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tt.description}</p>
          )}
          <p className="text-base font-bold mt-1.5" style={{ color: tt.price > 0 ? undefined : 'hsl(var(--chart-2))' }}>
            {tt.price > 0 ? `$${tt.price.toFixed(2)}` : 'Free'}
            {tt.price > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">{tt.currency || 'AUD'}</span>}
          </p>
          {tt.per_order_limit && !soldOut && (
            <p className="text-xs text-muted-foreground mt-0.5">Max {tt.per_order_limit} per order</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => updateQuantity(tt.id, -1)}
            disabled={qty === 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center font-semibold text-lg tabular-nums">{qty}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => updateQuantity(tt.id, 1)}
            disabled={soldOut || qty >= max}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderGroup = (types, icon, label, colorClass) => {
    if (types.length === 0) return null;
    return (
      <div>
        {hasMultipleGroups && (
          <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-border`}>
            {icon}
            <h3 className="text-base font-semibold text-foreground">{label}</h3>
            <Badge variant="outline" className="text-xs ml-auto">{types.length} type{types.length > 1 ? 's' : ''}</Badge>
          </div>
        )}
        <div className="space-y-3">{types.map(renderTicketType)}</div>
      </div>
    );
  };

  if (ticketTypes.filter(tt => tt.is_active).length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-xl">
        <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No tickets available for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Select Tickets</h2>
      </div>
      {renderGroup(inPersonTypes, <MapPin className="h-5 w-5 text-emerald-500" />, 'In-Person Tickets', 'text-emerald-500')}
      {renderGroup(onlineTypes, <Monitor className="h-5 w-5 text-blue-500" />, 'Online Tickets', 'text-blue-500')}
    </div>
  );
}