import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, Calendar, Plus, Trash2, Copy, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import SlotGenerator from '@/components/admin/SlotGenerator';

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

export default function TimeSlotManagement() {
  const { wsFilter, workspaceId } = useWorkspaceFilter();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [editSlot, setEditSlot] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const evs = await base44.entities.Event.filter({ ...wsFilter, scheduling_mode: 'timed_entry' });
      setEvents(evs.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')));
      if (evs.length) setSelectedEventId(evs[0].id);
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  useEffect(() => {
    if (!selectedEventId) { setSlots([]); return; }
    base44.entities.TimeSlot.filter({ event_id: selectedEventId }).then(s =>
      setSlots(s.sort((a, b) => a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)))
    );
  }, [selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const filteredSlots = useMemo(() => {
    if (!dateFilter) return slots;
    return slots.filter(s => s.slot_date === dateFilter);
  }, [slots, dateFilter]);

  const dates = useMemo(() => [...new Set(slots.map(s => s.slot_date))].sort(), [slots]);

  const summaryStats = useMemo(() => {
    const total = filteredSlots.length;
    const totalCap = filteredSlots.reduce((s, sl) => s + (sl.capacity || 0), 0);
    const totalBooked = filteredSlots.reduce((s, sl) => s + (sl.booked || 0), 0);
    const fullSlots = filteredSlots.filter(s => (s.booked || 0) >= s.capacity).length;
    return { total, totalCap, totalBooked, fullSlots };
  }, [filteredSlots]);

  const handleGenerateSlots = async (newSlots) => {
    const created = await base44.entities.TimeSlot.bulkCreate(newSlots);
    setSlots(prev => [...prev, ...created].sort((a, b) =>
      a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)
    ));
    toast.success(`Created ${created.length} time slots`);
    setShowGenerator(false);
  };

  const handleSaveSlot = async () => {
    if (!editSlot) return;
    setSaving(true);
    if (editSlot.id) {
      await base44.entities.TimeSlot.update(editSlot.id, {
        capacity: editSlot.capacity,
        is_active: editSlot.is_active,
        label: editSlot.label || '',
        start_time: editSlot.start_time,
        end_time: editSlot.end_time,
      });
      setSlots(prev => prev.map(s => s.id === editSlot.id ? { ...s, ...editSlot } : s));
    } else {
      const created = await base44.entities.TimeSlot.create({
        event_id: selectedEventId,
        slot_date: editSlot.slot_date,
        start_time: editSlot.start_time,
        end_time: editSlot.end_time,
        capacity: editSlot.capacity,
        booked: 0,
        is_active: true,
        label: editSlot.label || '',
      });
      setSlots(prev => [...prev, created].sort((a, b) =>
        a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)
      ));
    }
    setSaving(false);
    setEditSlot(null);
    toast.success('Slot saved');
  };

  const handleDeleteSlot = async (slotId) => {
    await base44.entities.TimeSlot.delete(slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    toast.success('Slot deleted');
  };

  const handleDuplicateDate = async (sourceDate) => {
    const sourceSlots = slots.filter(s => s.slot_date === sourceDate);
    if (!sourceSlots.length) return;
    // Find next available date
    const nextDate = format(new Date(new Date(sourceDate + 'T00:00:00').getTime() + 86400000), 'yyyy-MM-dd');
    const newSlots = sourceSlots.map(s => ({
      event_id: selectedEventId,
      slot_date: nextDate,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity,
      booked: 0,
      is_active: true,
      label: s.label || '',
    }));
    const created = await base44.entities.TimeSlot.bulkCreate(newSlots);
    setSlots(prev => [...prev, ...created].sort((a, b) =>
      a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)
    ));
    toast.success(`Duplicated ${created.length} slots to ${nextDate}`);
  };

  const handleToggleSlot = async (slot) => {
    const updated = !slot.is_active;
    await base44.entities.TimeSlot.update(slot.id, { is_active: updated });
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_active: updated } : s));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Time Slots</h1>
        <div className="text-center py-12 border border-dashed rounded-xl">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No timed-entry events found.</p>
          <p className="text-sm text-muted-foreground mt-1">Set an event's scheduling mode to "Timed Entry" in the event form.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Time Slots</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowGenerator(!showGenerator)} className="gap-1">
            {showGenerator ? 'Hide' : 'Generate Slots'}
          </Button>
          <Button size="sm" onClick={() => setEditSlot({
            slot_date: dateFilter || format(new Date(), 'yyyy-MM-dd'),
            start_time: '09:00', end_time: '09:30',
            capacity: selectedEvent?.slot_default_capacity || 20, is_active: true, label: ''
          })} className="gap-1">
            <Plus className="h-4 w-4" />Add Slot
          </Button>
        </div>
      </div>

      {/* Event selector */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[200px]">
          <Label className="text-xs">Event</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Filter Date</Label>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        </div>
        {dateFilter && <Button variant="outline" size="sm" onClick={() => setDateFilter('')}>Clear</Button>}
      </div>

      {showGenerator && (
        <SlotGenerator
          eventId={selectedEventId}
          defaultCapacity={selectedEvent?.slot_default_capacity || 20}
          onGenerated={handleGenerateSlots}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Slots</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{summaryStats.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Capacity</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{summaryStats.totalCap}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Booked</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-primary">{summaryStats.totalBooked}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Full Slots</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-destructive">{summaryStats.fullSlots}</p></CardContent></Card>
      </div>

      {/* Slots table grouped by date */}
      {dates.filter(d => !dateFilter || d === dateFilter).map(date => (
        <div key={date} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">{format(parseISO(date), 'EEEE, d MMM yyyy')}</h3>
              <Badge variant="outline" className="text-xs">{slots.filter(s => s.slot_date === date).length} slots</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDuplicateDate(date)} className="gap-1 text-xs">
              <Copy className="h-3 w-3" />Duplicate Day
            </Button>
          </div>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.filter(s => s.slot_date === date).map(slot => {
                  const remaining = Math.max(0, slot.capacity - (slot.booked || 0));
                  const pct = slot.capacity > 0 ? Math.round(((slot.booked || 0) / slot.capacity) * 100) : 0;
                  return (
                    <TableRow key={slot.id} className={!slot.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">{fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}</TableCell>
                      <TableCell className="text-sm">{slot.label || '—'}</TableCell>
                      <TableCell>{slot.capacity}</TableCell>
                      <TableCell className="font-semibold">{slot.booked || 0}</TableCell>
                      <TableCell>
                        <span className={remaining === 0 ? 'text-destructive font-semibold' : remaining <= 5 ? 'text-amber-400' : ''}>
                          {remaining}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch checked={slot.is_active} onCheckedChange={() => handleToggleSlot(slot)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setEditSlot({ ...slot })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => handleDeleteSlot(slot.id)} disabled={(slot.booked || 0) > 0}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {filteredSlots.length === 0 && !showGenerator && (
        <div className="text-center py-8 border border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">No slots found. Use the generator or add manually.</p>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editSlot} onOpenChange={open => !open && setEditSlot(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editSlot?.id ? 'Edit Slot' : 'Add Slot'}</DialogTitle></DialogHeader>
          {editSlot && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={editSlot.slot_date} onChange={e => setEditSlot({ ...editSlot, slot_date: e.target.value })} disabled={!!editSlot.id} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input type="time" value={editSlot.start_time} onChange={e => setEditSlot({ ...editSlot, start_time: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Input type="time" value={editSlot.end_time} onChange={e => setEditSlot({ ...editSlot, end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Capacity</Label>
                <Input type="number" min="1" value={editSlot.capacity} onChange={e => setEditSlot({ ...editSlot, capacity: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Label (optional)</Label>
                <Input value={editSlot.label || ''} onChange={e => setEditSlot({ ...editSlot, label: e.target.value })} placeholder="e.g. Morning Session" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editSlot.is_active !== false} onCheckedChange={v => setEditSlot({ ...editSlot, is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
            <Button onClick={handleSaveSlot} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}