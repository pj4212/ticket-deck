import { Calendar, Clock, MapPin, Globe, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatEventDate, formatEventTime, getTimezoneAbbr } from '@/lib/formatters';
import AddToCalendar from '@/components/booking/AddToCalendar';

export default function EventHeader({ event, venue, workspace }) {
  if (!event) return null;

  const tz = event.timezone || workspace?.default_timezone || 'UTC';
  const numLocale = workspace?.default_number_format || 'en-US';
  const dateStr = formatEventDate(event.start_datetime, tz, numLocale);
  const startTime = formatEventTime(event.start_datetime, tz, numLocale);
  const endTime = formatEventTime(event.end_datetime, tz, numLocale);
  const tzAbbr = getTimezoneAbbr(tz);

  const isOnline = event.event_mode === 'online_stream';
  const isHybrid = event.event_mode === 'hybrid';

  return (
    <div className="space-y-4">
      {/* Event mode badges */}
      <div className="flex flex-wrap gap-2">
        {isOnline && <Badge variant="secondary" className="gap-1"><Video className="h-3 w-3" />Online Event</Badge>}
        {isHybrid && <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" />Hybrid Event</Badge>}
        {event.scheduling_mode === 'timed_entry' && <Badge variant="outline">Timed Entry</Badge>}
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{event.name}</h1>

      {/* Date & Time */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          {dateStr}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          {startTime} – {endTime} {tzAbbr}
        </span>
      </div>

      {/* Venue */}
      {venue && (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-foreground">{venue.name}</span>
            {venue.address_line_1 && <span className="ml-1">— {venue.address_line_1}{venue.city ? `, ${venue.city}` : ''}</span>}
            {venue.venue_link && (
              <a href={venue.venue_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline text-xs">
                Map
              </a>
            )}
          </div>
        </div>
      )}

      {/* Organizer */}
      {workspace && (
        <p className="text-sm text-muted-foreground">
          Organized by <span className="font-medium text-foreground">{workspace.name}</span>
        </p>
      )}

      {/* Add to calendar */}
      <AddToCalendar event={event} venue={venue} />
    </div>
  );
}