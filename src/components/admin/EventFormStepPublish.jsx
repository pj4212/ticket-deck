import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2, Rocket, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

export default function EventFormStepPublish({
  form, updateForm, isEdit, saving, onSave, onDelete, eventId
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Rocket className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Publish</h2>
      </div>

      {/* Status */}
      <div>
        <Label className="text-sm">Event Status</Label>
        <Select value={form.status} onValueChange={v => updateForm('status', v)}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft"><div className="flex items-center gap-2"><Badge variant="secondary">Draft</Badge> Not visible to public</div></SelectItem>
            <SelectItem value="published"><div className="flex items-center gap-2"><Badge variant="default">Published</Badge> Live and accepting bookings</div></SelectItem>
            <SelectItem value="cancelled"><div className="flex items-center gap-2"><Badge variant="destructive">Cancelled</Badge> Event cancelled</div></SelectItem>
            <SelectItem value="completed"><div className="flex items-center gap-2"><Badge variant="outline">Completed</Badge> Event finished</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="border rounded-xl p-4 bg-muted/30 space-y-2">
        <h3 className="text-sm font-semibold mb-3">Pre-Publish Summary</h3>
        <SummaryRow label="Name" value={form.name} ok={!!form.name} />
        <SummaryRow label="Date" value={form.event_date} ok={!!form.event_date} />
        <SummaryRow label="Times" value={form.start_datetime && form.end_datetime ? '✓ Set' : ''} ok={!!form.start_datetime && !!form.end_datetime} />
        <SummaryRow label="Mode" value={form.event_mode?.replace('_', ' ')} ok={!!form.event_mode} />
        <SummaryRow label="Slug" value={form.slug} ok={!!form.slug} />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button onClick={onSave} disabled={saving} className="gap-2 flex-1 sm:flex-none" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Save Changes' : form.status === 'published' ? 'Create & Publish' : 'Create Event'}
        </Button>
        {isEdit && (
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="gap-2">
            <Trash2 className="h-4 w-4" />Delete Event
          </Button>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Event</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This deletes <strong>{form.name}</strong> and all ticket types. Orders/tickets are preserved.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={ok ? 'text-foreground' : 'text-destructive'}>{value || 'Missing'}</span>
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="h-4 w-4 rounded-full border-2 border-destructive inline-block" />}
      </div>
    </div>
  );
}