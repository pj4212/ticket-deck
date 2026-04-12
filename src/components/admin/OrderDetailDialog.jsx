import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import { OrderStatusBadge, PaymentStatusBadge, TicketStatusBadge } from './OrderStatusBadge';
import OrderSourceBadge from './OrderSourceBadge';
import {
  Loader2, Mail, XCircle, RotateCcw, RefreshCw, Calendar, Clock,
  Monitor, MapPin, User, DollarSign, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrderDetailDialog({ order, event, tickets, ticketTypes, open, onClose, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [rescheduleTicket, setRescheduleTicket] = useState(null);
  const [targetEventId, setTargetEventId] = useState('');
  const [eligibleEvents, setEligibleEvents] = useState([]);

  if (!order) return null;

  const fmtDate = (d) => { if (!d) return ''; return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const fmtTime = (d) => { if (!d) return ''; const m = d.match(/T(\d{2}):(\d{2})/); if (m) { const h = parseInt(m[1], 10); return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'pm' : 'am'}`; } return ''; };

  const handleAction = async (action, extraPayload = {}) => {
    setActionLoading(action);
    try {
      await base44.functions.invoke('manageOrder', {
        action,
        order_id: order.id,
        ...extraPayload,
      });
      toast.success(`Order ${action.replace(/_/g, ' ')} successful`);
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Action failed');
    }
    setActionLoading(null);
  };

  const openReschedule = async (ticket) => {
    setRescheduleTicket(ticket);
    const events = await base44.entities.Event.filter({ status: 'published' });
    setEligibleEvents(events.filter(e => e.id !== order.event_id));
  };

  const handleReschedule = async () => {
    if (!targetEventId || !rescheduleTicket) return;
    setActionLoading('reschedule');
    try {
      await base44.functions.invoke('manageOrder', {
        action: 'reschedule_ticket',
        order_id: order.id,
        ticket_id: rescheduleTicket.id,
        target_event_id: targetEventId,
      });
      toast.success('Ticket rescheduled');
      setRescheduleTicket(null);
      setTargetEventId('');
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Reschedule failed');
    }
    setActionLoading(null);
  };

  const isConfirmed = order.order_status === 'confirmed';
  const canCancel = isConfirmed;
  const canMarkRefundRequested = isConfirmed && order.payment_status === 'completed';
  const canMarkRefunded = order.payment_status === 'completed' || order.payment_status === 'partially_refunded' || order.order_status === 'refund_requested';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Order #{order.order_number}
            <OrderStatusBadge status={order.order_status} />
            <PaymentStatusBadge status={order.payment_status} />
            <OrderSourceBadge source={order.order_source || 'online'} />
          </DialogTitle>
        </DialogHeader>

        {/* Buyer info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Buyer</p>
            <p className="font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {order.buyer_first_name} {order.buyer_last_name}
            </p>
            <p className="text-muted-foreground">{order.buyer_email}</p>
            {order.buyer_phone && <p className="text-muted-foreground">{order.buyer_phone}</p>}
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Payment</p>
            <p className="font-medium flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {order.total_amount > 0 ? `$${order.total_amount.toFixed(2)} ${order.currency || 'AUD'}` : 'Free'}
            </p>
            {order.payment_method && order.payment_method !== 'stripe' && (
              <p className="text-xs text-muted-foreground capitalize">{order.payment_method.replace(/_/g, ' ')}</p>
            )}
            <p className="text-muted-foreground">Ordered {fmtDate(order.created_date)}</p>
            {order.admin_notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">Notes: {order.admin_notes}</p>
            )}
          </div>
        </div>

        {/* Event info */}
        {event && (
          <div className="p-3 rounded-lg border bg-muted/30 text-sm">
            <p className="font-semibold">{event.name}</p>
            <div className="flex flex-wrap gap-3 text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(event.event_date)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Tickets */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Tickets ({tickets?.length || 0})</h3>
          <div className="space-y-2">
            {(tickets || []).map(t => {
              const tt = ticketTypes?.[t.ticket_type_id];
              return (
                <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${t.ticket_status !== 'active' ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.attendee_first_name} {t.attendee_last_name}</span>
                      <TicketStatusBadge status={t.ticket_status} />
                      <Badge variant="outline" className="text-xs gap-1">
                        {t.attendance_mode === 'online' ? <Monitor className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {t.attendance_mode === 'online' ? 'Online' : 'In-Person'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{t.attendee_email} · {tt?.name || 'Ticket'}</p>
                    {t.original_ticket_id && (
                      <p className="text-xs text-blue-400 mt-0.5">Rescheduled from previous ticket</p>
                    )}
                  </div>
                  {t.ticket_status === 'active' && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAction('cancel_ticket', { ticket_id: t.id })} disabled={!!actionLoading}>
                        <XCircle className="h-3 w-3 mr-1" />Cancel
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openReschedule(t)} disabled={!!actionLoading}>
                        <ArrowRightLeft className="h-3 w-3 mr-1" />Reschedule
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Admin actions */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleAction('resend_emails')} disabled={!!actionLoading}>
              {actionLoading === 'resend_emails' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
              Resend Emails
            </Button>

            {canCancel && (
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleAction('cancel_order')} disabled={!!actionLoading}>
                {actionLoading === 'cancel_order' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                Cancel Order
              </Button>
            )}

            {canMarkRefundRequested && (
              <Button variant="outline" size="sm" onClick={() => handleAction('mark_refund_requested')} disabled={!!actionLoading}>
                {actionLoading === 'mark_refund_requested' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
                Mark Refund Requested
              </Button>
            )}

            {canMarkRefunded && (
              <Button variant="outline" size="sm" onClick={() => handleAction('mark_refunded')} disabled={!!actionLoading}>
                {actionLoading === 'mark_refunded' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
                Mark Refunded
              </Button>
            )}
          </div>
        </div>

        {/* Reschedule sub-dialog */}
        {rescheduleTicket && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3 mt-2">
            <h4 className="text-sm font-semibold">Reschedule: {rescheduleTicket.attendee_first_name} {rescheduleTicket.attendee_last_name}</h4>
            <div>
              <Label className="text-xs">Target Event</Label>
              <Select value={targetEventId} onValueChange={setTargetEventId}>
                <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  {eligibleEvents.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {fmtDate(e.event_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRescheduleTicket(null)}>Cancel</Button>
              <Button size="sm" onClick={handleReschedule} disabled={!targetEventId || !!actionLoading}>
                {actionLoading === 'reschedule' && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Confirm Reschedule
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}