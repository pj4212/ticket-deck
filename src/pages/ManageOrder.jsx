import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Clock, Mail, ArrowLeft, AlertTriangle } from 'lucide-react';
import TicketCard from '@/components/booking/TicketCard';
import AddToCalendar from '@/components/booking/AddToCalendar';

export default function ManageOrder() {
  const { orderNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const loadOrder = async (token) => {
    try {
      const res = await base44.functions.invoke('manageOrder', {
        action: 'lookup',
        order_number: orderNumber,
        manage_token: token || '',
      });
      setData(res.data);
      setLoading(false);
    } catch (e) {
      if (e?.response?.status === 403) {
        setNeedsAuth(true);
        setLoading(false);
      } else {
        setError('Order not found');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem(`sp_mt_${orderNumber}`) || '';
    loadOrder(token);
  }, [orderNumber]);

  const handleEmailLookup = async () => {
    // Generate token by email verification (simplified: check against order buyer email)
    setLoading(true);
    // For now, just try loading — the backend verifies authenticated user email
    await loadOrder('');
    if (!data) {
      setError('Could not verify access. Please use the link from your confirmation email.');
    }
  };

  const fmtDate = (d) => { if (!d) return ''; const [y,m,day]=d.slice(0,10).split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); };
  const fmtTime = (d) => { if (!d) return ''; const match = d.match(/T(\d{2}):(\d{2})/); if(match){const h=parseInt(match[1],10);return `${h%12||12}:${match[2]} ${h>=12?'pm':'am'}`;} return ''; };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (needsAuth && !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Required</h1>
        <p className="text-muted-foreground mb-6">Please sign in with the email used for this booking, or use the link from your confirmation email.</p>
        <Button className="w-full" onClick={() => base44.auth.redirectToLogin(window.location.href)}>Sign In</Button>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Order Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;
  }

  const { order, event, tickets } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/order/${orderNumber}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />Back to confirmation
      </Link>

      <h1 className="text-2xl font-bold mb-1">Manage Order #{order.order_number}</h1>
      <p className="text-muted-foreground mb-6">{order.buyer_first_name} {order.buyer_last_name} · {order.buyer_email}</p>

      {event && (
        <div className="p-4 border rounded-xl bg-card mb-6">
          <h2 className="text-lg font-semibold mb-2">{event.name}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmtDate(event.event_date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}</span>
          </div>
          <div className="mt-3"><AddToCalendar occurrence={event} /></div>
        </div>
      )}

      {/* Tickets */}
      {tickets?.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold">Tickets ({tickets.length})</h3>
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} event={event} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 p-4 border rounded-xl bg-card">
        <h3 className="font-semibold">Order Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={resending} onClick={async () => {
            setResending(true);
            // Re-send confirmation email via sendEmail integration
            await base44.integrations.Core.SendEmail({
              to: order.buyer_email,
              subject: `Your tickets for ${event?.name || 'your event'} — Order #${order.order_number}`,
              body: `<p>Hi ${order.buyer_first_name},</p><p>Here's your order confirmation link:</p><p><a href="${window.location.origin}/order/${order.order_number}">View your tickets</a></p>`,
            });
            setResending(false);
            setResent(true);
            setTimeout(() => setResent(false), 3000);
          }}>
            <Mail className="h-4 w-4 mr-1.5" />{resent ? 'Sent!' : 'Resend Confirmation'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Need help? Contact the event organiser.</p>
      </div>

      {order.total_amount > 0 && (
        <div className="mt-6 p-4 border rounded-xl bg-card">
          <div className="flex justify-between font-semibold"><span>Total Paid</span><span>${order.total_amount.toFixed(2)} {order.currency || 'AUD'}</span></div>
        </div>
      )}
    </div>
  );
}