import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EventCardList, EventCardGrid } from '@/components/public/EventCard';

export default function BrowseEvents() {
  const [events, setEvents] = useState([]);
  const [ticketPrices, setTicketPrices] = useState({});
  const [soldOutMap, setSoldOutMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    async function load() {
      const allEvents = await base44.entities.Event.filter({ status: 'published', visibility_mode: 'public_listed' });
      const now = new Date().toISOString().slice(0, 10);
      const upcoming = allEvents
        .filter(e => e.event_date >= now)
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
      setEvents(upcoming);

      // Load ticket prices
      if (upcoming.length) {
        const allTicketTypes = await base44.entities.TicketType.filter({ is_active: true });
        const prices = {};
        const soldOut = {};
        for (const ev of upcoming) {
          const tts = allTicketTypes.filter(tt => tt.event_id === ev.id);
          if (tts.length) {
            prices[ev.id] = Math.min(...tts.map(tt => tt.price || 0));
            soldOut[ev.id] = tts.every(tt => tt.capacity_limit && (tt.quantity_sold || 0) >= tt.capacity_limit);
          }
        }
        setTicketPrices(prices);
        setSoldOutMap(soldOut);
      }

      setLoading(false);
    }
    load();
  }, []);

  const filtered = events.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <section className="bg-gradient-to-b from-primary/5 to-background py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Discover Events
          </h1>
          <p className="mt-3 text-muted-foreground">
            Find upcoming events and book your tickets.
          </p>
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10">
        {!loading && filtered.length > 0 && (
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {search ? 'No events match your search.' : 'No upcoming events at this time.'}
          </p>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filtered.map(event => (
              <EventCardList
                key={event.id}
                event={event}
                startingPrice={ticketPrices[event.id]}
                soldOut={soldOutMap[event.id]}
                salesClosed={event.sales_close_at && new Date().toISOString() > event.sales_close_at}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(event => (
              <EventCardGrid
                key={event.id}
                event={event}
                startingPrice={ticketPrices[event.id]}
                soldOut={soldOutMap[event.id]}
                salesClosed={event.sales_close_at && new Date().toISOString() > event.sales_close_at}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}