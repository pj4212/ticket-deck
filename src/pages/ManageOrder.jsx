import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, Calendar, Clock, Mail, ArrowLeft, AlertTriangle, MapPin,
  ExternalLink, Car, Edit, XCircle, CheckCircle2
} from 'lucide-react';
import TicketCard from '@/components/booking/TicketCard';
import AddToCalendar from '@/components/booking/AddToCalendar';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/OrderStatusBadge';
import { formatCurrency, formatEventDate, formatEventTime } from '@/lib/formatters';

export default function ManageOrder() {
  const { orderNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Action states
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' });
  const [editSaving, setEditSaving] = useState(false);

  const getToken = () => localStorage.getItem(`sp_mt_${orderNumber}`) || '';

  const loadOrder = async () => {
    try {
      const res = await base44.functions.invoke('manageOrder', {
        action: 'lookup',
        order_number: orderNumber,
        manage_token: getToken(),
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

  useEffect(() => { loadOrder(); }, [orderNumber]);

  const handleResend = async () => {
    setResending(true);
    try {
      await base44.functions.invoke('manageOrder', {
        action: 'buyer_resend',
        order_number: orderNumber,
        manage_token: getToken(),
      });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (_) {}
    setResending(false);
  };

  const handleRequestCancellation = async () => {
    if (!confirm('Are you sure you want to request a cancellation/refund? The organiser will review your request.')) return;
    setRequesting(true);
    try {
      await base44.functions.invoke('manageOrder', {
        action: 'request_cancellation',
        order_number: orderNumber,
        manage_token: getToken(),
      });
      setRequested(true);
      await loadOrder();
    } catch (_) {}
    setRequesting(false);
  };

  const openEditAttendee = (ticket) => {
    setEditingTicket(ticket);
    setEditForm({
      first_name: ticket.attendee_first_name,
      last_name: ticket.attendee_last_name,
      email: ticket.attendee_email,
    });
  };

  const handleSaveAttendee = async () => {
    setEditSaving(true);
    try {
      await base44.functions.invoke('manageOrder', {
        action: 'update_attendee',
        order_number: orderNumber,
        manage_token: getToken(),
        ticket_id: editingTicket.id,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
      });
      setEditingTicket(null);
      await loadOrder();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update');
    }
    setEditSaving(false);
  };

  const tz = event?.timezone || 'UTC';
  const cur = order.currency || 'USD';
  const loc = 'en-US';
  const fmtDate = (d) => d ? formatEventDate(d + (d.includes('T') ? '' : 'T00:00:00'), tz, loc, { weekday: 'long' }) : '';
  const fmtTime = (d) => d ? formatEventTime(d, tz, loc) : '';

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (needsAuth && !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Required</h1>
        <p className="text-muted-foreground mb-6">Sign in with the email used for this booking, or use the link from your confirmation email.</p>
        <Button className="w-full" onClick={() => base44.auth.redirectToLogin(window.location.href)}>Sign In</Button>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Order Not Found</h1><p className="text-muted-foreground">{error}</p></div></div>;
  }

  const { order, event, venue, tickets, can_edit_attendees } = data;
  const isConfirmed = order.order_status === 'confirmed';
  const isRefundRequested = order.order_status === 'refund_requested';
  const isCancelled = order.order_status === 'cancelled';
  const activeTickets = (tickets || []).filter(t => t.ticket_status === 'active');
  const inactiveTickets = (tickets || []).filter(t => t.ticket_status !== 'active');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/order/${orderNumber}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />Back to confirmation
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Manage Order #{order.order_number}</h1>
          <p className="text-muted-foreground">{order.buyer_first_name} {order.buyer_last_name} · {order.buyer_email}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.order_status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </div>

      {isRefundRequested && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription>Your cancellation/refund request has been submitted. The organiser will review it.</AlertDescription>
        </Alert>
      )}

      {isCancelled && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>This order has been cancelled.</AlertDescription>
        </Alert>
      )}

      {/* Event details */}
      {event && (
        <div className="p-4 border rounded-xl bg-card mb-6">
          <h2 className="text-lg font-semibold mb-2">{event.name}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmtDate(event.event_date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}</span>
          </div>

          {/* Venue info */}
          {venue && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{venue.name}</p>
              {venue.address && <p className="text-xs text-muted-foreground mt-0.5">{venue.address}</p>}
              <div className="flex gap-3 mt-2">
                {venue.venue_link && <a href={venue.venue_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />Venue Map</a>}
                {venue.parking_link && <a href={venue.parking_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><Car className="h-3 w-3" />Parking</a>}
              </div>
            </div>
          )}

          {/* Online join info */}
          {(event.event_mode === 'online_stream' || event.event_mode === 'hybrid') && event.zoom_link && (
            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-medium">Online Access</p>
              <p className="text-xs text-muted-foreground">Join links are included on each ticket below or will be emailed before the event.</p>
            </div>
          )}

          <div className="mt-3"><AddToCalendar occurrence={event} /></div>
        </div>
      )}

      {/* Active tickets */}
      {activeTickets.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold">Active Tickets ({activeTickets.length})</h3>
          {activeTickets.map(ticket => (
            <div key={ticket.id}>
              <TicketCard ticket={ticket} event={event} showStatus />
              {can_edit_attendees && isConfirmed && (
                <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => openEditAttendee(ticket)}>
                  <Edit className="h-3 w-3 mr-1" />Edit Attendee Details
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inactive tickets */}
      {inactiveTickets.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Past / Cancelled Tickets ({inactiveTickets.length})</h3>
          {inactiveTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} event={event} showStatus />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 p-4 border rounded-xl bg-card">
        <h3 className="font-semibold">Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={resending} onClick={handleResend}>
            <Mail className="h-4 w-4 mr-1.5" />{resent ? 'Sent!' : 'Resend Confirmation Email'}
          </Button>

          {isConfirmed && !isRefundRequested && (
            <Button variant="outline" size="sm" className="text-destructive" disabled={requesting} onClick={handleRequestCancellation}>
              {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
              {requested ? 'Request Sent' : 'Request Cancellation/Refund'}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Need help? Contact the event organiser.</p>
      </div>

      {/* Payment summary */}
      {order.total_amount > 0 && (
        <div className="mt-6 p-4 border rounded-xl bg-card">
          <div className="flex justify-between font-semibold"><span>Total Paid</span><span>{formatCurrency(order.total_amount, cur, loc)}</span></div>
        </div>
      )}

      {/* Edit attendee dialog */}
      <Dialog open={!!editingTicket} onOpenChange={() => setEditingTicket(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Attendee Details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditingTicket(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveAttendee} disabled={editSaving}>
                {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}