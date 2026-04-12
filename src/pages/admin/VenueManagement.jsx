import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Loader2, MapPin, Search, ExternalLink, Car } from 'lucide-react';

export default function VenueManagement() {
  const { workspaceId } = useOutletContext();
  const [venues, setVenues] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVenue, setEditVenue] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', location_id: '', address: '', venue_link: '', parking_link: '', details: '', default_capacity: '', is_active: true });

  useEffect(() => {
    async function load() {
      if (!workspaceId) { setLoading(false); return; }
      const [v, l] = await Promise.all([
        base44.entities.Venue.filter({ workspace_id: workspaceId }),
        base44.entities.Location.filter({ workspace_id: workspaceId }),
      ]);
      setVenues(v);
      setLocations(l);
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const openNew = () => {
    setForm({ name: '', location_id: '', address: '', venue_link: '', parking_link: '', details: '', default_capacity: '', is_active: true });
    setEditVenue('new');
  };

  const openEdit = (v) => {
    setForm({
      name: v.name, location_id: v.location_id || '', address: v.address || '',
      venue_link: v.venue_link || '', parking_link: v.parking_link || '',
      details: v.details || '', default_capacity: v.default_capacity || '',
      is_active: v.is_active !== false,
    });
    setEditVenue(v.id);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, default_capacity: form.default_capacity ? Number(form.default_capacity) : null };
    if (editVenue === 'new') {
      const created = await base44.entities.Venue.create({ ...data, workspace_id: workspaceId });
      setVenues(prev => [...prev, created]);
    } else {
      await base44.entities.Venue.update(editVenue, data);
      setVenues(prev => prev.map(v => v.id === editVenue ? { ...v, ...data } : v));
    }
    setEditVenue(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this venue?')) return;
    await base44.entities.Venue.delete(id);
    setVenues(prev => prev.filter(v => v.id !== id));
  };

  const filtered = venues.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || (v.address || '').toLowerCase().includes(q);
  });

  const getLocationName = (id) => locations.find(l => l.id === id)?.name || '';

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Venues</h1>
          <p className="text-sm text-muted-foreground">Manage reusable venue profiles for events</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Venue</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search venues..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.map(v => (
          <Card key={v.id} className="cursor-pointer" onClick={() => openEdit(v)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold truncate">{v.name}</span>
                    {!v.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  {v.address && <p className="text-xs text-muted-foreground truncate">{v.address}</p>}
                  {v.location_id && <p className="text-xs text-muted-foreground">{getLocationName(v.location_id)}</p>}
                  {v.default_capacity && <p className="text-xs text-muted-foreground">Capacity: {v.default_capacity}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No venues found</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Links</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(v => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{getLocationName(v.location_id) || '—'}</TableCell>
                <TableCell className="max-w-[200px] truncate">{v.address || '—'}</TableCell>
                <TableCell>{v.default_capacity || '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {v.venue_link && <a href={v.venue_link} target="_blank" rel="noopener noreferrer"><Badge variant="outline" className="text-xs gap-1"><ExternalLink className="h-3 w-3" />Map</Badge></a>}
                    {v.parking_link && <a href={v.parking_link} target="_blank" rel="noopener noreferrer"><Badge variant="outline" className="text-xs gap-1"><Car className="h-3 w-3" />Parking</Badge></a>}
                  </div>
                </TableCell>
                <TableCell><Badge variant={v.is_active !== false ? 'default' : 'secondary'}>{v.is_active !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editVenue} onOpenChange={() => setEditVenue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editVenue === 'new' ? 'Add Venue' : 'Edit Venue'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label>Venue Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Convention Centre Hall A" /></div>
            <div>
              <Label>Location</Label>
              <Select value={form.location_id} onValueChange={v => setForm({ ...form, location_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name} — {l.city}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, Brisbane" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Venue Link</Label><Input value={form.venue_link} onChange={e => setForm({ ...form, venue_link: e.target.value })} placeholder="https://maps.google.com/..." /></div>
              <div><Label>Parking Link</Label><Input value={form.parking_link} onChange={e => setForm({ ...form, parking_link: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div><Label>Default Capacity</Label><Input type="number" value={form.default_capacity} onChange={e => setForm({ ...form, default_capacity: e.target.value })} /></div>
            <div><Label>Details / Notes</Label><Textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} rows={3} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVenue(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{editVenue === 'new' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}