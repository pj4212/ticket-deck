import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import EventFormStepBasic from '@/components/admin/EventFormStepBasic';
import EventFormStepDateTime from '@/components/admin/EventFormStepDateTime';
import EventFormStepLocation from '@/components/admin/EventFormStepLocation';
import EventFormStepTickets from '@/components/admin/EventFormStepTickets';
import EventFormStepVisibility from '@/components/admin/EventFormStepVisibility';
import EventFormStepPublish from '@/components/admin/EventFormStepPublish';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const STEPS = [
  { key: 'basic', label: 'Basics' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'location', label: 'Location' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'visibility', label: 'Visibility' },
  { key: 'publish', label: 'Publish' },
];

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { wsFilter, workspaceId } = useWorkspaceFilter();
  const isEdit = !!id;
  const urlParams = new URLSearchParams(window.location.search);
  const duplicateId = urlParams.get('duplicate');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    template_id: '', series_id: '', name: '', slug: '', description: '',
    event_date: '', start_datetime: '', end_datetime: '',
    timezone: 'Australia/Brisbane', event_mode: 'in_person', scheduling_mode: 'standard',
    slot_interval_mins: '', slot_default_capacity: '',
    visibility_mode: 'public_listed', access_password: '',
    recurrence_pattern: '',
    location_id: '', venue_id: '', venue_name: '', venue_link: '', parking_link: '', venue_details: '',
    zoom_mode: 'none', zoom_link: '', zoom_meeting_id: '', zoom_webinar_id: '',
    sales_open_at: '', sales_close_at: '',
    waiver_text: '', terms_text: '', show_marketing_opt_in: false, marketing_opt_in_label: '',
    reminder_enabled: true, reminder_hours_before: 24,
    status: 'draft',
  });
  const [ticketTypes, setTicketTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Zoom state
  const [creatingWebinar, setCreatingWebinar] = useState(false);
  const [webinarResult, setWebinarResult] = useState(null);

  useEffect(() => {
    async function load() {
      const [locs, tmps, series] = await Promise.all([
        base44.entities.Location.filter({ ...wsFilter }),
        base44.entities.EventTemplate.filter({ ...wsFilter, is_active: true }),
        base44.entities.EventSeries.filter({ ...wsFilter }),
      ]);
      setLocations(locs);
      setTemplates(tmps);
      setSeriesList(series);

      const sourceId = isEdit ? id : duplicateId;
      if (sourceId) {
        const evs = await base44.entities.Event.filter({ id: sourceId });
        if (evs.length) {
          const ev = evs[0];
          const tts = await base44.entities.TicketType.filter({ event_id: sourceId });

          if (isEdit) {
            setForm({
              template_id: ev.template_id || '', series_id: ev.series_id || '',
              name: ev.name, slug: ev.slug, description: ev.description || '',
              event_date: ev.event_date || '',
              start_datetime: ev.start_datetime ? ev.start_datetime.slice(0, 16) : '',
              end_datetime: ev.end_datetime ? ev.end_datetime.slice(0, 16) : '',
              timezone: ev.timezone || 'Australia/Brisbane', event_mode: ev.event_mode,
              scheduling_mode: ev.scheduling_mode || 'standard',
              slot_interval_mins: ev.slot_interval_mins || '',
              slot_default_capacity: ev.slot_default_capacity || '',
              visibility_mode: ev.visibility_mode || 'public_listed',
              access_password: ev.access_password || '',
              recurrence_pattern: ev.recurrence_pattern || '',
              location_id: ev.location_id || '', venue_id: ev.venue_id || '',
              venue_name: ev.venue_name || '', venue_link: ev.venue_link || '',
              parking_link: ev.parking_link || '', venue_details: ev.venue_details || '',
              zoom_mode: ev.zoom_mode || 'none', zoom_link: ev.zoom_link || '',
              zoom_meeting_id: ev.zoom_meeting_id || '', zoom_webinar_id: ev.zoom_webinar_id || '',
              sales_open_at: ev.sales_open_at ? ev.sales_open_at.slice(0, 16) : '',
              sales_close_at: ev.sales_close_at ? ev.sales_close_at.slice(0, 16) : '',
              waiver_text: ev.waiver_text || '', terms_text: ev.terms_text || '',
              show_marketing_opt_in: ev.show_marketing_opt_in || false,
              marketing_opt_in_label: ev.marketing_opt_in_label || '',
              reminder_enabled: ev.reminder_enabled !== false,
              reminder_hours_before: ev.reminder_hours_before || 24,
              status: ev.status || 'draft',
            });
            setTicketTypes(tts.map(tt => ({ ...tt, _existing: true })));
          } else {
            // Duplicate — copy everything except orders/zoom/status
            setForm({
              template_id: ev.template_id || '', series_id: ev.series_id || '',
              name: ev.name + ' (Copy)', slug: ev.slug + '-copy',
              description: ev.description || '',
              event_date: '', start_datetime: '', end_datetime: '',
              timezone: ev.timezone || 'Australia/Brisbane', event_mode: ev.event_mode,
              scheduling_mode: ev.scheduling_mode || 'standard',
              slot_interval_mins: ev.slot_interval_mins || '',
              slot_default_capacity: ev.slot_default_capacity || '',
              visibility_mode: ev.visibility_mode || 'public_listed',
              access_password: ev.access_password || '',
              recurrence_pattern: ev.recurrence_pattern || '',
              location_id: ev.location_id || '', venue_id: ev.venue_id || '',
              venue_name: ev.venue_name || '', venue_link: ev.venue_link || '',
              parking_link: ev.parking_link || '', venue_details: ev.venue_details || '',
              zoom_mode: ev.zoom_mode || 'none', zoom_link: '', zoom_meeting_id: '', zoom_webinar_id: '',
              sales_open_at: '', sales_close_at: '',
              waiver_text: ev.waiver_text || '', terms_text: ev.terms_text || '',
              show_marketing_opt_in: ev.show_marketing_opt_in || false,
              marketing_opt_in_label: ev.marketing_opt_in_label || '',
              reminder_enabled: ev.reminder_enabled !== false,
              reminder_hours_before: ev.reminder_hours_before || 24,
              status: 'draft',
            });
            setTicketTypes(tts.map(tt => ({
              name: tt.name, attendance_mode: tt.attendance_mode,
              price: tt.price, capacity_limit: tt.capacity_limit, is_active: tt.is_active,
              sort_order: tt.sort_order, description: tt.description || '',
              per_order_limit: tt.per_order_limit || '',
            })));
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [id, duplicateId]);

  const updateForm = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !isEdit) next.slug = slugify(value);
      if (field === 'location_id') {
        const loc = locations.find(l => l.id === value);
        if (loc) next.timezone = loc.timezone;
      }
      if (field === 'event_mode') {
        if (value === 'online_stream' || value === 'hybrid') {
          if (next.zoom_mode === 'none') next.zoom_mode = 'manual';
        }
      }
      return next;
    });
  };

  const applyTemplate = (templateId) => {
    const t = templates.find(tt => tt.id === templateId);
    if (!t) return;
    setForm(prev => ({
      ...prev,
      template_id: templateId,
      name: t.name,
      slug: slugify(t.name),
      description: t.description || prev.description,
      event_mode: t.default_event_mode,
      visibility_mode: t.default_visibility_mode || prev.visibility_mode,
      location_id: t.default_location_id || prev.location_id,
      venue_id: t.default_venue_id || prev.venue_id,
      timezone: t.default_timezone || locations.find(l => l.id === t.default_location_id)?.timezone || prev.timezone,
      recurrence_pattern: t.recurrence_pattern === 'none' ? '' : (t.recurrence_pattern || prev.recurrence_pattern),
      waiver_text: t.default_waiver_text || prev.waiver_text,
      terms_text: t.default_terms_text || prev.terms_text,
      show_marketing_opt_in: t.default_show_marketing_opt_in || prev.show_marketing_opt_in,
    }));
    // Apply default ticket types
    if (t.default_ticket_type_configs_json) {
      try {
        const configs = JSON.parse(t.default_ticket_type_configs_json);
        if (Array.isArray(configs)) setTicketTypes(configs);
      } catch (_) {}
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const toISO = (val) => val ? val + ':00' : '';
    const endDt = form.end_datetime ? new Date(form.end_datetime + ':00') : null;
    const autoSalesClose = endDt ? new Date(endDt.getTime() + 60 * 60 * 1000).toISOString() : '';

    const eventData = {
      ...form,
      series_id: form.series_id === 'none' ? '' : form.series_id,
      start_datetime: toISO(form.start_datetime),
      end_datetime: toISO(form.end_datetime),
      sales_open_at: form.sales_open_at ? toISO(form.sales_open_at) : '',
      sales_close_at: form.sales_close_at ? toISO(form.sales_close_at) : autoSalesClose,
      scheduling_mode: form.scheduling_mode || 'standard',
      slot_interval_mins: form.slot_interval_mins ? Number(form.slot_interval_mins) : null,
      slot_default_capacity: form.slot_default_capacity ? Number(form.slot_default_capacity) : null,
    };

    let eventId;
    if (isEdit) {
      await base44.entities.Event.update(id, eventData);
      eventId = id;
    } else {
      const created = await base44.entities.Event.create({ ...eventData, ...wsFilter });
      eventId = created.id;
    }

    // Handle ticket types
    for (const tt of ticketTypes) {
      const ttData = {
        event_id: eventId, name: tt.name, attendance_mode: tt.attendance_mode,
        price: Number(tt.price) || 0,
        capacity_limit: tt.capacity_limit ? Number(tt.capacity_limit) : null,
        per_order_limit: tt.per_order_limit ? Number(tt.per_order_limit) : null,
        is_active: tt.is_active !== false, sort_order: Number(tt.sort_order) || 0,
        description: tt.description || '', requires_payment: (Number(tt.price) || 0) > 0,
        quantity_sold: tt.quantity_sold || 0,
      };
      if (tt._existing && tt.id) {
        await base44.entities.TicketType.update(tt.id, ttData);
      } else {
        await base44.entities.TicketType.create(ttData);
      }
    }

    setSaving(false);
    navigate('/admin/events');
  };

  const handleDelete = async () => {
    const tts = await base44.entities.TicketType.filter({ event_id: id });
    for (const tt of tts) await base44.entities.TicketType.delete(tt.id);
    await base44.entities.Event.delete(id);
    navigate('/admin/events');
  };

  const handleCreateZoomWebinar = async () => {
    setCreatingWebinar(true);
    setWebinarResult(null);
    try {
      const response = await base44.functions.invoke('zoomWorkspace', { action: 'create_session', event_id: id, workspace_id: wsFilter.workspace_id });
      const data = response.data;
      setWebinarResult({ success: true, url: data.registration_url || data.join_url });
      setForm(prev => ({ ...prev, zoom_link: data.registration_url || data.join_url, zoom_meeting_id: String(data.id) }));
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to create webinar';
      setWebinarResult({ success: false, error: msg });
    }
    setCreatingWebinar(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const showZoom = form.event_mode === 'online_stream' || form.event_mode === 'hybrid';
  const showVenue = form.event_mode === 'in_person' || form.event_mode === 'hybrid';

  const canProceed = () => {
    if (step === 0) return !!form.name && !!form.slug && !!form.event_mode;
    if (step === 1) return !!form.event_date && !!form.start_datetime && !!form.end_datetime;
    return true;
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">
          {isEdit ? 'Edit Event' : duplicateId ? 'Duplicate Event' : 'Create Event'}
        </h1>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              i === step ? 'bg-primary text-primary-foreground' :
              i < step ? 'bg-primary/10 text-primary' :
              'bg-muted text-muted-foreground'
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
              {i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="border rounded-xl p-4 sm:p-6 bg-card mb-6">
        {step === 0 && (
          <EventFormStepBasic
            form={form} updateForm={updateForm} templates={templates}
            seriesList={seriesList} isEdit={isEdit} onApplyTemplate={applyTemplate}
          />
        )}
        {step === 1 && <EventFormStepDateTime form={form} updateForm={updateForm} />}
        {step === 2 && (
          <EventFormStepLocation
            form={form} updateForm={updateForm} setForm={setForm}
            locations={locations} isEdit={isEdit}
            showVenue={showVenue} showZoom={showZoom}
            onCreateZoomWebinar={handleCreateZoomWebinar}
            creatingWebinar={creatingWebinar} webinarResult={webinarResult}
          />
        )}
        {step === 3 && <EventFormStepTickets form={form} ticketTypes={ticketTypes} setTicketTypes={setTicketTypes} />}
        {step === 4 && <EventFormStepVisibility form={form} updateForm={updateForm} />}
        {step === 5 && (
          <EventFormStepPublish
            form={form} updateForm={updateForm} isEdit={isEdit}
            saving={saving} onSave={handleSave} onDelete={handleDelete}
            eventId={id}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" />Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1">
            Next<ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save' : 'Create'}
          </Button>
        )}
      </div>
    </div>
  );
}