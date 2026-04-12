import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Store, FileText, Ticket } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/admin/OrderStatusBadge';
import OrderSourceBadge from '@/components/admin/OrderSourceBadge';
import ManualOrderForm from '@/components/admin/ManualOrderForm';

export default function BoxOffice() {
  const { user } = useOutletContext();
  const { wsFilter } = useWorkspaceFilter();
  const [events, setEvents] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const [evts, ords] = await Promise.all([
      base44.entities.Event.filter({ ...wsFilter, status: 'published' }),
      base44.entities.Order.filter({ ...wsFilter }, '-created_date', 20),
    ]);
    setEvents(evts);
    setRecentOrders(ords.filter(o => o.order_source && o.order_source !== 'online'));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '';

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  // Stats
  const manualOrders = recentOrders.filter(o => o.order_source !== 'online');
  const totalManualRevenue = manualOrders.filter(o => o.payment_status === 'completed' || o.payment_status === 'free').reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalTickets = manualOrders.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">Box Office & Manual Orders</h1>
      </div>

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> New Order</TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5"><Ticket className="h-3.5 w-3.5" /> Recent ({manualOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <ManualOrderForm
            events={events}
            workspaceId={wsFilter.workspace_id}
            onOrderCreated={loadData}
          />
        </TabsContent>

        <TabsContent value="recent" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Manual Orders</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalTickets}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Manual Revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">${totalManualRevenue.toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Complimentary</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{manualOrders.filter(o => o.order_source === 'complimentary').length}</p></CardContent>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {manualOrders.map(o => (
              <div key={o.id} className="p-3 border rounded-xl bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{o.buyer_first_name} {o.buyer_last_name}</p>
                    <p className="text-xs text-muted-foreground">{o.buyer_email}</p>
                  </div>
                  <OrderSourceBadge source={o.order_source} />
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>#{o.order_number}</span>
                  <PaymentStatusBadge status={o.payment_status} />
                  <span className="ml-auto font-medium text-foreground">{o.total_amount > 0 ? `$${o.total_amount.toFixed(2)}` : 'Free'}</span>
                </div>
              </div>
            ))}
            {manualOrders.length === 0 && <p className="text-center py-8 text-muted-foreground">No manual orders yet</p>}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{o.buyer_first_name} {o.buyer_last_name}</p>
                      <p className="text-xs text-muted-foreground">{o.buyer_email}</p>
                    </TableCell>
                    <TableCell><OrderSourceBadge source={o.order_source} /></TableCell>
                    <TableCell><PaymentStatusBadge status={o.payment_status} /></TableCell>
                    <TableCell className="font-medium">{o.total_amount > 0 ? `$${o.total_amount.toFixed(2)}` : 'Free'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(o.created_date)}</TableCell>
                  </TableRow>
                ))}
                {manualOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No manual orders yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}