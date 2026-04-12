import { AlertTriangle, XCircle, CheckCircle2, Clock } from 'lucide-react';

export default function EventStatusBanner({ event, ticketTypes }) {
  if (!event) return null;

  // Check sold out
  const allSoldOut = ticketTypes.length > 0 && ticketTypes.every(tt => {
    if (!tt.is_active) return true;
    if (!tt.capacity_limit) return false;
    return (tt.quantity_sold || 0) >= tt.capacity_limit;
  });

  const now = new Date().toISOString();
  const salesClosed = event.sales_close_at && now > event.sales_close_at;
  const salesNotOpen = event.sales_open_at && now < event.sales_open_at;

  if (event.status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <XCircle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="font-medium text-destructive">Event Cancelled</p>
          <p className="text-sm text-muted-foreground">This event has been cancelled by the organiser.</p>
        </div>
      </div>
    );
  }

  if (event.status === 'completed') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border border-border">
        <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="font-medium text-foreground">Event Completed</p>
          <p className="text-sm text-muted-foreground">This event has already taken place.</p>
        </div>
      </div>
    );
  }

  if (allSoldOut) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="font-medium text-destructive">Sold Out</p>
          <p className="text-sm text-muted-foreground">All tickets for this event have been sold.</p>
        </div>
      </div>
    );
  }

  if (salesClosed) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border border-border">
        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="font-medium text-foreground">Sales Closed</p>
          <p className="text-sm text-muted-foreground">Ticket sales for this event have ended.</p>
        </div>
      </div>
    );
  }

  if (salesNotOpen) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Clock className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="font-medium text-foreground">Sales Opening Soon</p>
          <p className="text-sm text-muted-foreground">
            Tickets go on sale {new Date(event.sales_open_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}.
          </p>
        </div>
      </div>
    );
  }

  return null;
}