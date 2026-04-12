import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Loader2, ScanLine, LogOut, ChevronRight, Ticket } from 'lucide-react';

export default function ScannerHome() {
  const { user, workspaceId, scannerAssignments, isAdmin } = useOutletContext();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    async function load() {
      const todayStr = new Date().toISOString().slice(0, 10);
      const filter = workspaceId ? { workspace_id: workspaceId, status: 'published' } : { status: 'published' };
      const allEvents = await base44.entities.Event.filter(filter);

      // Filter by scanner assignments (location or event scoped)
      let accessible = allEvents;
      if (!isAdmin && scannerAssignments.length > 0) {
        const assignedEventIds = new Set(scannerAssignments.filter(a => a.event_id).map(a => a.event_id));
        const assignedLocationIds = new Set(scannerAssignments.filter(a => a.location_id).map(a => a.location_id));
        if (assignedEventIds.size > 0 || assignedLocationIds.size > 0) {
          accessible = allEvents.filter(e => {
            if (assignedEventIds.has(e.id)) return true;
            if (e.location_id && assignedLocationIds.has(e.location_id)) return true;
            // If only event-specific assignments, don't show unassigned events
            if (assignedEventIds.size > 0 && assignedLocationIds.size === 0) return false;
            return assignedLocationIds.size === 0; // No restrictions = show all
          });
        }
      }

      const up = accessible.filter(e => e.event_date >= todayStr).sort((a, b) => (a.start_datetime || a.event_date).localeCompare(b.start_datetime || b.event_date));
      const pa = accessible.filter(e => e.event_date < todayStr).sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')).slice(0, 20);
      setUpcoming(up);
      setPast(pa);

      // Load counts for upcoming events
      const counts = {};
      for (const ev of up.slice(0, 10)) {
        const tickets = await base44.entities.Ticket.filter({ event_id: ev.id, ticket_status: 'active' });
        counts[ev.id] = { total: tickets.length, checkedIn: tickets.filter(t => t.check_in_status === 'checked_in').length };
      }
      setTicketCounts(counts);
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const fmtTime = (d) => { if (!d) return ''; const m = d.match(/T(\d{2}):(\d{2})/); if(m){const h=parseInt(m[1],10);return `${h%12||12}:${m[2]} ${h>=12?'pm':'am'}`;} return ''; };
  const fmtDate = (d) => { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const events = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Scanner</h1>
            <p className="text-xs text-muted-foreground">{user?.full_name || user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => base44.auth.logout()}>
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex gap-2">
        {[{ key: 'upcoming', label: `Upcoming (${upcoming.length})` }, { key: 'past', label: `Past (${past.length})` }].map(t => (
          <Button key={t.key} size="sm" onClick={() => setTab(t.key)}
            className={tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}>
            {t.label}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ScanLine className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No {tab} events</h2>
          <p className="text-sm text-muted-foreground">Check back later.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const counts = ticketCounts[ev.id];
            return (
              <Link key={ev.id} to={`/scanner/${ev.id}/dashboard`}>
                <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{ev.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(ev.event_date)}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(ev.start_datetime)}</span>
                        {ev.venue_details && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue_details}</span>}
                      </div>
                      {counts && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Check-in</span>
                            <span className="font-medium">{counts.checkedIn} / {counts.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${counts.total > 0 ? (counts.checkedIn / counts.total * 100) : 0}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}