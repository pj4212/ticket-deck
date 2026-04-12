import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Trash2, Webhook, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_TYPES = [
  { value: '*', label: 'All events' },
  { value: 'order.created', label: 'Order created' },
  { value: 'order.completed', label: 'Order completed' },
  { value: 'order.refunded', label: 'Order refunded' },
  { value: 'ticket.checked_in', label: 'Ticket checked in' },
  { value: 'ticket.cancelled', label: 'Ticket cancelled' },
  { value: 'event.published', label: 'Event published' },
  { value: 'event.cancelled', label: 'Event cancelled' },
  { value: 'event.updated', label: 'Event updated' },
];

export default function WebhookSettings() {
  const { workspaceId } = useOutletContext();
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEp, setEditEp] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState([]);

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    const eps = workspaceId
      ? await base44.entities.WebhookEndpoint.filter({ workspace_id: workspaceId })
      : await base44.entities.WebhookEndpoint.filter({});
    setEndpoints(eps);
    setLoading(false);
  }

  const generateSecret = () => {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return 'whsec_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      workspace_id: workspaceId, url: editEp.url, description: editEp.description || '',
      event_types: JSON.stringify(selectedEvents), secret: editEp.secret || '',
      is_active: editEp.is_active !== false,
    };
    if (editEp.id) { await base44.entities.WebhookEndpoint.update(editEp.id, data); }
    else { await base44.entities.WebhookEndpoint.create(data); }
    toast.success('Webhook endpoint saved');
    setEditEp(null); setSaving(false); load();
  };

  const handleDelete = async (ep) => {
    await base44.entities.WebhookEndpoint.delete(ep.id);
    toast.success('Endpoint deleted');
    load();
  };

  const openEdit = (ep) => {
    let events = [];
    try { events = JSON.parse(ep?.event_types || '[]'); } catch { events = []; }
    setSelectedEvents(events);
    setEditEp(ep || { url: '', description: '', secret: generateSecret(), is_active: true });
  };

  const toggleEvent = (type) => {
    setSelectedEvents(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhook Endpoints</h1>
          <p className="text-sm text-muted-foreground">Receive real-time notifications when events occur in your workspace.</p>
        </div>
        <Button size="sm" onClick={() => openEdit(null)}><Plus className="h-4 w-4 mr-1.5" />Add Endpoint</Button>
      </div>

      {endpoints.length === 0 && (
        <div className="text-center py-12">
          <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">No webhook endpoints</h2>
          <p className="text-sm text-muted-foreground mb-4">Add an endpoint to receive event notifications.</p>
          <Button size="sm" onClick={() => openEdit(null)}>Add Endpoint</Button>
        </div>
      )}

      <div className="space-y-3">
        {endpoints.map(ep => {
          let events = [];
          try { events = JSON.parse(ep.event_types || '[]'); } catch { events = []; }
          const healthy = ep.failure_count === 0;

          return (
            <div key={ep.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {healthy ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                    <p className="font-medium text-sm truncate">{ep.url}</p>
                    <Badge variant={ep.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">{ep.is_active ? 'Active' : 'Disabled'}</Badge>
                  </div>
                  {ep.description && <p className="text-xs text-muted-foreground mt-1">{ep.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {events.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {ep.last_triggered_at && <span>Last: {new Date(ep.last_triggered_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    {ep.failure_count > 0 && <span className="text-destructive">{ep.failure_count} failures</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit({ ...ep })}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ep)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editEp} onOpenChange={(o) => !o && setEditEp(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEp?.id ? 'Edit Endpoint' : 'Add Webhook Endpoint'}</DialogTitle></DialogHeader>
          {editEp && (
            <div className="space-y-4">
              <div>
                <Label>Endpoint URL</Label>
                <Input value={editEp.url} onChange={e => setEditEp(p => ({ ...p, url: e.target.value }))} placeholder="https://your-app.com/webhook" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editEp.description || ''} onChange={e => setEditEp(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div>
                <Label>Signing Secret</Label>
                <div className="flex gap-2">
                  <Input value={editEp.secret || ''} onChange={e => setEditEp(p => ({ ...p, secret: e.target.value }))} className="font-mono text-xs" readOnly />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(editEp.secret || ''); toast.success('Copied'); }}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Use this to verify webhook signatures.</p>
              </div>
              <div>
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {EVENT_TYPES.map(et => (
                    <label key={et.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedEvents.includes(et.value)} onChange={() => toggleEvent(et.value)} className="rounded" />
                      {et.label}
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditEp(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !editEp.url}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}