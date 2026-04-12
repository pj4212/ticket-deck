import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Monitor, Video, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import VenueSelector from './VenueSelector';
import ZoomPanelistsManager from './ZoomPanelistsManager';

export default function EventFormStepLocation({
  form, updateForm, setForm, locations,
  isEdit, showVenue, showZoom,
  onCreateZoomWebinar, creatingWebinar, webinarResult
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Location & Access</h2>
      </div>

      {/* Location selector */}
      {(showVenue || form.event_mode === 'hybrid') && (
        <div>
          <Label className="text-sm">Location</Label>
          <Select value={form.location_id || ''} onValueChange={v => updateForm('location_id', v)}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select location..." /></SelectTrigger>
            <SelectContent>
              {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name} — {l.city}, {l.state}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Venue */}
      {showVenue && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Venue Details</CardTitle></CardHeader>
          <CardContent>
            <VenueSelector
              locationId={form.location_id}
              locations={locations}
              venueData={{
                venue_id: form.venue_id,
                venue_name: form.venue_name,
                venue_link: form.venue_link,
                parking_link: form.parking_link,
                venue_details: form.venue_details
              }}
              onChange={(data) => setForm(prev => ({ ...prev, ...data }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Zoom / Online */}
      {showZoom && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4" />Online Access</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Zoom Setup</Label>
              <div className="flex gap-4">
                {['auto', 'manual', 'none'].map(mode => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="zoom_mode"
                      checked={form.zoom_mode === mode}
                      onChange={() => updateForm('zoom_mode', mode)}
                      className="accent-primary"
                    />
                    <span className="text-sm capitalize">{mode === 'auto' ? 'Auto-create on publish' : mode === 'manual' ? 'Manual link' : 'No Zoom'}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.zoom_mode !== 'none' && (
              <>
                <div>
                  <Label className="text-sm">Zoom Registration Link</Label>
                  <Input
                    value={form.zoom_link || ''}
                    onChange={e => {
                      const url = e.target.value;
                      updateForm('zoom_link', url);
                      if (form.zoom_mode === 'manual' && url) {
                        const wnMatch = url.match(/\/register\/(WN_[A-Za-z0-9_-]+)/);
                        const numMatch = url.match(/\/w\/(\d+)/);
                        if (wnMatch) updateForm('zoom_meeting_id', wnMatch[1]);
                        else if (numMatch) updateForm('zoom_meeting_id', numMatch[1]);
                      }
                    }}
                    placeholder={form.zoom_mode === 'auto' ? 'Auto-filled on publish...' : 'https://zoom.us/webinar/register/WN_...'}
                    disabled={form.zoom_mode === 'auto' && !form.zoom_link}
                  />
                </div>

                <div>
                  <Label className="text-sm">Zoom Meeting ID</Label>
                  <Input
                    value={form.zoom_meeting_id || ''}
                    onChange={e => updateForm('zoom_meeting_id', e.target.value.replace(/\s/g, ''))}
                    placeholder="Auto-filled when creating webinar"
                  />
                </div>

                {isEdit && (
                  <div className="space-y-2">
                    <Button variant="outline" onClick={onCreateZoomWebinar} disabled={creatingWebinar} className="gap-2">
                      {creatingWebinar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                      {form.zoom_link ? 'Re-create Zoom Webinar' : 'Create Zoom Webinar Now'}
                    </Button>
                    {webinarResult?.success && (
                      <Alert><AlertDescription>
                        Webinar created! URL: <a href={webinarResult.url} target="_blank" rel="noopener noreferrer" className="underline break-all">{webinarResult.url}</a>
                      </AlertDescription></Alert>
                    )}
                    {webinarResult && !webinarResult.success && (
                      <Alert variant="destructive"><AlertDescription>{webinarResult.error}</AlertDescription></Alert>
                    )}
                  </div>
                )}

                {isEdit && form.zoom_meeting_id && (
                  <div className="border-t pt-4">
                    <ZoomPanelistsManager webinarId={form.zoom_meeting_id} zoomLink={form.zoom_link} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hybrid info */}
      {form.event_mode === 'hybrid' && (
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300">
          <strong>Hybrid event:</strong> Both venue and online access details will be shown. Create separate in-person and online ticket types in the next step.
        </div>
      )}
    </div>
  );
}