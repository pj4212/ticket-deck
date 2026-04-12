import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, Clock, CheckCircle2, MapPin, Monitor, Download, XCircle, AlertTriangle, Timer } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/OrderStatusBadge';
import TicketCard from '@/components/booking/TicketCard';
import AddToCalendar from '@/components/booking/AddToCalendar';

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const loadOrder = async () => {
    const manageToken = localStorage.getItem(`sp_mt_${orderNumber}`) || '';
    try {
      const res = await base44.functions.invoke('manageOrder', { action: 'lookup', order_number: orderNumber, manage_token: manageToken });
      setData(res.data);
    } catch (e) {
      // Fallback: try direct entity query for logged-in users
      const orders = await base44.entities.Order.filter({ order_number: orderNumber });
      if (orders.length) {
        const order = orders[0];
        const [events, tickets] = await Promise.all([
          base44.entities.Event.filter({ id: order.event_id }),
          base44.entities.Ticket.filter({ order_id: order.id }),
        ]);
        const event = events[0];
        let ttMap = {};
        if (event) {
          const tts = await base44.entities.TicketType.filter({ event_id: event.id });
          ttMap = Object.fromEntries(tts.map(tt => [tt.id, tt]));
        }
        // Load time slot info
        let slotMap = {};
        const slotIds = [...new Set(tickets.filter(t => t.time_slot_id).map(t => t.time_slot_id))];
        if (slotIds.length) {
          const allSlots = await Promise.all(slotIds.map(sid => base44.entities.TimeSlot.filter({ id: sid }).catch(() => [])));
          allSlots.flat().forEach(s => { slotMap[s.id] = s; });
        }
        setData({
          order: { ...order, buyer_first_name: order.buyer_first_name, buyer_last_name: order.buyer_last_name },
          event,
          tickets: tickets.filter(t => t.ticket_status === 'active').map(t => {
            const slot = slotMap[t.time_slot_id];
            const fmtSlotTime = (tm) => { if (!tm) return ''; const [h,m]=tm.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'pm':'am'}`; };
            return {
              ...t,
              ticket_type_name: ttMap[t.ticket_type_id]?.name || 'Ticket',
              qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(t.qr_code_hash)}`,
              slot_label: slot ? `${slot.slot_date} · ${fmtSlotTime(slot.start_time)} – ${fmtSlotTime(slot.end_time)}` : '',
            };
          }),
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadOrder(); }, [orderNumber]);

  // Poll if pending
  useEffect(() => {
    if (!data?.order || data.order.payment_status !== 'pending') return;
    setPolling(true);
    const interval = setInterval(async () => {
      await loadOrder();
    }, 3000);
    return () => clearInterval(interval);
  }, [data?.order?.payment_status]);

  useEffect(() => {
    if (data?.order?.payment_status && data.order.payment_status !== 'pending') setPolling(false);
  }, [data?.order?.payment_status]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!data?.order) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><h1 className="text-2xl font-bold mb-2">Order Not Found</h1><p className="text-muted-foreground">We couldn't find this order.</p></div></div>;

  const { order, event, tickets } = data;
  const isPending = order.payment_status === 'pending';
  const isFailed = order.payment_status === 'failed';
  const isRefunded = order.payment_status === 'refunded' || order.payment_status === 'partially_refunded';
  const isCancelled = order.order_status === 'cancelled';
  const isRefundRequested = order.order_status === 'refund_requested';
  const isConfirmed = (order.payment_status === 'completed' || order.payment_status === 'free') && order.order_status === 'confirmed';

  const fmtDate = (d) => { if (!d) return ''; const [y,m,day]=d.slice(0,10).split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); };
  const fmtTime = (d) => { if (!d) return ''; const match = d.match(/T(\d{2}):(\d{2})/); if(match){const h=parseInt(match[1],10);return `${h%12||12}:${match[2]} ${h>=12?'pm':'am'}`;} return ''; };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {isPending && (
        <Alert className="mb-6"><Loader2 className="h-4 w-4 animate-spin" /><AlertDescription>Confirming your payment. This page updates automatically.</AlertDescription></Alert>
      )}
      {isFailed && (
        <Alert variant="destructive" className="mb-6"><AlertDescription>Payment failed. Please try booking again.</AlertDescription></Alert>
      )}
      {isRefunded && (
        <Alert className="mb-6 border-purple-500/30 bg-purple-500/10"><AlertDescription>This order has been refunded.</AlertDescription></Alert>
      )}
      {isCancelled && !isRefunded && (
        <Alert variant="destructive" className="mb-6"><XCircle className="h-4 w-4" /><AlertDescription>This order has been cancelled.</AlertDescription></Alert>
      )}
      {isRefundRequested && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/10"><AlertTriangle className="h-4 w-4 text-amber-500" /><AlertDescription>A cancellation/refund has been requested for this order.</AlertDescription></Alert>
      )}
      {isConfirmed && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <div><p className="font-semibold text-foreground">Booking Confirmed!</p><p className="text-sm text-muted-foreground">Your tickets are ready below.</p></div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
          <OrderStatusBadge status={order.order_status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
        <p className="text-muted-foreground">{order.buyer_first_name} {order.buyer_last_name} · {order.buyer_email}</p>
      </div>

      {event && (
        <div className="mb-6 p-4 border rounded-xl bg-card">
          <h2 className="text-xl font-semibold mb-2">{event.name}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmtDate(event.event_date)}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{fmtTime(event.start_datetime)} – {fmtTime(event.end_datetime)}</span>
          </div>
          <div className="mt-3"><AddToCalendar occurrence={event} /></div>
        </div>
      )}

      {isConfirmed && tickets?.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Tickets ({tickets.length})</h3>
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} event={event} />
          ))}
        </div>
      )}

      {order.total_amount > 0 && (
        <div className="mt-6 p-4 border rounded-xl bg-card">
          <div className="flex justify-between font-semibold"><span>Total Paid</span><span>${order.total_amount.toFixed(2)} {order.currency || 'AUD'}</span></div>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-6 text-center">
          <Link to={`/manage/${order.order_number}`} className="text-sm text-primary hover:underline">Manage this order →</Link>
        </div>
      )}
    </div>
  );
}