import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Loader2, Search, Mail, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  waiting: { label: 'Waiting', variant: 'secondary' },
  notified: { label: 'Notified', variant: 'default' },
  converted: { label: 'Converted', variant: 'outline' },
  expired: { label: 'Expired', variant: 'destructive' },
};

export default function WaitlistManagement() {
  const { wsFilter, workspaceId } = useWorkspaceFilter();
  const [entries, setEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    setLoading(true);
    const [e, ev, tt] = await Promise.all([
      base44.entities.WaitlistEntry.filter({ ...wsFilter }),
      base44.entities.Event.filter({ ...wsFilter }),
      base44.entities.TicketType.filter({}),
    ]);
    setEntries(e);
    setEvents(ev);
    setTicketTypes(tt);
    setLoading(false);
  }

  const eventMap = useMemo(() => Object.fromEntries(events.map(e => [e.id, e])), [events]);
  const ttMap = useMemo(() => Object.fromEntries(ticketTypes.map(t => [t.id, t])), [ticketTypes]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (eventFilter !== 'all' && e.event_id !== eventFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.name.toLowerCase().includes(q) && !e.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, eventFilter, statusFilter, search]);

  const waitingCount = entries.filter(e => e.status === 'waiting').length;

  async function handleNotifySelected() {
    if (!selected.size) { toast.error('Select entries first'); return; }
    setNotifying(true);
    const res = await base44.functions.invoke('notifyWaitlist', {
      action: 'notify_selected',
      entry_ids: Array.from(selected),
    });
    toast.success(`Notified ${res.data.notified} people`);
    setSelected(new Set());
    setNotifying(false);
    load();
  }

  async function handleNotifyAll() {
    const filter = eventFilter !== 'all' ? { event_id: eventFilter } : {};
    if (!confirm(`Notify all ${waitingCount} waiting entries?`)) return;
    setNotifying(true);
    const res = await base44.functions.invoke('notifyWaitlist', {
      action: 'notify_all',
      event_id: eventFilter !== 'all' ? eventFilter : entries[0]?.event_id,
    });
    toast.success(`Notified ${res.data.notified} people`);
    setNotifying(false);
    load();
  }

  async function handleDelete(id) {
    await base44.entities.WaitlistEntry.delete(id);
    toast.success('Removed from waitlist');
    load();
  }

  function toggleSelect(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.id)));
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage people waiting for sold-out events</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{entries.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Waiting</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-400">{waitingCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Notified</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{entries.filter(e => e.status === 'notified').length}</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All events" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="notified">Notified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleNotifySelected} disabled={!selected.size || notifying}>
          {notifying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
          Notify Selected ({selected.size})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No waitlist entries</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => {
                const s = STATUS_BADGE[entry.status] || STATUS_BADGE.waiting;
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-sm">{entry.email}</TableCell>
                    <TableCell className="text-sm">{eventMap[entry.event_id]?.name || '—'}</TableCell>
                    <TableCell className="text-sm">{entry.ticket_type_id ? (ttMap[entry.ticket_type_id]?.name || '—') : 'General'}</TableCell>
                    <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(entry.created_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}