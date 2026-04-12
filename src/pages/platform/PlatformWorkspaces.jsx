import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Search, Loader2, Building2, Ban, CheckCircle2, Eye,
  Users, Calendar, Ticket, CreditCard, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformWorkspaces() {
  const { isReadOnly } = useOutletContext();
  const [workspaces, setWorkspaces] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [memberships, setMemberships] = useState({});
  const [events, setEvents] = useState({});
  const [tickets, setTickets] = useState({});
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [suspendDialog, setSuspendDialog] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [ws, subs, members, evts, tix, ints] = await Promise.all([
      base44.entities.Workspace.filter({}),
      base44.entities.WorkspaceSubscription.filter({}),
      base44.entities.WorkspaceMembership.filter({ is_active: true }),
      base44.entities.Event.filter({}),
      base44.entities.Ticket.filter({}),
      base44.entities.WorkspaceIntegration.filter({}),
    ]);

    setWorkspaces(ws);
    setSubscriptions(groupBy(subs, 'workspace_id'));
    setMemberships(groupBy(members, 'workspace_id'));
    setEvents(groupBy(evts, 'workspace_id'));
    setTickets(groupBy(tix, 'event_id'));
    setIntegrations(groupBy(ints, 'workspace_id'));
    setLoading(false);
  }

  function groupBy(arr, key) {
    return arr.reduce((acc, item) => { (acc[item[key]] = acc[item[key]] || []).push(item); return acc; }, {});
  }

  const handleSuspend = async (ws) => {
    setActing(true);
    await base44.functions.invoke('platformAdmin', { action: 'suspend_workspace', workspace_id: ws.id, reason: suspendReason });
    toast.success(`${ws.name} suspended`);
    setSuspendDialog(null);
    setSuspendReason('');
    setActing(false);
    load();
  };

  const handleUnsuspend = async (ws) => {
    setActing(true);
    await base44.functions.invoke('platformAdmin', { action: 'unsuspend_workspace', workspace_id: ws.id });
    toast.success(`${ws.name} reactivated`);
    setActing(false);
    load();
  };

  const getTicketCount = (wsId) => {
    const wsEvents = events[wsId] || [];
    return wsEvents.reduce((sum, e) => sum + (tickets[e.id]?.length || 0), 0);
  };

  const filtered = workspaces.filter(ws => {
    if (filter === 'active' && !ws.is_active) return false;
    if (filter === 'suspended' && ws.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!ws.name.toLowerCase().includes(q) && !ws.slug.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Workspace Oversight</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workspaces..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'suspended'].map(f => (
            <Button key={f} size="sm" onClick={() => setFilter(f)}
              className={filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}>
              {f === 'all' ? `All (${workspaces.length})` : f === 'active' ? `Active (${workspaces.filter(w => w.is_active).length})` : `Suspended (${workspaces.filter(w => !w.is_active).length})`}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(ws => {
          const sub = (subscriptions[ws.id] || [])[0];
          const memberCount = (memberships[ws.id] || []).length;
          const eventCount = (events[ws.id] || []).length;
          const ticketCount = getTicketCount(ws.id);
          const wsInts = integrations[ws.id] || [];
          const expanded = expandedId === ws.id;

          return (
            <div key={ws.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : ws.id)}>
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{ws.name}</p>
                    <Badge variant={ws.is_active ? 'default' : 'destructive'} className="text-xs">{ws.is_active ? 'Active' : 'Suspended'}</Badge>
                    {sub && <Badge variant="outline" className="text-xs">{sub.billing_status}</Badge>}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{memberCount}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{eventCount}</span>
                    <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />{ticketCount}</span>
                  </div>
                </div>
                {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
              </div>

              {expanded && (
                <div className="border-t border-border p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Slug</p><p className="font-medium">{ws.slug}</p></div>
                    <div><p className="text-muted-foreground text-xs">Country</p><p className="font-medium">{ws.default_country || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Currency</p><p className="font-medium">{ws.default_currency || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Language</p><p className="font-medium">{ws.default_language || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Timezone</p><p className="font-medium">{ws.default_timezone || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Tax Mode</p><p className="font-medium">{ws.tax_mode || 'none'}{ws.tax_rate_percent ? ` (${ws.tax_rate_percent}%)` : ''}</p></div>
                    <div><p className="text-muted-foreground text-xs">Support Email</p><p className="font-medium truncate">{ws.support_email || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Created</p><p className="font-medium">{ws.created_date ? new Date(ws.created_date).toLocaleDateString() : '—'}</p></div>
                  </div>

                  {sub && (
                    <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><p className="text-muted-foreground text-xs">Status</p><p className="font-medium">{sub.billing_status}</p></div>
                        <div><p className="text-muted-foreground text-xs">Trial Ends</p><p className="font-medium">{sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : '—'}</p></div>
                        <div><p className="text-muted-foreground text-xs">Period End</p><p className="font-medium">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}</p></div>
                        <div><p className="text-muted-foreground text-xs">Seats Used</p><p className="font-medium">{sub.seats_used || 0}</p></div>
                      </div>
                    </div>
                  )}

                  <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integrations</p>
                    <div className="flex flex-wrap gap-2">
                      {wsInts.length === 0 && <p className="text-xs text-muted-foreground">No integrations configured</p>}
                      {wsInts.map(i => (
                        <Badge key={i.id} variant={i.status === 'active' && i.health_status === 'healthy' ? 'default' : i.status === 'error' || i.health_status === 'down' ? 'destructive' : 'secondary'} className="text-xs">
                          {i.provider} — {i.health_status || i.status}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="flex gap-2">
                      {ws.is_active ? (
                        <Button variant="destructive" size="sm" onClick={() => setSuspendDialog(ws)} disabled={acting}>
                          <Ban className="h-4 w-4 mr-1.5" />Suspend
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={() => handleUnsuspend(ws)} disabled={acting}>
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />Unsuspend
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No workspaces found</p>}
      </div>

      <Dialog open={!!suspendDialog} onOpenChange={(o) => !o && setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suspend {suspendDialog?.name}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will disable the workspace. Public booking and API access will be blocked.</p>
          <div>
            <Label>Reason</Label>
            <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleSuspend(suspendDialog)} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Suspend Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}