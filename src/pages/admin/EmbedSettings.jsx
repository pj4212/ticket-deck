import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, Copy, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function EmbedSettings() {
  const { workspaceId } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [copied, setCopied] = useState('');
  const [buttonColor, setButtonColor] = useState('#4F6AFF');
  const [buttonText, setButtonText] = useState('Get Tickets');

  useEffect(() => {
    async function load() {
      if (!workspaceId) { setLoading(false); return; }
      const evs = await base44.entities.Event.filter({ workspace_id: workspaceId, status: 'published' });
      setEvents(evs.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || '')));
      if (evs.length) setSelectedEventId(evs[0].id);
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const eventUrl = selectedEvent ? `${window.location.origin}/event/${selectedEvent.slug}` : '';

  const buyButtonCode = `<!-- Ticket Deck Buy Button -->
<a href="${eventUrl}" target="_blank" rel="noopener noreferrer"
  style="display:inline-block;padding:12px 28px;background:${buttonColor};color:#fff;
  font-family:system-ui,sans-serif;font-size:16px;font-weight:600;
  border-radius:8px;text-decoration:none;transition:opacity 0.2s"
  onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
  ${buttonText}
</a>`;

  const widgetCode = `<!-- Ticket Deck Event Widget -->
<div id="td-widget-${selectedEvent?.slug || 'event'}" style="max-width:400px;font-family:system-ui,sans-serif">
  <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff">
    <div style="padding:20px">
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a2e">${selectedEvent?.name || 'Event Name'}</h3>
      <p style="margin:0 0 4px;font-size:14px;color:#64748b">📅 ${selectedEvent?.event_date ? new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBA'}</p>
      ${selectedEvent?.venue_details ? `<p style="margin:0 0 12px;font-size:14px;color:#64748b">📍 ${selectedEvent.venue_details}</p>` : ''}
      <a href="${eventUrl}" target="_blank" rel="noopener noreferrer"
        style="display:block;text-align:center;padding:10px 20px;background:${buttonColor};
        color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        ${buttonText}
      </a>
    </div>
  </div>
</div>`;

  const iframeCode = `<!-- Ticket Deck Embedded Checkout -->
<iframe
  src="${eventUrl}?embed=1"
  width="100%" height="800" frameborder="0"
  style="border:none;border-radius:12px;max-width:600px"
  allow="payment"
  title="${selectedEvent?.name || 'Event'} - Ticket Deck">
</iframe>`;

  const handleCopy = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Embed & Widgets</h1>
        <p className="text-sm text-muted-foreground mt-1">Add ticket sales to your own website</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Select Event</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger><SelectValue placeholder="Choose an event..." /></SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} — {e.event_date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Button Color</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" value={buttonColor} onChange={e => setButtonColor(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
              <Input value={buttonColor} onChange={e => setButtonColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div>
            <Label>Button Text</Label>
            <Input value={buttonText} onChange={e => setButtonText(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedEvent && (
        <Tabs defaultValue="button">
          <TabsList>
            <TabsTrigger value="button">Buy Button</TabsTrigger>
            <TabsTrigger value="widget">Event Widget</TabsTrigger>
            <TabsTrigger value="iframe">Embedded Checkout</TabsTrigger>
          </TabsList>

          <TabsContent value="button" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
              <CardContent>
                <div dangerouslySetInnerHTML={{ __html: buyButtonCode }} />
              </CardContent>
            </Card>
            <EmbedCodeBlock code={buyButtonCode} label="button" copied={copied} onCopy={handleCopy} />
          </TabsContent>

          <TabsContent value="widget" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
              <CardContent>
                <div dangerouslySetInnerHTML={{ __html: widgetCode }} />
              </CardContent>
            </Card>
            <EmbedCodeBlock code={widgetCode} label="widget" copied={copied} onCopy={handleCopy} />
          </TabsContent>

          <TabsContent value="iframe" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden" style={{ maxWidth: 600 }}>
                  <iframe src={`${eventUrl}?embed=1`} width="100%" height="400" frameBorder="0" style={{ border: 'none' }} title="Preview" />
                </div>
              </CardContent>
            </Card>
            <EmbedCodeBlock code={iframeCode} label="iframe" copied={copied} onCopy={handleCopy} />
          </TabsContent>
        </Tabs>
      )}

      {!selectedEvent && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Code className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a published event to generate embed codes</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmbedCodeBlock({ code, label, copied, onCopy }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">HTML Code</Label>
        <Button variant="outline" size="sm" onClick={() => onCopy(code, label)} className="gap-1.5">
          {copied === label ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === label ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}