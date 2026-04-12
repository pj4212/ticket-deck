import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { EventCardList } from '@/components/public/EventCard';

export default function SeriesPage() {
  const { slug } = useParams();
  const [series, setSeries] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = series ? `${series.name} — Ticket Deck` : 'Ticket Deck';
    return () => { document.title = 'Ticket Deck'; };
  }, [series]);

  useEffect(() => {
    async function load() {
      const allSeries = await base44.entities.EventSeries.filter({ slug });
      if (!allSeries.length) { setError('Series not found'); setLoading(false); return; }
      const s = allSeries[0];
      setSeries(s);

      const allEvents = await base44.entities.Event.filter({ series_id: s.id, status: 'published' });
      const now = new Date().toISOString().slice(0, 10);
      const upcoming = allEvents
        .filter(e => e.event_date >= now && (e.visibility_mode === 'public_listed' || e.visibility_mode === 'unlisted'))
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
      setEvents(upcoming);
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{series.name}</h1>
        {series.description && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{series.description}</p>}
      </div>

      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No upcoming sessions at this time.</p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
          {events.map(event => (
            <EventCardList key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}