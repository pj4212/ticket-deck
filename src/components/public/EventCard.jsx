import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Monitor, Wifi, Users, Ticket, ArrowRight } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(d) {
  if (!d) return '';
  const match = d.match(/T(\d{2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    return `${h % 12 || 12}:${match[2]} ${h >= 12 ? 'pm' : 'am'}`;
  }
  return '';
}

function ModeBadge({ mode }) {
  if (mode === 'online_stream') return <Badge variant="outline" className="text-xs gap-1"><Wifi className="h-3 w-3" />Online</Badge>;
  if (mode === 'hybrid') return <Badge variant="outline" className="text-xs gap-1"><Monitor className="h-3 w-3" />Hybrid</Badge>;
  return <Badge variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" />In-Person</Badge>;
}

export function EventCardList({ event, startingPrice, soldOut, salesClosed, accentColor }) {
  const unavailable = soldOut || salesClosed || event.status === 'cancelled' || event.status === 'completed';

  return (
    <Link
      to={`/event/${event.slug}`}
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      {/* Date badge */}
      <div
        className="hidden sm:flex flex-col items-center justify-center rounded-lg px-3 py-2.5 min-w-[64px]"
        style={accentColor ? { backgroundColor: `${accentColor}15`, color: accentColor } : {}}
      >
        <span className={`text-xs font-medium uppercase ${accentColor ? '' : 'text-primary'}`}
          style={accentColor ? { color: accentColor } : {}}>
          {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
        </span>
        <span className={`text-2xl font-bold leading-tight ${accentColor ? '' : 'text-primary'}`}
          style={accentColor ? { color: accentColor } : {}}>
          {new Date(event.event_date + 'T00:00:00').getDate()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{event.name}</span>
          <ModeBadge mode={event.event_mode} />
          {soldOut && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
          {salesClosed && !soldOut && <Badge variant="secondary" className="text-xs">Sales Closed</Badge>}
          {event.status === 'cancelled' && <Badge variant="destructive" className="text-xs">Cancelled</Badge>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 sm:hidden">
            <Calendar className="h-3.5 w-3.5" />{fmtDate(event.event_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}
          </span>
          {event.venue_details && event.event_mode !== 'online_stream' && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{event.venue_details}</span>
            </span>
          )}
        </div>
        {startingPrice !== null && startingPrice !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {startingPrice === 0 ? 'Free' : `From $${startingPrice.toFixed(2)}`}
          </p>
        )}
      </div>

      {unavailable ? (
        <span className="text-xs text-muted-foreground shrink-0">Unavailable</span>
      ) : (
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      )}
    </Link>
  );
}

export function EventCardGrid({ event, startingPrice, soldOut, salesClosed, accentColor }) {
  const unavailable = soldOut || salesClosed || event.status === 'cancelled' || event.status === 'completed';

  return (
    <Link
      to={`/event/${event.slug}`}
      className="flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all group"
    >
      {/* Top color bar */}
      <div className="h-1.5" style={{ backgroundColor: accentColor || 'hsl(var(--primary))' }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Date */}
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {fmtDate(event.event_date)} · {fmtTime(event.start_datetime)}
        </p>

        {/* Title & badges */}
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
          {event.name}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <ModeBadge mode={event.event_mode} />
          {soldOut && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
          {salesClosed && !soldOut && <Badge variant="secondary" className="text-xs">Sales Closed</Badge>}
          {event.status === 'cancelled' && <Badge variant="destructive" className="text-xs">Cancelled</Badge>}
        </div>

        {/* Location */}
        {event.venue_details && event.event_mode !== 'online_stream' && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.venue_details}</span>
          </p>
        )}
        {event.event_mode === 'online_stream' && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
            <Wifi className="h-3.5 w-3.5" />Online event
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
          <span className="text-sm font-medium">
            {startingPrice === 0 ? 'Free' : startingPrice != null ? `From $${startingPrice.toFixed(2)}` : ''}
          </span>
          {unavailable ? (
            <span className="text-xs text-muted-foreground">Unavailable</span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs"
              style={accentColor ? { color: accentColor } : {}}
            >
              <Ticket className="h-3.5 w-3.5" />Book Now
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}