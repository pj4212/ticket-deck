import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Ticket, ArrowRight, LogIn } from 'lucide-react';

export default function MyTickets() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const isAuthed = await base44.auth.isAuthenticated();
      setAuthed(isAuthed);
      if (!isAuthed) { setLoading(false); return; }

      const me = await base44.auth.me();
      setUser(me);

      // Find orders by buyer email
      const myOrders = await base44.entities.Order.filter({ buyer_email: me.email });
      const confirmed = myOrders
        .filter(o => o.order_status === 'confirmed' && (o.payment_status === 'completed' || o.payment_status === 'free'))
        .sort((a, b) => b.created_date?.localeCompare(a.created_date));
      setOrders(confirmed);

      // Load events for orders
      const eventIds = [...new Set(confirmed.map(o => o.event_id).filter(Boolean))];
      const evtMap = {};
      for (const eid of eventIds) {
        const evts = await base44.entities.Event.filter({ id: eid });
        if (evts.length) evtMap[eid] = evts[0];
      }
      setEvents(evtMap);
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

  const fmtDate = (d) => { if (!d) return ''; const [y,m,day]=d.slice(0,10).split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'}); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">My Tickets</h1>
      <p className="text-muted-foreground mb-6">Orders for {user?.email}</p>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tickets found. Browse events to get started.</p>
          <Button asChild className="mt-4"><Link to="/">Browse Events</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const event = events[order.event_id];
            return (
              <Link key={order.id} to={`/order/${order.order_number}`}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate group-hover:text-primary transition-colors">{event?.name || 'Event'}</span>
                    <Badge variant="secondary" className="text-xs">#{order.order_number}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    {event?.event_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(event.event_date)}</span>}
                    <span>{order.total_amount > 0 ? `$${order.total_amount.toFixed(2)}` : 'Free'}</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}