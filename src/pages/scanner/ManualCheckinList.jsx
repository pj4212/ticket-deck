import { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Loader2, CheckCircle2, Circle, Undo2, AlertTriangle } from 'lucide-react';

export default function ManualCheckinList() {
  const { occurrenceId } = useParams();
  const eventId = occurrenceId;
  const { user, isAdmin } = useOutletContext();
  const [tickets, setTickets] = useState([]);
  const [ticketTypes, setTicketTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionId, setActionId] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadTickets();
    const interval = setInterval(poll, 3000);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [eventId]);

  const loadTickets = async () => {
    const [tix, tts] = await Promise.all([
      base44.entities.Ticket.filter({ event_id: eventId, ticket_status: 'active' }),
      base44.entities.TicketType.filter({ event_id: eventId }),
    ]);
    if (!mountedRef.current) return;
    setTicketTypes(Object.fromEntries(tts.map(tt => [tt.id, tt])));
    setTickets(tix);
    setLoading(false);
  };

  const poll = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await base44.functions.invoke('checkin', { action: 'poll', event_id: eventId });
      if (!mountedRef.current || res.data.status !== 'success') return;
      setTickets(prev => {
        const updates = {};
        res.data.tickets.forEach(t => { updates[t.id] = t; });
        return prev.map(t => {
          const upd = updates[t.id];
          if (upd && upd.check_in_status !== t.check_in_status) return { ...t, check_in_status: upd.check_in_status, checked_in_at: upd.checked_in_at };
          return t;
        });
      });
    } catch (_) {}
  };

  const handleCheckin = async (ticket) => {
    if (!navigator.onLine) return;
    setActionId(ticket.id);
    // Optimistic update
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, check_in_status: 'checked_in', checked_in_at: new Date().toISOString() } : t));

    const res = await base44.functions.invoke('checkin', { action: 'checkin', ticket_id: ticket.id, event_id: eventId });
    if (res.data.status !== 'success' && res.data.status !== 'warning_checked_in') {
      // Revert
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, check_in_status: 'not_checked_in', checked_in_at: '' } : t));
    }
    setActionId(null);
  };

  const handleUndo = async (ticket) => {
    if (!navigator.onLine) return;
    setActionId(ticket.id);
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, check_in_status: 'not_checked_in', checked_in_at: '' } : t));

    const res = await base44.functions.invoke('checkin', { action: 'undo_checkin', ticket_id: ticket.id, event_id: eventId });
    if (res.data.status !== 'success') {
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, check_in_status: 'checked_in', checked_in_at: ticket.checked_in_at } : t));
    }
    setActionId(null);
  };

  const checkedInCount = tickets.filter(t => t.check_in_status === 'checked_in').length;

  const filtered = tickets.filter(t => {
    if (filter === 'checked_in' && t.check_in_status !== 'checked_in') return false;
    if (filter === 'not_checked_in' && t.check_in_status !== 'not_checked_in') return false;
    if (search) {
      const s = search.toLowerCase();
      const name = `${t.attendee_first_name} ${t.attendee_last_name}`.toLowerCase();
      if (!name.includes(s) && !t.attendee_email.toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    // Show not-checked-in first
    if (a.check_in_status !== b.check_in_status) return a.check_in_status === 'not_checked_in' ? -1 : 1;
    return `${a.attendee_first_name} ${a.attendee_last_name}`.localeCompare(`${b.attendee_first_name} ${b.attendee_last_name}`);
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-center px-4 py-3">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Users className="h-5 w-5 text-primary" />
            <span>{checkedInCount} / {tickets.length}</span>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11 text-base" />
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-2">
          {[
            { value: 'all', label: `All (${tickets.length})` },
            { value: 'not_checked_in', label: `Pending (${tickets.length - checkedInCount})` },
            { value: 'checked_in', label: `Done (${checkedInCount})` },
          ].map(tab => (
            <Button key={tab.value} size="sm" onClick={() => setFilter(tab.value)}
              className={`text-xs ${filter === tab.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.map(t => {
          const isChecked = t.check_in_status === 'checked_in';
          const tt = ticketTypes[t.ticket_type_id];
          const isOnline = t.attendance_mode === 'online';
          const isProcessing = actionId === t.id;

          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-4 min-h-[72px] border-b border-border transition-colors ${isChecked ? 'bg-emerald-500/5' : ''}`}>
              {/* Check-in button (large tap target) */}
              <button
                className="shrink-0 flex items-center justify-center w-14 h-14 touch-target"
                onClick={() => isChecked ? (isAdmin ? handleUndo(t) : null) : handleCheckin(t)}
                disabled={isProcessing || (!isChecked && !navigator.onLine)}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : isChecked ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                ) : (
                  <Circle className="h-10 w-10 text-muted-foreground" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-base truncate">{t.attendee_first_name} {t.attendee_last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.attendee_email}</p>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-xs">{tt?.name || 'Ticket'}</Badge>
                {isOnline && (
                  <Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/30">
                    <AlertTriangle className="h-3 w-3 mr-0.5" />Online
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No attendees found</p>}
      </div>
    </div>
  );
}