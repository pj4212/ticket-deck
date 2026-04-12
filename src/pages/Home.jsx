import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Calendar, Clock, MapPin, Monitor, ArrowRight, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      // Check auth
      try {
        const authed = await base44.auth.isAuthenticated();
        if (authed) {
          const me = await base44.auth.me();
          setUser(me);
          // Admin redirect
          if (['admin', 'super_admin', 'event_admin'].includes(me.role)) {
            navigate('/admin', { replace: true });
            return;
          }
          if (me.role === 'scanner') {
            navigate('/scanner', { replace: true });
            return;
          }
        }
      } catch (e) {}

      // Load public listed events
      const allEvents = await base44.entities.Event.filter({ status: 'published', visibility_mode: 'public_listed' });
      const now = new Date().toISOString().slice(0, 10);
      const upcoming = allEvents
        .filter(e => e.event_date >= now)
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
      setEvents(upcoming);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = events.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Discover & Book Events
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Find upcoming events, book your tickets, and check in seamlessly.
          </p>
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {search ? 'No events match your search.' : 'No upcoming events at this time.'}
          </p>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Events</h2>
            {filtered.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({ event }) {
  const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const fmtTime = (d) => {
    if (!d) return '';
    const match = d.match(/T(\d{2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2];
      return `${h % 12 || 12}:${m} ${h >= 12 ? 'pm' : 'am'}`;
    }
    return '';
  };

  const modeLabel = event.event_mode === 'online_stream' ? 'Online' : event.event_mode === 'hybrid' ? 'Hybrid' : 'In-Person';

  return (
    <Link
      to={`/event/${event.slug}`}
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="hidden sm:flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2.5 min-w-[64px]">
        <span className="text-xs font-medium text-primary uppercase">
          {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
        </span>
        <span className="text-2xl font-bold text-primary leading-tight">
          {new Date(event.event_date + 'T00:00:00').getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{event.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">{modeLabel}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 sm:hidden">
            <Calendar className="h-3.5 w-3.5" />
            {fmtDate(event.event_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}
          </span>
          {event.venue_details && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{event.venue_details}</span>
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}