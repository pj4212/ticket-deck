import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Wifi, Monitor, Users, ExternalLink, Car } from 'lucide-react';

function fmtDateLong(d) {
  if (!d) return '';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
  if (mode === 'online_stream') return <Badge className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20"><Wifi className="h-3 w-3" />Online</Badge>;
  if (mode === 'hybrid') return <Badge className="gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20"><Monitor className="h-3 w-3" />Hybrid</Badge>;
  return <Badge className="gap-1 bg-green-500/10 text-green-400 border-green-500/20"><Users className="h-3 w-3" />In-Person</Badge>;
}

export default function EventHeader({ event, venue, workspace }) {
  if (!event) return null;

  return (
    <div className="space-y-6">
      {/* Event title & mode */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <ModeBadge mode={event.event_mode} />
          {workspace && (
            <span className="text-xs text-muted-foreground">
              by <span className="font-medium text-foreground">{workspace.name}</span>
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">{event.name}</h1>
      </div>

      {/* Date & time */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{fmtDateLong(event.event_date)}</p>
            <p className="text-sm text-muted-foreground">
              {fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}
              {event.timezone && <span className="ml-1">({event.timezone})</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Location */}
      {(event.event_mode === 'in_person' || event.event_mode === 'hybrid') && (
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            {venue ? (
              <>
                <p className="font-medium text-foreground">{venue.name}</p>
                {venue.address && <p className="text-sm text-muted-foreground">{venue.address}</p>}
                <div className="flex gap-3 mt-1.5">
                  {venue.venue_link && (
                    <a href={venue.venue_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />View Map
                    </a>
                  )}
                  {venue.parking_link && (
                    <a href={venue.parking_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Car className="h-3 w-3" />Parking
                    </a>
                  )}
                </div>
                {venue.details && (
                  <p className="text-sm text-muted-foreground mt-1.5">{venue.details}</p>
                )}
              </>
            ) : (
              <p className="font-medium text-foreground">{event.venue_details || 'Venue TBA'}</p>
            )}
          </div>
        </div>
      )}

      {/* Online indicator */}
      {(event.event_mode === 'online_stream' || event.event_mode === 'hybrid') && (
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Wifi className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">Online Event</p>
            <p className="text-sm text-muted-foreground">
              Join link will be sent with your ticket confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}