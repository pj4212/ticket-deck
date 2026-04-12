import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';

export default function WaitlistForm({ eventId, workspaceId, ticketTypeId, ticketTypeName }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    await base44.entities.WaitlistEntry.create({
      workspace_id: workspaceId,
      event_id: eventId,
      ticket_type_id: ticketTypeId || '',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      status: 'waiting',
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-3 border border-primary/20 bg-primary/5 rounded-xl">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground">You're on the waitlist! We'll notify you when spots open up.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {ticketTypeName ? `Join Waitlist for ${ticketTypeName}` : 'Join Waitlist'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Get notified when spots become available.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={handleSubmit} disabled={submitting || !name.trim() || !email.trim()}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
        Notify Me
      </Button>
    </div>
  );
}