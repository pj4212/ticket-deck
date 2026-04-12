import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, Clock, Ticket, LogIn, ArrowRight, MapPin, Monitor, QrCode } from 'lucide-react';
import { TicketStatusBadge, PaymentStatusBadge } from '@/components/admin/OrderStatusBadge';
import AddToCalendar from '@/components/booking/AddToCalendar';

export default function MyTickets() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState({});
  const [ticketsByOrder, setTicketsByOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    async function load() {
      const isAuthed = await base44.auth.isAuthenticated();
      setAuthed(isAuthed);
      if (!isAuthed) { setLoading(false); return; }

      const me = await base44.auth.me();
      setUser(me);

      // Load orders by buyer email
      const myOrders = await base44.entities.Order.filter({ buyer_email: me.email }, '-created_date', 100);
      setOrders(myOrders);

      // Load events
      const eventIds = [...new Set(myOrders.map(o => o.event_id).filter(Boolean))];
      const evMap = {};
      if (eventIds.length > 0) {
        const allEvents = await base44.entities.Event.filter({});
        allEvents.forEach(e => { evMap[e.id] = e; });
      }
      setEvents(evMap);

      // Load tickets for all orders
      const tixMap = {};
      if (myOrders.length > 0) {
        const allTickets = await base44.entities.Ticket.filter({});
        const myTickets = allTickets.filter(t => myOrders.some(o => o.id === t.order_id));
        myTickets.forEach(t => {
          if (!tixMap[t.order_id]) tixMap[t.order_id] = [];
          tixMap[t.order_id].push(t);
        });
      }
      setTicketsByOrder(tixMap);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">My Tickets</h1>
        <p className="text-muted-foreground mb-6">Sign in to view tickets associated with your email address.</p>
        <Button className="w-full" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
          <LogIn className="h-4 w-4 mr-1.5" />Sign In
        </Button>
      </div>
    );
  }

  const fmtDate = (d) => { if (!d) return ''; const [y, m, day] = d.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, day).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const fmtTime = (d) => { if (!d) return ''; const match = d.match(/T(\d{2}):(\d{2})/); if (match) { const h = parseInt(match[1], 10); return `${h % 12 || 12}:${match[2]} ${h >= 12 ? 'pm' : 'am'}`; } return ''; };

  const now = new Date();
  const confirmedOrders = orders.filter(o => o.order_status === 'confirmed' || o.order_status === 'refund_requested');
  const upcomingOrders = confirmedOrders.filter(o => {
    const ev = events[o.event_id];
    return ev && new Date(ev.event_date + 'T23:59:59') >= now;
  });
  const pastOrders = confirmedOrders.filter(o => {
    const ev = events[o.event_id];
    return ev && new Date(ev.event_date + 'T23:59:59') < now;
  });
  const cancelledOrders = orders.filter(o => o.order_status === 'cancelled');

  const renderOrderCard = (order, showTickets = false) => {
    const event = events[order.event_id];
    const orderTickets = ticketsByOrder[order.id] || [];
    const activeTickets = orderTickets.filter(t => t.ticket_status === 'active');
    const isExpanded = expandedOrder === order.id;

    return (
      <div key={order.id} className="border rounded-xl bg-card overflow-hidden">
        <div
          className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold truncate">{event?.name || 'Event'}</span>
                <Badge variant="secondary" className="text-xs shrink-0">#{order.order_number}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                {event?.event_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(event.event_date)}</span>}
                {event?.start_datetime && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{fmtTime(event.start_datetime)}</span>}
                <span>{activeTickets.length} ticket{activeTickets.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <PaymentStatusBadge status={order.payment_status} />
              {order.order_status === 'refund_requested' && <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">Refund Requested</Badge>}
            </div>
          </div>
        </div>

        {/* Expanded: show tickets and actions */}
        {isExpanded && (
          <div className="border-t px-4 py-4 space-y-3 bg-muted/20">
            {event && (
              <div className="flex items-center gap-2">
                <AddToCalendar occurrence={event} />
                <Link to={`/manage/${order.order_number}`}>
                  <Button variant="outline" size="sm">Manage Order</Button>
                </Link>
              </div>
            )}

            {activeTickets.map(t => {
              const isOnline = t.attendance_mode === 'online';
              const validQr = t.qr_code_hash && t.qr_code_hash !== 'pending' && t.qr_code_hash !== 'temp';
              const qrUrl = validQr ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(t.qr_code_hash)}` : '';

              return (
                <div key={t.id} className="p-3 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{t.attendee_first_name} {t.attendee_last_name}</p>
                      <p className="text-xs text-muted-foreground">{t.attendee_email}</p>
                    </div>
                    <Badge variant={isOnline ? 'secondary' : 'default'} className="text-xs">
                      {isOnline ? <><Monitor className="h-3 w-3 mr-1" />Online</> : <><MapPin className="h-3 w-3 mr-1" />In-Person</>}
                    </Badge>
                  </div>

                  {/* QR code */}
                  {!isOnline && validQr && (
                    <div className="text-center mt-3">
                      <img src={qrUrl} alt="QR" className="w-36 h-36 mx-auto rounded-lg" />
                      <p className="text-xs text-muted-foreground mt-1">Present at door</p>
                    </div>
                  )}

                  {/* Zoom link */}
                  {isOnline && t.zoom_join_url && (
                    <a href={t.zoom_join_url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md mt-2 hover:opacity-90">
                      Join Online <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}

            {activeTickets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No active tickets</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">My Tickets</h1>
      <p className="text-muted-foreground mb-6">Tickets for {user?.email}</p>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tickets found. Browse events to get started.</p>
          <Button asChild className="mt-4"><Link to="/events">Browse Events</Link></Button>
        </div>
      ) : (
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming {upcomingOrders.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{upcomingOrders.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="past">
              Past {pastOrders.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{pastOrders.length}</Badge>}
            </TabsTrigger>
            {cancelledOrders.length > 0 && (
              <TabsTrigger value="cancelled">
                Cancelled <Badge variant="secondary" className="ml-1.5 text-xs">{cancelledOrders.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3">
            {upcomingOrders.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No upcoming events</p>
                <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/events">Browse Events</Link></Button>
              </div>
            ) : (
              upcomingOrders.map(o => renderOrderCard(o, true))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {pastOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No past events</p>
            ) : (
              pastOrders.map(o => renderOrderCard(o))
            )}
          </TabsContent>

          {cancelledOrders.length > 0 && (
            <TabsContent value="cancelled" className="space-y-3">
              {cancelledOrders.map(o => renderOrderCard(o))}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}