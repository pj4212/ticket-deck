import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, MapPin, Monitor, Loader2, ArrowLeft, Lock } from 'lucide-react';
import TicketSelector from '@/components/booking/TicketSelector';
import BuyerForm from '@/components/booking/BuyerForm';
import AttendeeForm from '@/components/booking/AttendeeForm';
import OrderSummary from '@/components/booking/OrderSummary';

const BUYER_KEY = 'sp_buyer';

function loadSavedBuyer() {
  try { return JSON.parse(localStorage.getItem(BUYER_KEY)) || {}; } catch { return {}; }
}

export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [seriesSlug, setSeriesSlug] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password gate
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);

  // Checkout state
  const [selections, setSelections] = useState({});
  const [buyer, setBuyer] = useState({ first_name: '', last_name: '', email: '', ...loadSavedBuyer() });
  const [attendees, setAttendees] = useState([]);
  const [sendAllToBuyer, setSendAllToBuyer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const allEvents = await base44.entities.Event.filter({ slug });
      if (!allEvents.length) { setError('Event not found'); setLoading(false); return; }
      const ev = allEvents[0];
      setEvent(ev);

      // Visibility check
      if (ev.visibility_mode === 'private_invite_only') {
        setError('This event is invite-only');
        setLoading(false);
        return;
      }
      if (ev.visibility_mode === 'password_protected' && !accessGranted) {
        setNeedsPassword(true);
        setLoading(false);
        return;
      }

      await loadEventData(ev);
    }
    load();
  }, [slug, accessGranted]);

  async function loadEventData(ev) {
    // Load ticket types and series
    const [tts] = await Promise.all([
      base44.entities.TicketType.filter({ event_id: ev.id }),
    ]);
    setTicketTypes(tts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

    if (ev.series_id) {
      base44.entities.EventSeries.filter({ id: ev.series_id }).then(s => {
        if (s.length) setSeriesSlug(s[0].slug);
      });
    }

    // Load custom fields assigned to this event
    try {
      const assignments = await base44.entities.EventFieldAssignment.filter({ event_id: ev.id });
      if (assignments.length) {
        const defIds = assignments.map(a => a.field_definition_id);
        const allDefs = await base44.entities.CustomFieldDefinition.filter({ is_active: true });
        const relevantDefs = allDefs.filter(d => defIds.includes(d.id) && d.applies_to === 'checkout');
        // Load options for dropdown/radio fields
        for (const def of relevantDefs) {
          if (['dropdown', 'radio'].includes(def.field_type)) {
            const opts = await base44.entities.CustomFieldOption.filter({ field_definition_id: def.id, is_active: true });
            def._options = opts.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
          const assignment = assignments.find(a => a.field_definition_id === def.id);
          if (assignment?.is_required_override != null) def._required = assignment.is_required_override;
          else def._required = def.is_required;
          def._sort = assignment?.sort_order ?? def.sort_order;
        }
        setCustomFields(relevantDefs.sort((a, b) => (a._sort || 0) - (b._sort || 0)));
      }
    } catch (e) {}

    // Auto-fill buyer from auth
    try {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        const saved = loadSavedBuyer();
        if (!saved.email && me?.email) {
          const parts = (me.full_name || '').split(' ');
          setBuyer({ first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '', email: me.email });
        }
      }
    } catch (_) {}

    setLoading(false);
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === event?.access_password) {
      setAccessGranted(true);
      setNeedsPassword(false);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  // Slots
  const totalTickets = useMemo(() => Object.values(selections).reduce((s, q) => s + q, 0), [selections]);

  const attendeeSlots = useMemo(() => {
    const slots = [];
    for (const [ttId, qty] of Object.entries(selections)) {
      if (qty <= 0) continue;
      const tt = ticketTypes.find(t => t.id === ttId);
      if (!tt) continue;
      for (let i = 0; i < qty; i++) {
        slots.push({ ticket_type_id: ttId, ticketTypeName: tt.name, attendance_mode: tt.attendance_mode, sort_order: tt.sort_order || 0 });
      }
    }
    return slots.sort((a, b) => a.sort_order - b.sort_order);
  }, [selections, ticketTypes]);

  useEffect(() => {
    setAttendees(attendeeSlots.map((slot, i) => ({
      ...slot,
      first_name: i === 0 ? buyer.first_name : '',
      last_name: i === 0 ? buyer.last_name : '',
      email: i === 0 ? buyer.email : '',
      custom_fields: {},
    })));
  }, [attendeeSlots.length]);

  useEffect(() => {
    if (attendees.length > 0) {
      const updated = [...attendees];
      updated[0] = { ...updated[0], first_name: buyer.first_name, last_name: buyer.last_name, email: buyer.email };
      setAttendees(updated);
    }
  }, [buyer.first_name, buyer.last_name, buyer.email]);

  const updateAttendee = (index, data) => {
    const updated = [...attendees];
    updated[index] = { ...updated[index], ...data };
    setAttendees(updated);
  };

  const isEventAvailable = () => {
    if (!event) return false;
    if (event.status !== 'published') return false;
    const now = new Date().toISOString();
    if (event.sales_open_at && now < event.sales_open_at) return false;
    if (event.sales_close_at && now > event.sales_close_at) return false;
    return true;
  };

  const validateForm = () => {
    if (!buyer.first_name || !buyer.last_name || !buyer.email) return 'Please fill in all buyer details.';
    if (!/\S+@\S+\.\S+/.test(buyer.email)) return 'Please enter a valid buyer email.';
    for (let i = 0; i < attendees.length; i++) {
      const a = attendees[i];
      if (!a.first_name || !a.last_name) return `Please fill in the name for Ticket ${i + 1}.`;
      if (!sendAllToBuyer || i === 0) {
        if (!a.email) return `Please fill in the email for Ticket ${i + 1}.`;
        if (!/\S+@\S+\.\S+/.test(a.email)) return `Please enter a valid email for Ticket ${i + 1}.`;
      }
      // Validate required custom fields
      for (const field of customFields) {
        if (field._required && !a.custom_fields?.[field.field_key]) {
          return `Please fill in "${field.label}" for Ticket ${i + 1}.`;
        }
      }
    }
    return null;
  };

  const handleCheckout = async () => {
    const err = validateForm();
    if (err) { setSubmitError(err); return; }
    setSubmitting(true);
    setSubmitError(null);

    // Iframe guard for paid tickets
    if (window.self !== window.top) {
      const hasPaid = attendees.some(a => {
        const tt = ticketTypes.find(t => t.id === a.ticket_type_id);
        return tt && tt.price > 0;
      });
      if (hasPaid) {
        setSubmitError('Payment checkout requires the published app. Please open in a new tab.');
        setSubmitting(false);
        return;
      }
    }

    // Validate with backend
    const validation = await base44.functions.invoke('validateCheckout', {
      event_id: event.id,
      attendees: attendees.map(a => ({
        first_name: a.first_name,
        last_name: a.last_name,
        email: (a.email || buyer.email).toLowerCase(),
        ticket_type_id: a.ticket_type_id,
      })),
      access_password: passwordInput || undefined,
    });
    if (!validation.data.valid) {
      setSubmitError(validation.data.errors?.[0]?.message || 'Validation failed');
      setSubmitting(false);
      return;
    }

    // Create checkout
    const result = await base44.functions.invoke('createCheckout', {
      buyer: { first_name: buyer.first_name, last_name: buyer.last_name, email: buyer.email, phone: buyer.phone || '' },
      attendees: attendees.map(a => ({
        first_name: a.first_name,
        last_name: a.last_name,
        email: (a.email || buyer.email).toLowerCase(),
        ticket_type_id: a.ticket_type_id,
        custom_field_values_json: Object.keys(a.custom_fields || {}).length ? JSON.stringify(a.custom_fields) : '',
      })),
      event_id: event.id,
      origin_url: window.location.origin,
      send_all_to_buyer: sendAllToBuyer,
      access_password: passwordInput || undefined,
    });

    if (result.data.error) {
      setSubmitError(result.data.error);
      setSubmitting(false);
      return;
    }

    localStorage.setItem(BUYER_KEY, JSON.stringify(buyer));
    if (result.data.manage_token) {
      localStorage.setItem(`sp_mt_${result.data.order_number}`, result.data.manage_token);
    }

    if (result.data.payment_required) {
      window.location.href = result.data.checkout_url;
    } else {
      window.location.href = `/order/${result.data.order_number}`;
    }
  };

  // ── Render ──

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" /><div className="h-12 w-3/4 bg-muted rounded animate-pulse mb-3" /><div className="h-20 bg-card border rounded-lg animate-pulse" /></div>;
  }

  if (needsPassword) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Password Required</h1>
        <p className="text-muted-foreground mb-6">This event requires a password to access.</p>
        <div className="space-y-3">
          <Input type="password" placeholder="Enter event password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()} />
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          <Button className="w-full" onClick={handlePasswordSubmit}>Access Event</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Event Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;
  }

  const eventAvailable = isEventAvailable();
  const fmtDate = (d) => { if (!d) return ''; const [y,m,day]=d.slice(0,10).split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); };
  const fmtTime = (d) => { if (!d) return ''; const match = d.match(/T(\d{2}):(\d{2})/); if(match){const h=parseInt(match[1],10);return `${h%12||12}:${match[2]} ${h>=12?'pm':'am'}`;} return ''; };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {seriesSlug && (
        <Link to={`/series/${seriesSlug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to all sessions
        </Link>
      )}

      {/* Event Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        {event.description && <p className="text-muted-foreground mb-4">{event.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" />{fmtDate(event.event_date)}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)} ({event.timezone || 'AEST'})</span>
          {event.event_mode === 'online_stream' && <span className="flex items-center gap-1.5"><Monitor className="h-4 w-4 text-muted-foreground" />Online via Zoom</span>}
          {event.venue_details && event.event_mode !== 'online_stream' && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" />{event.venue_details}</span>}
        </div>
      </div>

      {!eventAvailable ? (
        <Alert><AlertDescription>
          {event.status === 'cancelled' ? 'This event has been cancelled.' :
           event.status === 'completed' ? 'This event has already taken place.' :
           event.sales_close_at && new Date().toISOString() > event.sales_close_at ? 'Ticket sales are closed.' :
           'This event is not yet available for booking.'}
        </AlertDescription></Alert>
      ) : (
        <div className="space-y-8">
          <TicketSelector ticketTypes={ticketTypes} selections={selections} onSelectionsChange={setSelections} />
          <OrderSummary selections={selections} ticketTypes={ticketTypes} />

          {totalTickets > 0 && (
            <>
              <BuyerForm buyer={buyer} onChange={setBuyer} />

              {attendees.length > 1 && (
                <label className="flex items-start gap-3 p-4 border rounded-lg bg-card cursor-pointer">
                  <input type="checkbox" checked={sendAllToBuyer} onChange={e => setSendAllToBuyer(e.target.checked)} className="mt-1 h-4 w-4 rounded border-input" />
                  <div className="text-sm"><span className="font-medium">Send all tickets to my email</span><p className="text-muted-foreground mt-0.5">All tickets will be sent to {buyer.email || 'the buyer\'s email'}.</p></div>
                </label>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Attendee Details</h3>
                {attendees.map((att, i) => (
                  <AttendeeForm
                    key={i}
                    index={i}
                    total={attendees.length}
                    ticketTypeName={att.ticketTypeName}
                    attendanceMode={att.attendance_mode}
                    attendee={att}
                    onChange={(data) => updateAttendee(i, data)}
                    isBuyerSlot={i === 0}
                    emailOptional={sendAllToBuyer && i > 0}
                    customFields={customFields}
                  />
                ))}
              </div>

              {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}

              <Button size="lg" className="w-full" onClick={handleCheckout} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> :
                  Object.entries(selections).some(([id, qty]) => { const tt = ticketTypes.find(t => t.id === id); return qty > 0 && tt?.price > 0; })
                    ? 'Proceed to Payment' : 'Complete Booking'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}