import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, ArrowRight, Building2 } from 'lucide-react';

export default function WorkspaceProfile() {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setEvents(allEvents.filter(e => e.event_date >= now).sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setLoading(false);
    }
    load();
  }, [slug]);

  const fmtDate = (d) => { if (!d) return ''; const [y,m,day]=d.slice(0,10).split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}); };
  const fmtTime = (d) => { if (!d) return ''; const match = d.match(/T(\d{2}):(\d{2})/); if(match){const h=parseInt(match[1],10);return `${h%12||12}:${match[2]} ${h>=12?'pm':'am'}`;} return ''; };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Workspace header */}
      <div className="mb-8 text-center">
        {workspace.logo_url ? (
          <img src={workspace.logo_url} alt={workspace.name} className="h-16 w-auto mx-auto mb-4 rounded-lg" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{workspace.name}</h1>
        {workspace.description && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{workspace.description}</p>}
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No upcoming events.</p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          {events.map(event => {
            const modeLabel = event.event_mode === 'online_stream' ? 'Online' : event.event_mode === 'hybrid' ? 'Hybrid' : 'In-Person';
            return (
              <Link key={event.id} to={`/event/${event.slug}`}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
                <div className="hidden sm:flex flex-col items-center bg-primary/10 rounded-lg px-3 py-2 min-w-[64px]">
                  <span className="text-xs font-medium text-primary uppercase">{new Date(event.event_date+'T00:00:00').toLocaleDateString('en-AU',{weekday:'short'})}</span>
                  <span className="text-2xl font-bold text-primary leading-tight">{new Date(event.event_date+'T00:00:00').getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold group-hover:text-primary transition-colors truncate">{event.name}</span>
                    <Badge variant="outline" className="text-xs">{modeLabel}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(event.event_date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}