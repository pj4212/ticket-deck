import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Monitor, MapPin, Globe } from 'lucide-react';

export default function EventFormStepBasic({ form, updateForm, templates, seriesList, isEdit, onApplyTemplate }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Basic Information</h2>
      </div>

      {/* Template selector */}
      {!isEdit && templates.length > 0 && (
        <div className="p-4 border border-dashed border-primary/30 rounded-xl bg-primary/5">
          <Label className="text-sm font-medium">Start from Template</Label>
          <p className="text-xs text-muted-foreground mb-2">Pre-fill settings from a saved template.</p>
          <Select value={form.template_id || ''} onValueChange={onApplyTemplate}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span>{t.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {t.default_event_mode === 'online_stream' ? 'Online' : t.default_event_mode === 'hybrid' ? 'Hybrid' : 'In-Person'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Series linking */}
      {seriesList.length > 0 && (
        <div>
          <Label className="text-sm">Event Series</Label>
          <p className="text-xs text-muted-foreground mb-1.5">Link this event to a series for grouped display.</p>
          <Select value={form.series_id || 'none'} onValueChange={v => updateForm('series_id', v === 'none' ? '' : v)}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="No series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No series (standalone)</SelectItem>
              {seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Name & Slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Event Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="My Amazing Event" />
        </div>
        <div>
          <Label className="text-sm">URL Slug <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground shrink-0">/event/</span>
            <Input value={form.slug} onChange={e => updateForm('slug', e.target.value)} placeholder="my-amazing-event" />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm">Description</Label>
        <Textarea value={form.description} onChange={e => updateForm('description', e.target.value)} rows={4} placeholder="Tell attendees about this event... (Markdown supported)" />
      </div>

      {/* Event Mode */}
      <div>
        <Label className="text-sm">Event Mode <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-3 gap-3 mt-1.5">
          {[
            { value: 'in_person', label: 'In-Person', icon: MapPin, desc: 'Physical venue only', color: 'text-emerald-500' },
            { value: 'online_stream', label: 'Online', icon: Monitor, desc: 'Virtual via Zoom/link', color: 'text-blue-500' },
            { value: 'hybrid', label: 'Hybrid', icon: Globe, desc: 'Both in-person & online', color: 'text-purple-500' },
          ].map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => updateForm('event_mode', mode.value)}
              className={`flex flex-col items-center gap-1.5 p-4 border rounded-xl transition-all text-center ${
                form.event_mode === mode.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <mode.icon className={`h-6 w-6 ${mode.color}`} />
              <span className="text-sm font-semibold">{mode.label}</span>
              <span className="text-xs text-muted-foreground">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}