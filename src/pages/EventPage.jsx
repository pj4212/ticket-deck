import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import EventHeader from '@/components/public/EventHeader';
import EventDescription from '@/components/public/EventDescription';
import EventStatusBanner from '@/components/public/EventStatusBanner';
import VisibilityGate from '@/components/public/VisibilityGate';
import TicketSelector from '@/components/booking/TicketSelector';
import BuyerForm from '@/components/booking/BuyerForm';
import AttendeeForm from '@/components/booking/AttendeeForm';
import OrderSummary from '@/components/booking/OrderSummary';
import DiscountCodeInput from '@/components/booking/DiscountCodeInput';
import WaitlistForm from '@/components/booking/WaitlistForm';
import WaiverTerms from '@/components/booking/WaiverTerms';
import TimeSlotPicker from '@/components/booking/TimeSlotPicker';
import { validateCheckout } from '@/components/booking/CheckoutValidation';

const BUYER_KEY = 'sp_buyer';

function loadSavedBuyer() {
  try { return JSON.parse(localStorage.getItem(BUYER_KEY)) || {}; } catch { return {}; }
}

export default function EventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [venue, setVenue] = useState(null);
  const [seriesSlug, setSeriesSlug] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password gate
  const [accessGranted, setAccessGranted] = useState(false);

  // Checkout state
  const [selections, setSelections] = useState({});
  const [buyer, setBuyer] = useState({ first_name: '', last_name: '', email: '', phone: '', ...loadSavedBuyer() });
  const [attendees, setAttendees] = useState([]);
  const [sendAllToBuyer, setSendAllToBuyer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Waiver & terms state
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Discount
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Time slot
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  // Validation errors
  const [buyerErrors, setBuyerErrors] = useState({});
  const [attendeeErrors, setAttendeeErrors] = useState([]);
  const [termsErrors, setTermsErrors] = useState({});
  const errorRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const allEvents = await base44.entities.Event.filter({ slug });
      if (!allEvents.length) { setError('Event not found'); setLoading(false); return; }
      const ev = allEvents[0];
      setEvent(ev);

      // Load workspace for branding
      if (ev.workspace_id) {
        base44.entities.Workspace.filter({ id: ev.workspace_id }).then(ws => {
          if (ws.length) setWorkspace(ws[0]);
        });
      }

      // Load venue
      if (ev.venue_id) {
        base44.entities.Venue.filter({ id: ev.venue_id }).then(v => {
          if (v.length) setVenue(v[0]);
        });
      }

      // Visibility gates — stop here for private/password
      if (ev.visibility_mode === 'private_invite_only') {
        setLoading(false);
        return;
      }
      if (ev.visibility_mode === 'password_protected' && !accessGranted) {
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

    // Load time slots for timed-entry events
    if (ev.scheduling_mode === 'timed_entry') {
      base44.entities.TimeSlot.filter({ event_id: ev.id, is_active: true }).then(slots =>
        setTimeSlots(slots.sort((a, b) => a.slot_date.localeCompare(b.slot_date) || a.start_time.localeCompare(b.start_time)))
      );
    }

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

  const runValidation = () => {
    const result = validateCheckout({
      buyer,
      attendees,
      sendAllToBuyer,
      customFields,
      waiverText: event?.waiver_text,
      waiverAccepted,
      termsText: event?.terms_text,
      termsAccepted,
    });
    setBuyerErrors(result.buyerErrors);
    setAttendeeErrors(result.attendeeErrors);
    setTermsErrors(result.termsErrors);
    return result;
  };

  const handleCheckout = async () => {
    // Validate time slot for timed-entry events
    if (event.scheduling_mode === 'timed_entry' && timeSlots.length > 0 && !selectedSlotId) {
      setSubmitError('Please select a time slot');
      return;
    }

    const result = runValidation();
    if (!result.valid) {
      setSubmitError(result.firstErrorMessage);
      // Scroll to first error
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }
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
      access_password: event.visibility_mode === 'password_protected' ? event.access_password : undefined,
    });
    if (!validation.data.valid) {
      setSubmitError(validation.data.errors?.[0]?.message || 'Validation failed');
      setSubmitting(false);
      return;
    }

    // Create checkout
    const checkoutResult = await base44.functions.invoke('createCheckout', {
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
      time_slot_id: selectedSlotId || null,
      access_password: event.visibility_mode === 'password_protected' ? event.access_password : undefined,
      waiver_accepted: waiverAccepted || false,
      terms_accepted: termsAccepted || false,
      marketing_opt_in: marketingOptIn || false,
      discount_code: appliedDiscount?.code || null,
    });

    if (checkoutResult.data.error) {
      setSubmitError(checkoutResult.data.error);
      setSubmitting(false);
      return;
    }

    localStorage.setItem(BUYER_KEY, JSON.stringify(buyer));
    if (checkoutResult.data.manage_token) {
      localStorage.setItem(`sp_mt_${checkoutResult.data.order_number}`, checkoutResult.data.manage_token);
    }

    if (checkoutResult.data.payment_required) {
      window.location.href = checkoutResult.data.checkout_url;
    } else {
      window.location.href = `/order/${checkoutResult.data.order_number}`;
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-12 w-3/4 bg-muted rounded animate-pulse mb-3" />
        <div className="h-6 w-1/2 bg-muted rounded animate-pulse mb-6" />
        <div className="h-32 bg-card border rounded-lg animate-pulse" />
      </div>
    );
  }

  // Visibility gates
  if (event?.visibility_mode === 'private_invite_only') {
    return <VisibilityGate event={event} />;
  }
  if (event?.visibility_mode === 'password_protected' && !accessGranted) {
    return <VisibilityGate event={event} accessGranted={accessGranted} onAccessGranted={() => setAccessGranted(true)} />;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Event Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;
  }

  const eventAvailable = isEventAvailable();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {seriesSlug && (
        <Link to={`/series/${seriesSlug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to all sessions
        </Link>
      )}

      {/* Event Header */}
      <div className="mb-8">
        <EventHeader event={event} venue={venue} workspace={workspace} />
      </div>

      {/* Description */}
      {event.description && (
        <div className="mb-8 pb-8 border-b border-border">
          <EventDescription description={event.description} />
        </div>
      )}

      {/* Status banner */}
      <EventStatusBanner event={event} ticketTypes={ticketTypes} />

      {/* Event-level waitlist if all sold out */}
      {eventAvailable && ticketTypes.length > 0 && ticketTypes.filter(tt => tt.is_active).every(tt => {
        if (tt.capacity_limit == null) return false;
        return (tt.quantity_sold || 0) + (tt.quantity_reserved || 0) >= tt.capacity_limit;
      }) && (
        <div className="mt-6">
          <WaitlistForm eventId={event.id} workspaceId={event.workspace_id} />
        </div>
      )}

      {!eventAvailable ? null : (
        <div className="space-y-8 mt-6">
          {/* 0. Time Slot Selection (timed entry) */}
          {event.scheduling_mode === 'timed_entry' && timeSlots.length > 0 && (
            <TimeSlotPicker
              slots={timeSlots}
              selectedSlotId={selectedSlotId}
              onSelect={setSelectedSlotId}
              totalTickets={totalTickets}
            />
          )}

          {/* 1. Ticket Selection */}
          <TicketSelector
            ticketTypes={ticketTypes}
            selections={selections}
            onSelectionsChange={setSelections}
            eventId={event.id}
            workspaceId={event.workspace_id}
          />

          {/* Discount Code */}
          <DiscountCodeInput
            eventId={event.id}
            ticketTypeIds={Object.keys(selections).filter(id => selections[id] > 0)}
            onDiscountApplied={setAppliedDiscount}
            onDiscountRemoved={() => setAppliedDiscount(null)}
          />

          {/* 2. Live Order Summary */}
          <OrderSummary
            selections={selections}
            ticketTypes={ticketTypes}
            discount={appliedDiscount}
            slotLabel={selectedSlotId ? (() => {
              const sl = timeSlots.find(s => s.id === selectedSlotId);
              if (!sl) return '';
              const fmt = (t) => { const [h,m]=t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'pm':'am'}`; };
              return `${sl.slot_date} · ${fmt(sl.start_time)} – ${fmt(sl.end_time)}`;
            })() : ''}
          />

          {totalTickets > 0 && (
            <>
              {/* 3. Buyer Details */}
              <BuyerForm buyer={buyer} onChange={setBuyer} errors={buyerErrors} />

              {/* Send all tickets toggle */}
              {attendees.length > 1 && (
                <label className="flex items-start gap-3 p-4 border rounded-xl bg-card cursor-pointer hover:border-primary/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendAllToBuyer}
                    onChange={e => setSendAllToBuyer(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
                  />
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Send all tickets to my email</span>
                    <p className="text-muted-foreground mt-0.5">
                      All tickets will be sent to {buyer.email || 'your email'}. Attendees won't receive individual emails.
                    </p>
                  </div>
                </label>
              )}

              {/* 4. Attendee Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Attendee Details</h2>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">
                  Please provide details for each ticket holder.
                </p>
                {attendees.map((att, i) => (
                  <AttendeeForm
                    key={`${att.ticket_type_id}-${i}`}
                    index={i}
                    total={attendees.length}
                    ticketTypeName={att.ticketTypeName}
                    attendanceMode={att.attendance_mode}
                    attendee={att}
                    onChange={(data) => updateAttendee(i, data)}
                    isBuyerSlot={i === 0}
                    emailOptional={sendAllToBuyer && i > 0}
                    customFields={customFields}
                    errors={attendeeErrors[i] || {}}
                  />
                ))}
              </div>

              {/* 5. Waivers, Terms, Marketing */}
              <WaiverTerms
                waiverText={event.waiver_text}
                termsText={event.terms_text}
                showMarketingOptIn={event.show_marketing_opt_in}
                marketingLabel={event.marketing_opt_in_label}
                waiverAccepted={waiverAccepted}
                termsAccepted={termsAccepted}
                marketingOptIn={marketingOptIn}
                onWaiverChange={setWaiverAccepted}
                onTermsChange={setTermsAccepted}
                onMarketingChange={setMarketingOptIn}
                errors={termsErrors}
              />

              {/* Error display */}
              {submitError && (
                <div ref={errorRef}>
                  <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>
                </div>
              )}

              {/* Checkout button */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={handleCheckout}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
                  ) : Object.entries(selections).some(([id, qty]) => {
                    const tt = ticketTypes.find(t => t.id === id);
                    return qty > 0 && tt?.price > 0;
                  }) ? (
                    <><Lock className="h-4 w-4" />Proceed to Payment</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4" />Complete Booking</>
                  )}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Secure checkout · Payments processed by Stripe</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}