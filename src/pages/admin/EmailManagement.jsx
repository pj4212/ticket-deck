import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Search, RefreshCw, Send, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Clock, Bell, Palette } from 'lucide-react';
import { toast } from 'sonner';
import EmailBrandingConfig from '@/components/admin/EmailBrandingConfig';

const STATUS_CONFIG = {
  sent: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
  queued: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  bounced: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/15' },
};

export default function EmailManagement() {
  const { workspaceId } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [retrying, setRetrying] = useState(null);
  const [events, setEvents] = useState([]);

  // Event update dialog
  const [updateDialog, setUpdateDialog] = useState(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Reminder dialog
  const [reminderDialog, setReminderDialog] = useState(null);
  const [reminderType, setReminderType] = useState('24hour');
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    const filter = workspaceId ? { workspace_id: workspaceId } : {};
    const [emailLogs, evts] = await Promise.all([
      base44.entities.EmailLog.filter(filter, '-created_date', 200),
      base44.entities.Event.filter(workspaceId ? { workspace_id: workspaceId, status: 'published' } : { status: 'published' }),
    ]);
    setLogs(emailLogs);
    setEvents(evts);
    setLoading(false);
  }

  const handleRetry = async (log) => {
    setRetrying(log.id);
    await base44.functions.invoke('sendWorkspaceEmail', { action: 'retry_email', email_log_id: log.id });
    toast.success('Email queued for retry');
    setRetrying(null);
    load();
  };

  const handleSendUpdate = async () => {
    if (!updateDialog || updateDialog === 'select' || !updateMessage.trim()) return;
    setSending(true);
    const res = await base44.functions.invoke('sendWorkspaceEmail', { action: 'send_event_update', event_id: updateDialog, message: updateMessage });
    toast.success(`Update sent to ${res.data.sent} attendees`);
    setSending(false);
    setUpdateDialog(null);
    setUpdateMessage('');
    load();
  };

  const handleSendReminder = async () => {
    if (!reminderDialog || reminderDialog === 'select') return;
    setSendingReminder(true);
    const res = await base44.functions.invoke('sendWorkspaceEmail', { action: 'send_reminders', event_id: reminderDialog, reminder_type: reminderType });
    toast.success(`Reminder sent to ${res.data.sent} attendees`);
    setSendingReminder(false);
    setReminderDialog(null);
    load();
  };

  const filtered = logs.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (typeFilter !== 'all' && l.email_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.recipient_email?.toLowerCase().includes(q) && !l.subject?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const emailTypes = [...new Set(logs.map(l => l.email_type).filter(Boolean))];
  const stats = { total: logs.length, sent: logs.filter(l => l.status === 'sent').length, failed: logs.filter(l => l.status === 'failed').length };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Email Communications</h1>

      <Tabs defaultValue="log" className="space-y-4">
        <TabsList>
          <TabsTrigger value="log"><Mail className="h-3.5 w-3.5 mr-1.5" />Email Log</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-3.5 w-3.5 mr-1.5" />Branding</TabsTrigger>
        </TabsList>

        {/* Email Log Tab */}
        <TabsContent value="log" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">{stats.sent} sent · {stats.failed} failed · {stats.total} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setReminderDialog('select')}>
                <Bell className="h-4 w-4 mr-1.5" />Send Reminder
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUpdateDialog('select')}>
                <Send className="h-4 w-4 mr-1.5" />Send Update
              </Button>
              <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by email or subject..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {emailTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filtered.slice(0, 100).map(log => {
              const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.queued;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate max-w-[180px]">{log.recipient_email}</span>
                      <Badge variant="outline" className="text-xs">{log.email_type?.replace(/_/g, ' ')}</Badge>
                      <span>{log.created_date ? new Date(log.created_date).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    {log.error_message && <p className="text-xs text-destructive mt-1 truncate">{log.error_message}</p>}
                  </div>
                  {log.status === 'failed' && (
                    <Button variant="ghost" size="sm" onClick={() => handleRetry(log)} disabled={retrying === log.id}>
                      {retrying === log.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No emails found</p>}
            {filtered.length > 100 && <p className="text-center text-sm text-muted-foreground">Showing first 100 of {filtered.length}</p>}
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <EmailBrandingConfig workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      {/* Event Update Dialog */}
      <Dialog open={!!updateDialog} onOpenChange={(o) => !o && setUpdateDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Event Update</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Send an important update to all ticket holders for an event.</p>
          <div className="space-y-3">
            <div>
              <Label>Event</Label>
              <Select value={updateDialog === 'select' ? '' : (updateDialog || '')} onValueChange={v => setUpdateDialog(v)}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_date})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={updateMessage} onChange={e => setUpdateMessage(e.target.value)} placeholder="What's changed? This will be sent to all active ticket holders." rows={4} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateDialog(null)}>Cancel</Button>
              <Button onClick={handleSendUpdate} disabled={sending || !updateMessage.trim() || !updateDialog || updateDialog === 'select'}>
                {sending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Send Update
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Reminder Dialog */}
      <Dialog open={!!reminderDialog} onOpenChange={(o) => !o && setReminderDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Event Reminder</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Manually send a reminder email to all ticket holders. Includes venue/zoom details, QR codes, and manage-order links.</p>
          <div className="space-y-3">
            <div>
              <Label>Event</Label>
              <Select value={reminderDialog === 'select' ? '' : (reminderDialog || '')} onValueChange={v => setReminderDialog(v)}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>{events.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.event_date})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hour">24-Hour Reminder (day before)</SelectItem>
                  <SelectItem value="1hour">1-Hour Reminder (starting soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReminderDialog(null)}>Cancel</Button>
              <Button onClick={handleSendReminder} disabled={sendingReminder || !reminderDialog || reminderDialog === 'select'}>
                {sendingReminder && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Send Reminder
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}