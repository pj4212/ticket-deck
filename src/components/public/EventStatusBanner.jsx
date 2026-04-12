import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, XCircle, CheckCircle2 } from 'lucide-react';

export default function EventStatusBanner({ event, ticketTypes }) {
  if (!event) return null;

  const now = new Date().toISOString();

  if (event.status === 'cancelled') {
    return (
      <Alert variant="destructive" className="mb-6">
        <XCircle className="h-4 w-4" />
        <AlertDescription>This event has been cancelled.</AlertDescription>
      </Alert>
    );
  }

  if (event.status === 'completed') {
    return (
      <Alert className="mb-6 border-muted">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>This event has ended.</AlertDescription>
      </Alert>
    );
  }

  if (event.status !== 'published') {
    return (
      <Alert className="mb-6 border-muted">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>This event is not currently available.</AlertDescription>
      </Alert>
    );
  }

  if (event.sales_open_at && now < event.sales_open_at) {
    const openDate = new Date(event.sales_open_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    return (
      <Alert className="mb-6 border-primary/20 bg-primary/5">
        <Clock className="h-4 w-4 text-primary" />
        <AlertDescription>Sales open {openDate}</AlertDescription>
      </Alert>
    );
  }

  if (event.sales_close_at && now > event.sales_close_at) {
    return (
      <Alert className="mb-6 border-muted">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Sales have closed for this event.</AlertDescription>
      </Alert>
    );
  }

  return null;
}