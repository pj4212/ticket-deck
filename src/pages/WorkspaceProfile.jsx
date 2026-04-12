import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, LayoutGrid, List, Mail } from 'lucide-react';
import { EventCardList, EventCardGrid } from '@/components/public/EventCard';
import useWorkspaceBranding from '@/hooks/useWorkspaceBranding';

export default function WorkspaceProfile() {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [events, setEvents] = useState([]);
  const [ticketPrices, setTicketPrices] = useState({});
  const [soldOutMap, setSoldOutMap] = useState({});
  const [viewMode, setViewMode] = useState('card');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accentColor } = useWorkspaceBranding(workspace);

  useEffect(() => {
    async function load() {
      const workspaces = await base44.entities.Workspace.filter({ slug, is_active: true });
      if (!workspaces.length) { setError('Organisation not found'); setLoading(false); return; }
      const ws = workspaces[0];
      setWorkspace(ws);

      const allEvents = await base44.entities.Event.filter({
        workspace_id: ws.id,
        status: 'published',
        visibility_mode: 'public_listed',
      });
      const now = new Date().toISOString().slice(0, 10);
      const upcoming = allEvents.filter(e => e.event_date >= now).sort((a, b) => a.event_date.localeCompare(b.event_date));
      setEvents(upcoming);

      // Load ticket prices for starting-price display
      if (upcoming.length) {
        const eventIds = upcoming.map(e => e.id);
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
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Workspace header */}
      <div className="mb-10">
        <div className="text-center">
          {workspace.logo_url ? (
            <img src={workspace.logo_url} alt={workspace.name} className="h-20 w-auto mx-auto mb-4 rounded-xl" />
          ) : (
            <div className="h-20 w-20 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={accentColor ? { backgroundColor: `${accentColor}15` } : { backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <Building2 className="h-10 w-10" style={accentColor ? { color: accentColor } : { color: 'hsl(var(--primary))' }} />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">{workspace.name}</h1>
          {workspace.description && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{workspace.description}</p>}
          {workspace.support_email && (
            <a href={`mailto:${workspace.support_email}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3">
              <Mail className="h-3.5 w-3.5" />{workspace.support_email}
            </a>
          )}
        </div>
      </div>

      {/* Events section */}
      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No upcoming events.</p>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Events</h2>
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-3">
              {events.map(event => (
                <EventCardList
                  key={event.id}
                  event={event}
                  startingPrice={ticketPrices[event.id]}
                  soldOut={soldOutMap[event.id]}
                  salesClosed={event.sales_close_at && new Date().toISOString() > event.sales_close_at}
                  accentColor={accentColor}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => (
                <EventCardGrid
                  key={event.id}
                  event={event}
                  startingPrice={ticketPrices[event.id]}
                  soldOut={soldOutMap[event.id]}
                  salesClosed={event.sales_close_at && new Date().toISOString() > event.sales_close_at}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}