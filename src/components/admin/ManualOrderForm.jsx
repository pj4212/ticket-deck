import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Plus, Trash2, CheckCircle2, AlertTriangle,
  User, Mail, Phone, Ticket, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const ORDER_SOURCES = [
  { value: 'manual', label: 'Manual / Phone Order' },
  { value: 'box_office', label: 'Box Office / Door Sale' },
  { value: 'complimentary', label: 'Complimentary' },
];

const PAYMENT_METHODS = [
  { value: 'card_external', label: 'Card (External Terminal)' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'complimentary', label: 'Complimentary (Free)' },
  { value: 'other', label: 'Other' },
];

export default function ManualOrderForm({ events, workspaceId, onOrderCreated }) {
  const [eventId, setEventId] = useState('');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [source, setSource] = useState('manual');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [timeSlotId, setTimeSlotId] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');

  const [buyer, setBuyer] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [attendees, setAttendees] = useState([{ first_name: '', last_name: '', email: '', ticket_type_id: '' }]);

  const [submitting, setSubmitting] = useState(false);
  const [capacityWarnings, setCapacityWarnings] = useState(null);
  const [result, setResult] = useState(null);

  // Load ticket types + slots when event changes
  useEffect(() => {
    if (!eventId) { setTicketTypes([]); setTimeSlots([]); setSelectedEvent(null); return; }
    const ev = events.find(e => e.id === eventId);
    setSelectedEvent(ev);
    setTimeSlotId('');
    async function load() {
      const [tts, slots] = await Promise.all([
        base44.entities.TicketType.filter({ event_id: eventId }),
        ev?.scheduling_mode === 'timed_entry'
          ? base44.entities.TimeSlot.filter({ event_id: eventId })
          : Promise.resolve([]),
      ]);
      setTicketTypes(tts.filter(tt => tt.is_active));
      setTimeSlots(slots.filter(s => s.is_active).sort((a, b) => a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)));
      // Auto-set first ticket type for attendees
      if (tts.length) {
        setAttendees(prev => prev.map(a => ({ ...a, ticket_type_id: a.ticket_type_id || tts[0].id })));
      }
    }
    load();
  }, [eventId]);

  // When source = complimentary, auto set payment method
  useEffect(() => {
    if (source === 'complimentary') setPaymentMethod('complimentary');
  }, [source]);

  const updateBuyer = (field, value) => setBuyer(prev => ({ ...prev, [field]: value }));
  const updateAttendee = (index, field, value) => {
    setAttendees(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };
  const addAttendee = () => {
    const defaultTT = ticketTypes.length ? ticketTypes[0].id : '';
    setAttendees(prev => [...prev, { first_name: '', last_name: '', email: '', ticket_type_id: defaultTT }]);
  };
  const removeAttendee = (index) => {
    if (attendees.length <= 1) return;
    setAttendees(prev => prev.filter((_, i) => i !== index));
  };
  const copyBuyerToFirst = () => {
    setAttendees(prev => prev.map((a, i) => i === 0 ? { ...a, first_name: buyer.first_name, last_name: buyer.last_name, email: buyer.email } : a));
  };

  // Calculate total
  const ttMap = Object.fromEntries(ticketTypes.map(tt => [tt.id, tt]));
  const isComp = source === 'complimentary';
  const total = isComp ? 0 : attendees.reduce((s, a) => s + (ttMap[a.ticket_type_id]?.price || 0), 0);

  const canSubmit = eventId && buyer.first_name && buyer.last_name && buyer.email &&
    attendees.every(a => a.first_name && a.last_name && a.ticket_type_id);

  const handleSubmit = async (forceOverride = false) => {
    setSubmitting(true);
    setCapacityWarnings(null);
    try {
      const res = await base44.functions.invoke('createManualOrder', {
        event_id: eventId,
        buyer,
        attendees: attendees.map(a => ({ ...a, email: a.email || buyer.email })),
        order_source: source,
        payment_method: paymentMethod,
        admin_notes: adminNotes,
        time_slot_id: timeSlotId || null,
        send_confirmation: sendConfirmation,
        force_override: forceOverride,
      });

      if (res.data.requires_force) {
        setCapacityWarnings(res.data.capacity_warnings);
        setSubmitting(false);
        return;
      }

      setResult(res.data);
      toast.success(`Order ${res.data.order_number} created — ${res.data.tickets_created} ticket(s)`);
      onOrderCreated?.();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.requires_force && data?.capacity_warnings) {
        setCapacityWarnings(data.capacity_warnings);
      } else {
        toast.error(data?.error || err.message || 'Failed to create order');
      }
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setResult(null);
    setCapacityWarnings(null);
    setBuyer({ first_name: '', last_name: '', email: '', phone: '' });
    setAttendees([{ first_name: '', last_name: '', email: '', ticket_type_id: ticketTypes[0]?.id || '' }]);
    setAdminNotes('');
  };

  const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };

  // Success state
  if (result) {
    return (
      <Card className="border-emerald-500/30">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
          <div>
            <h3 className="text-lg font-bold">Order Created</h3>
            <p className="text-muted-foreground">
              Order <span className="font-mono font-semibold text-foreground">{result.order_number}</span> — {result.tickets_created} ticket(s) issued
            </p>
            {result.capacity_warnings?.length > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                Capacity override applied
              </div>
            )}
          </div>
          <Button onClick={handleReset} className="gap-2">
            <Plus className="h-4 w-4" /> Create Another Order
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Event + Source */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-1">
          <Label>Event *</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} — {e.event_date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Order Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORDER_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={source === 'complimentary'}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time Slot (if timed entry) */}
      {selectedEvent?.scheduling_mode === 'timed_entry' && timeSlots.length > 0 && (
        <div>
          <Label>Time Slot</Label>
          <Select value={timeSlotId} onValueChange={setTimeSlotId}>
            <SelectTrigger><SelectValue placeholder="Select time slot..." /></SelectTrigger>
            <SelectContent>
              {timeSlots.map(s => {
                const remaining = s.capacity - (s.booked || 0);
                return (
                  <SelectItem key={s.id} value={s.id} disabled={remaining <= 0}>
                    {s.slot_date} · {fmtTime(s.start_time)} – {fmtTime(s.end_time)} ({remaining} left)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Buyer Info */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <User className="h-4 w-4" /> Buyer Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>First Name *</Label><Input value={buyer.first_name} onChange={e => updateBuyer('first_name', e.target.value)} /></div>
          <div><Label>Last Name *</Label><Input value={buyer.last_name} onChange={e => updateBuyer('last_name', e.target.value)} /></div>
          <div><Label>Email *</Label><Input type="email" value={buyer.email} onChange={e => updateBuyer('email', e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={buyer.phone} onChange={e => updateBuyer('phone', e.target.value)} /></div>
        </div>
      </div>

      <Separator />

      {/* Attendees */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Ticket className="h-4 w-4" /> Attendees ({attendees.length})
          </h3>
          <div className="flex gap-2">
            {buyer.first_name && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={copyBuyerToFirst}>
                Copy buyer → attendee 1
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addAttendee} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {attendees.map((att, i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Attendee {i + 1}</span>
                  {attendees.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttendee(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div><Label className="text-xs">First Name *</Label><Input value={att.first_name} onChange={e => updateAttendee(i, 'first_name', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Last Name *</Label><Input value={att.last_name} onChange={e => updateAttendee(i, 'last_name', e.target.value)} className="h-8 text-sm" /></div>
                  <div><Label className="text-xs">Email</Label><Input type="email" value={att.email} onChange={e => updateAttendee(i, 'email', e.target.value)} className="h-8 text-sm" placeholder={buyer.email || 'Uses buyer email'} /></div>
                  <div>
                    <Label className="text-xs">Ticket Type *</Label>
                    <Select value={att.ticket_type_id} onValueChange={v => updateAttendee(i, 'ticket_type_id', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {ticketTypes.map(tt => {
                          const avail = tt.capacity_limit != null ? tt.capacity_limit - (tt.quantity_sold || 0) - (tt.quantity_reserved || 0) : '∞';
                          return (
                            <SelectItem key={tt.id} value={tt.id}>
                              {tt.name} — {isComp ? 'Free' : `$${(tt.price || 0).toFixed(2)}`} ({avail} avail)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Admin Notes */}
      <div>
        <Label>Admin Notes</Label>
        <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes about this order..." className="h-16" />
      </div>

      {/* Options */}
      <div className="flex items-center gap-3">
        <Switch checked={sendConfirmation} onCheckedChange={setSendConfirmation} id="send-conf" />
        <Label htmlFor="send-conf" className="text-sm cursor-pointer">Send confirmation email to buyer</Label>
      </div>

      {/* Capacity Warnings */}
      {capacityWarnings && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" /> Capacity Issues Detected
          </div>
          <ul className="text-xs text-amber-300 space-y-1">
            {capacityWarnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCapacityWarnings(null)}>Cancel</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleSubmit(true)} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Override & Create Anyway
            </Button>
          </div>
        </div>
      )}

      {/* Summary + Submit */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            Total: {isComp ? 'Complimentary' : `$${total.toFixed(2)} AUD`}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {attendees.length} ticket{attendees.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button onClick={() => handleSubmit(false)} disabled={!canSubmit || submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Create Order
        </Button>
      </div>
    </div>
  );
}