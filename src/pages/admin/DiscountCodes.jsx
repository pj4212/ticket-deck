import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Tag, Loader2, Pencil, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function DiscountCodes() {
  const { wsFilter, workspaceId } = useWorkspaceFilter();
  const [codes, setCodes] = useState([]);
  const [events, setEvents] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(getEmptyForm());

  function getEmptyForm() {
    return {
      code: '', description: '', discount_type: 'percentage', discount_value: 0,
      usage_limit: '', per_order_limit: 1, valid_from: '', valid_until: '',
      applicable_event_ids: [], applicable_ticket_type_ids: [], is_active: true,
    };
  }

  useEffect(() => { load(); }, [workspaceId]);

  async function load() {
    setLoading(true);
    const [c, e, tt] = await Promise.all([
      base44.entities.DiscountCode.filter({ ...wsFilter }),
      base44.entities.Event.filter({ ...wsFilter }),
      base44.entities.TicketType.filter({}),
    ]);
    setCodes(c);
    setEvents(e);
    setTicketTypes(tt);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(getEmptyForm());
    setDialogOpen(true);
  }

  function openEdit(dc) {
    setEditing(dc);
    let eventIds = [], ttIds = [];
    try { eventIds = JSON.parse(dc.applicable_event_ids_json || '[]'); } catch (_) {}
    try { ttIds = JSON.parse(dc.applicable_ticket_type_ids_json || '[]'); } catch (_) {}
    setForm({
      code: dc.code, description: dc.description || '', discount_type: dc.discount_type,
      discount_value: dc.discount_value, usage_limit: dc.usage_limit ?? '',
      per_order_limit: dc.per_order_limit || 1,
      valid_from: dc.valid_from ? dc.valid_from.slice(0, 16) : '',
      valid_until: dc.valid_until ? dc.valid_until.slice(0, 16) : '',
      applicable_event_ids: eventIds, applicable_ticket_type_ids: ttIds,
      is_active: dc.is_active !== false,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.discount_value) {
      toast.error('Code and discount value are required');
      return;
    }
    setSaving(true);
    const data = {
      workspace_id: workspaceId,
      code: form.code.toUpperCase().trim(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value) || 0,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      per_order_limit: parseInt(form.per_order_limit) || 1,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      applicable_event_ids_json: form.applicable_event_ids.length ? JSON.stringify(form.applicable_event_ids) : '',
      applicable_ticket_type_ids_json: form.applicable_ticket_type_ids.length ? JSON.stringify(form.applicable_ticket_type_ids) : '',
      is_active: form.is_active,
    };

    if (editing) {
      await base44.entities.DiscountCode.update(editing.id, data);
      toast.success('Discount code updated');
    } else {
      await base44.entities.DiscountCode.create(data);
      toast.success('Discount code created');
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  }

  async function handleDelete(dc) {
    if (!confirm(`Delete code "${dc.code}"?`)) return;
    await base44.entities.DiscountCode.delete(dc.id);
    toast.success('Deleted');
    load();
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const eventMap = Object.fromEntries(events.map(e => [e.id, e]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage promotional codes for your events</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Code</Button>
      </div>

      {codes.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No discount codes yet</p>
          <Button variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Create One</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map(dc => {
                let eventNames = 'All events';
                try {
                  const ids = JSON.parse(dc.applicable_event_ids_json || '[]');
                  if (ids.length) eventNames = ids.map(id => eventMap[id]?.name || '?').join(', ');
                } catch (_) {}
                return (
                  <TableRow key={dc.id}>
                    <TableCell>
                      <span className="font-mono font-semibold">{dc.code}</span>
                      {dc.description && <p className="text-xs text-muted-foreground mt-0.5">{dc.description}</p>}
                    </TableCell>
                    <TableCell>
                      {dc.discount_type === 'percentage' ? `${dc.discount_value}%` : `$${dc.discount_value.toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      {dc.times_used || 0}{dc.usage_limit ? ` / ${dc.usage_limit}` : ''}
                    </TableCell>
                    <TableCell className="text-xs">
                      {dc.valid_from ? new Date(dc.valid_from).toLocaleDateString() : '—'}
                      {' → '}
                      {dc.valid_until ? new Date(dc.valid_until).toLocaleDateString() : '∞'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{eventNames}</TableCell>
                    <TableCell>
                      <Badge variant={dc.is_active ? 'default' : 'secondary'}>
                        {dc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(dc)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(dc)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Discount Code' : 'New Discount Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER20" className="uppercase font-mono" />
                <Button variant="outline" size="sm" onClick={generateCode} type="button">Generate</Button>
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Internal note" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.discount_type === 'percentage' ? 'Percentage' : 'Amount'}</Label>
                <Input type="number" min="0" step={form.discount_type === 'percentage' ? '1' : '0.01'}
                  value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Usage Limit</Label>
                <Input type="number" min="0" placeholder="Unlimited" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} />
              </div>
              <div>
                <Label>Per Order Limit</Label>
                <Input type="number" min="1" value={form.per_order_limit} onChange={e => setForm({ ...form, per_order_limit: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid From</Label>
                <Input type="datetime-local" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <Label>Valid Until</Label>
                <Input type="datetime-local" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Applicable Events (leave empty for all)</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1 mt-1">
                {events.filter(e => e.status === 'published' || e.status === 'draft').map(e => (
                  <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.applicable_event_ids.includes(e.id)}
                      onChange={ev => {
                        const ids = ev.target.checked
                          ? [...form.applicable_event_ids, e.id]
                          : form.applicable_event_ids.filter(id => id !== e.id);
                        setForm({ ...form, applicable_event_ids: ids });
                      }}
                    />
                    <span className="truncate">{e.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Applicable Ticket Types (leave empty for all)</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1 mt-1">
                {ticketTypes.filter(tt => {
                  if (form.applicable_event_ids.length) return form.applicable_event_ids.includes(tt.event_id);
                  return true;
                }).map(tt => (
                  <label key={tt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.applicable_ticket_type_ids.includes(tt.id)}
                      onChange={ev => {
                        const ids = ev.target.checked
                          ? [...form.applicable_ticket_type_ids, tt.id]
                          : form.applicable_ticket_type_ids.filter(id => id !== tt.id);
                        setForm({ ...form, applicable_ticket_type_ids: ids });
                      }}
                    />
                    <span className="truncate">{tt.name} — {eventMap[tt.event_id]?.name || '?'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editing ? 'Save Changes' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}