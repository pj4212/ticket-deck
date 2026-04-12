import { useState, useEffect } from 'react';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit, Trash2, Loader2, FileText, Monitor, MapPin, Globe, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplateManager() {
  const { wsFilter, workspaceId } = useWorkspaceFilter();
  const [templates, setTemplates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', default_event_mode: 'in_person',
    default_visibility_mode: 'public_listed',
    default_location_id: '', default_venue_id: '',
    default_start_time: '', default_duration_mins: 120,
    default_timezone: 'Australia/Brisbane',
    recurrence_pattern: 'none',
    default_waiver_text: '', default_terms_text: '',
    default_show_marketing_opt_in: false,
    is_active: true,
  });

  useEffect(() => {
    async function load() {
      const [tmps, locs, vns] = await Promise.all([
        base44.entities.EventTemplate.filter({ ...wsFilter }),
        base44.entities.Location.filter({ ...wsFilter }),
        base44.entities.Venue.filter({ is_active: true }),
      ]);
      setTemplates(tmps.sort((a, b) => a.name.localeCompare(b.name)));
      setLocations(locs);
      setVenues(vns);
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', description: '', default_event_mode: 'in_person',
      default_visibility_mode: 'public_listed',
      default_location_id: '', default_venue_id: '',
      default_start_time: '', default_duration_mins: 120,
      default_timezone: 'Australia/Brisbane',
      recurrence_pattern: 'none',
      default_waiver_text: '', default_terms_text: '',
      default_show_marketing_opt_in: false,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name, description: t.description || '',
      default_event_mode: t.default_event_mode,
      default_visibility_mode: t.default_visibility_mode || 'public_listed',
      default_location_id: t.default_location_id || '',
      default_venue_id: t.default_venue_id || '',
      default_start_time: t.default_start_time || '',
      default_duration_mins: t.default_duration_mins || 120,
      default_timezone: t.default_timezone || 'Australia/Brisbane',
      recurrence_pattern: t.recurrence_pattern || 'none',
      default_waiver_text: t.default_waiver_text || '',
      default_terms_text: t.default_terms_text || '',
      default_show_marketing_opt_in: t.default_show_marketing_opt_in || false,
      is_active: t.is_active !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editing) {
      await base44.entities.EventTemplate.update(editing.id, form);
      setTemplates(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } : t));
      toast.success('Template updated');
    } else {
      const created = await base44.entities.EventTemplate.create({ ...form, ...wsFilter });
      setTemplates(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Template created');
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await base44.entities.EventTemplate.delete(deleteTarget.id);
    setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
    toast.success('Template deleted');
  };

  const modeIcon = (mode) => {
    if (mode === 'online_stream') return <Monitor className="h-4 w-4 text-blue-500" />;
    if (mode === 'hybrid') return <Globe className="h-4 w-4 text-purple-500" />;
    return <MapPin className="h-4 w-4 text-emerald-500" />;
  };

  const modeLabel = (mode) => {
    if (mode === 'online_stream') return 'Online';
    if (mode === 'hybrid') return 'Hybrid';
    return 'In-Person';
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Event Templates</h1>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />New Template</Button>
      </div>

      <p className="text-sm text-muted-foreground">Templates pre-fill event settings so you can create recurring or similar events quickly.</p>

      {templates.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No templates yet. Create one to speed up event creation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <Card key={t.id} className={`relative ${!t.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {modeIcon(t.default_event_mode)}
                    <h3 className="font-semibold text-sm truncate">{t.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">{modeLabel(t.default_event_mode)}</Badge>
                  {t.default_duration_mins && <Badge variant="outline" className="text-xs">{t.default_duration_mins}min</Badge>}
                  {t.recurrence_pattern && t.recurrence_pattern !== 'none' && (
                    <Badge variant="outline" className="text-xs capitalize">{t.recurrence_pattern}</Badge>
                  )}
                  {!t.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Template Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekly Meetup" />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Default Mode <span className="text-destructive">*</span></Label>
                <Select value={form.default_event_mode} onValueChange={v => setForm(p => ({ ...p, default_event_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="online_stream">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Default Visibility</Label>
                <Select value={form.default_visibility_mode} onValueChange={v => setForm(p => ({ ...p, default_visibility_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public_listed">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="password_protected">Password</SelectItem>
                    <SelectItem value="private_invite_only">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Default Location</Label>
                <Select value={form.default_location_id || 'none'} onValueChange={v => setForm(p => ({ ...p, default_location_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Default Venue</Label>
                <Select value={form.default_venue_id || 'none'} onValueChange={v => setForm(p => ({ ...p, default_venue_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Default Start Time</Label>
                <Input type="time" value={form.default_start_time} onChange={e => setForm(p => ({ ...p, default_start_time: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Duration (mins)</Label>
                <Input type="number" min="15" value={form.default_duration_mins} onChange={e => setForm(p => ({ ...p, default_duration_mins: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Recurrence</Label>
              <Select value={form.recurrence_pattern} onValueChange={v => setForm(p => ({ ...p, recurrence_pattern: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-off</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Default Waiver Text</Label>
              <Textarea value={form.default_waiver_text} onChange={e => setForm(p => ({ ...p, default_waiver_text: e.target.value }))} rows={2} placeholder="Leave blank to skip" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label className="text-sm">Active</Label>
            </div>
            <Button onClick={handleSave} disabled={saving || !form.name} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Template</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.name}</strong>? Events created from this template will not be affected.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}