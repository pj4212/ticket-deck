import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, RefreshCw, ShoppingCart } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/OrderStatusBadge';
import OrderDetailDialog from '@/components/admin/OrderDetailDialog';

export default function OrderManagement() {
  const { user } = useOutletContext();
  const { wsFilter } = useWorkspaceFilter();
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState({});
  const [tickets, setTickets] = useState({});
  const [ticketTypes, setTicketTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const ords = await base44.entities.Order.filter({ ...wsFilter }, '-created_date', 200);
    setOrders(ords);

    const eventIds = [...new Set(ords.map(o => o.event_id).filter(Boolean))];
    const evMap = {};
    const ttMap = {};
    if (eventIds.length > 0) {
      const allEvents = await base44.entities.Event.filter({ ...wsFilter });
      allEvents.forEach(e => { evMap[e.id] = e; });
      const allTTs = await base44.entities.TicketType.filter({});
      allTTs.forEach(tt => { ttMap[tt.id] = tt; });
    }
    setEvents(evMap);
    setTicketTypes(ttMap);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const loadOrderTickets = async (orderId) => {
    if (tickets[orderId]) return tickets[orderId];
    const tix = await base44.entities.Ticket.filter({ order_id: orderId });
    setTickets(prev => ({ ...prev, [orderId]: tix }));
    return tix;
  };

  const handleSelectOrder = async (order) => {
    await loadOrderTickets(order.id);
    setSelectedOrder(order);
  };

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = `${o.buyer_first_name} ${o.buyer_last_name}`.toLowerCase();
      if (!name.includes(s) && !o.buyer_email?.toLowerCase().includes(s) && !o.order_number?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '';

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
        <Button variant="ghost" size="icon" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total Orders" value={orders.length} />
        <Stat label="Confirmed" value={orders.filter(o => o.order_status === 'confirmed').length} color="text-emerald-400" />
        <Stat label="Revenue" value={`$${orders.filter(o => o.payment_status === 'completed').reduce((s, o) => s + (o.total_amount || 0), 0).toFixed(0)}`} color="text-blue-400" />
        <Stat label="Refund Requested" value={orders.filter(o => o.order_status === 'refund_requested').length} color="text-amber-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, order #..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refund_requested">Refund Requested</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-40 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="completed">Paid</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="partially_refunded">Partial Refund</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map(o => (
          <div key={o.id} onClick={() => handleSelectOrder(o)} className="p-3 border rounded-xl bg-card cursor-pointer hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{o.buyer_first_name} {o.buyer_last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{o.buyer_email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <OrderStatusBadge status={o.order_status} />
                <PaymentStatusBadge status={o.payment_status} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>#{o.order_number}</span>
              <span>{events[o.event_id]?.name || '—'}</span>
              <span className="ml-auto font-medium text-foreground">{o.total_amount > 0 ? `$${o.total_amount.toFixed(2)}` : 'Free'}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No orders found</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleSelectOrder(o)}>
                <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{o.buyer_first_name} {o.buyer_last_name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{o.buyer_email}</p>
                </TableCell>
                <TableCell className="text-sm truncate max-w-[160px]">{events[o.event_id]?.name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(o.created_date)}</TableCell>
                <TableCell className="text-sm font-medium">{o.total_amount > 0 ? `$${o.total_amount.toFixed(2)}` : 'Free'}</TableCell>
                <TableCell><PaymentStatusBadge status={o.payment_status} /></TableCell>
                <TableCell><OrderStatusBadge status={o.order_status} /></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        event={selectedOrder ? events[selectedOrder.event_id] : null}
        tickets={selectedOrder ? tickets[selectedOrder.id] : []}
        ticketTypes={ticketTypes}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRefresh={async () => {
          await loadData(true);
          if (selectedOrder) {
            const tix = await base44.entities.Ticket.filter({ order_id: selectedOrder.id });
            setTickets(prev => ({ ...prev, [selectedOrder.id]: tix }));
            const freshOrders = await base44.entities.Order.filter({ id: selectedOrder.id });
            if (freshOrders.length) setSelectedOrder(freshOrders[0]);
          }
        }}
      />
    </div>
  );
}

function Stat({ label, value, color = 'text-foreground' }) {
  return (
    <div className="bg-card border rounded-lg px-3 py-2 text-center">
      <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
    </div>
  );
}