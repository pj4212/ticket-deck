import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Edit, Clock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformSubscriptions() {
  const { isReadOnly } = useOutletContext();
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null);
  const [extendDialog, setExtendDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, s, w] = await Promise.all([
      base44.entities.SubscriptionPlan.filter({}),
      base44.entities.WorkspaceSubscription.filter({}),
      base44.entities.Workspace.filter({}),
    ]);
    setPlans(p.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    setSubscriptions(s);
    setWorkspaces(w);
    setLoading(false);
  }

  const wsMap = Object.fromEntries(workspaces.map(w => [w.id, w]));
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

  const handleSavePlan = async () => {
    setSaving(true);
    const data = {
      name: editPlan.name, slug: editPlan.slug,
      description: editPlan.description || '', monthly_price: Number(editPlan.monthly_price) || 0,
      annual_price: Number(editPlan.annual_price) || 0, seat_limit: Number(editPlan.seat_limit) || 0,
      event_limit: Number(editPlan.event_limit) || 0, ticket_volume_limit: Number(editPlan.ticket_volume_limit) || 0,
      trial_days: Number(editPlan.trial_days) || 14, sort_order: Number(editPlan.sort_order) || 0,
      feature_flags_json: editPlan.feature_flags_json || '{}', is_active: editPlan.is_active !== false,
    };
    if (editPlan.id) { await base44.entities.SubscriptionPlan.update(editPlan.id, data); }
    else { await base44.entities.SubscriptionPlan.create(data); }
    toast.success('Plan saved');
    setEditPlan(null); setSaving(false); load();
  };

  const handleAssignPlan = async () => {
    setSaving(true);
    await base44.functions.invoke('platformAdmin', {
      action: 'assign_plan', workspace_id: assignDialog.workspace_id,
      plan_id: assignDialog.plan_id, billing_status: assignDialog.billing_status,
      trial_days: Number(assignDialog.trial_days) || 14,
    });
    toast.success('Plan assigned');
    setAssignDialog(null); setSaving(false); load();
  };

  const handleExtendTrial = async () => {
    setSaving(true);
    await base44.functions.invoke('platformAdmin', {
      action: 'extend_trial', subscription_id: extendDialog.id, extra_days: Number(extendDialog.extra_days) || 14,
    });
    toast.success('Trial extended');
    setExtendDialog(null); setSaving(false); load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const fmtCurrency = (v) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(v || 0);

  const statusColors = { trialing: 'bg-blue-500/15 text-blue-400', active: 'bg-emerald-500/15 text-emerald-400', past_due: 'bg-orange-500/15 text-orange-400', cancelled: 'bg-muted text-muted-foreground', suspended: 'bg-red-500/15 text-red-400' };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Subscription Management</h1>

      <Tabs defaultValue="subscriptions">
        <TabsList><TabsTrigger value="subscriptions">Workspace Subscriptions</TabsTrigger><TabsTrigger value="plans">Plans</TabsTrigger></TabsList>

        <TabsContent value="subscriptions" className="space-y-3 mt-4">
          {!isReadOnly && (
            <Button size="sm" onClick={() => setAssignDialog({ workspace_id: '', plan_id: '', billing_status: 'trialing', trial_days: 14 })}>
              <Plus className="h-4 w-4 mr-1.5" />Assign Plan
            </Button>
          )}

          {subscriptions.map(sub => {
            const ws = wsMap[sub.workspace_id];
            const plan = planMap[sub.plan_id];
            return (
              <div key={sub.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{ws?.name || 'Unknown Workspace'}</p>
                    <p className="text-xs text-muted-foreground">{plan?.name || 'Unknown Plan'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${statusColors[sub.billing_status] || ''}`}>{sub.billing_status}</Badge>
                    {!isReadOnly && sub.billing_status === 'trialing' && (
                      <Button variant="ghost" size="icon" onClick={() => setExtendDialog({ ...sub, extra_days: 14 })}>
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                  <div><p className="text-muted-foreground">Trial Ends</p><p>{sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : '—'}</p></div>
                  <div><p className="text-muted-foreground">Period End</p><p>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}</p></div>
                  <div><p className="text-muted-foreground">Seats</p><p>{sub.seats_used || 0}{plan?.seat_limit ? ` / ${plan.seat_limit}` : ''}</p></div>
                  <div><p className="text-muted-foreground">Tickets</p><p>{sub.tickets_used || 0}{plan?.ticket_volume_limit ? ` / ${plan.ticket_volume_limit}` : ''}</p></div>
                </div>
                {sub.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {sub.notes}</p>}
              </div>
            );
          })}
          {subscriptions.length === 0 && <p className="text-center text-muted-foreground py-8">No subscriptions yet</p>}
        </TabsContent>

        <TabsContent value="plans" className="space-y-3 mt-4">
          {!isReadOnly && (
            <Button size="sm" onClick={() => setEditPlan({ name: '', slug: '', monthly_price: 0, annual_price: 0, seat_limit: 0, event_limit: 0, ticket_volume_limit: 0, trial_days: 14, sort_order: 0, feature_flags_json: '{}', is_active: true })}>
              <Plus className="h-4 w-4 mr-1.5" />Create Plan
            </Button>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className={`bg-card border rounded-xl p-4 ${plan.is_active ? 'border-border' : 'border-border/50 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{plan.name}</p>
                  {!isReadOnly && <Button variant="ghost" size="icon" onClick={() => setEditPlan({ ...plan })}><Edit className="h-4 w-4" /></Button>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.description || '—'}</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-2xl font-bold">{fmtCurrency(plan.monthly_price)}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div><p className="text-muted-foreground">Seats</p><p>{plan.seat_limit || '∞'}</p></div>
                  <div><p className="text-muted-foreground">Events</p><p>{plan.event_limit || '∞'}</p></div>
                  <div><p className="text-muted-foreground">Tickets</p><p>{plan.ticket_volume_limit || '∞'}</p></div>
                  <div><p className="text-muted-foreground">Trial</p><p>{plan.trial_days || 0}d</p></div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPlan?.id ? 'Edit Plan' : 'Create Plan'}</DialogTitle></DialogHeader>
          {editPlan && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={editPlan.name} onChange={e => setEditPlan(p => ({ ...p, name: e.target.value, slug: p.id ? p.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></div>
                <div><Label>Slug</Label><Input value={editPlan.slug} onChange={e => setEditPlan(p => ({ ...p, slug: e.target.value }))} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={editPlan.description || ''} onChange={e => setEditPlan(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monthly Price (AUD)</Label><Input type="number" value={editPlan.monthly_price || ''} onChange={e => setEditPlan(p => ({ ...p, monthly_price: e.target.value }))} /></div>
                <div><Label>Annual Price (AUD)</Label><Input type="number" value={editPlan.annual_price || ''} onChange={e => setEditPlan(p => ({ ...p, annual_price: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Seat Limit</Label><Input type="number" value={editPlan.seat_limit || ''} onChange={e => setEditPlan(p => ({ ...p, seat_limit: e.target.value }))} placeholder="0 = ∞" /></div>
                <div><Label>Event Limit</Label><Input type="number" value={editPlan.event_limit || ''} onChange={e => setEditPlan(p => ({ ...p, event_limit: e.target.value }))} placeholder="0 = ∞" /></div>
                <div><Label>Ticket Limit</Label><Input type="number" value={editPlan.ticket_volume_limit || ''} onChange={e => setEditPlan(p => ({ ...p, ticket_volume_limit: e.target.value }))} placeholder="0 = ∞" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Trial Days</Label><Input type="number" value={editPlan.trial_days || ''} onChange={e => setEditPlan(p => ({ ...p, trial_days: e.target.value }))} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={editPlan.sort_order || ''} onChange={e => setEditPlan(p => ({ ...p, sort_order: e.target.value }))} /></div>
              </div>
              <div><Label>Feature Flags (JSON)</Label><Textarea value={editPlan.feature_flags_json || '{}'} onChange={e => setEditPlan(p => ({ ...p, feature_flags_json: e.target.value }))} rows={3} className="font-mono text-xs" /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditPlan(null)}>Cancel</Button>
                <Button onClick={handleSavePlan} disabled={saving || !editPlan.name}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Plan to Workspace</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-3">
              <div><Label>Workspace</Label>
                <Select value={assignDialog.workspace_id} onValueChange={v => setAssignDialog(p => ({ ...p, workspace_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select workspace" /></SelectTrigger>
                  <SelectContent>{workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Plan</Label>
                <Select value={assignDialog.plan_id} onValueChange={v => setAssignDialog(p => ({ ...p, plan_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>{plans.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Initial Status</Label>
                <Select value={assignDialog.billing_status} onValueChange={v => setAssignDialog(p => ({ ...p, billing_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {assignDialog.billing_status === 'trialing' && (
                <div><Label>Trial Days</Label><Input type="number" value={assignDialog.trial_days || ''} onChange={e => setAssignDialog(p => ({ ...p, trial_days: e.target.value }))} /></div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
                <Button onClick={handleAssignPlan} disabled={saving || !assignDialog.workspace_id || !assignDialog.plan_id}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Assign</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={(o) => !o && setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extend Trial</DialogTitle></DialogHeader>
          {extendDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Current trial ends: {extendDialog.trial_ends_at ? new Date(extendDialog.trial_ends_at).toLocaleDateString() : '—'}</p>
              <div><Label>Additional Days</Label><Input type="number" value={extendDialog.extra_days || ''} onChange={e => setExtendDialog(p => ({ ...p, extra_days: e.target.value }))} /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExtendDialog(null)}>Cancel</Button>
                <Button onClick={handleExtendTrial} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Extend</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}