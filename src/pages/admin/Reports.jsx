import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useWorkspaceFilter from '@/hooks/useWorkspaceFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

function exportCsv(headers, rows, filename) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export default function Reports() {
  const { wsFilter, workspaceId } = useWorkspaceFilter();
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [locations, setLocations] = useState({});
  const [mentors, setMentors] = useState({});
  const [leaders, setLeaders] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [discountCodes, setDiscountCodes] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);

  useEffect(() => {
    async function load() {
      const [rawTix, ords, occs, tts, locs, mList, lList, cfDefs, cfVals] = await Promise.all([
        base44.entities.Ticket.filter({}),
        base44.entities.Order.filter({ ...wsFilter }),
        base44.entities.Event.filter({ ...wsFilter }),
        base44.entities.TicketType.filter({ ...wsFilter }),
        base44.entities.Location.filter({ ...wsFilter }),
        base44.entities.PlatformUser.filter({}).catch(() => []),
        base44.entities.PlatformUser.filter({}).catch(() => []),
        base44.entities.CustomFieldDefinition.filter({ ...wsFilter, is_reportable: true }).catch(() => []),
        base44.entities.FieldValue.filter({}).catch(() => []),
      ]);
      // Filter tickets to workspace events (tickets may lack workspace_id)
      const wsEventIds = new Set(occs.map(o => o.id));
      const tix = rawTix.filter(t => wsEventIds.has(t.event_id));
      setTickets(tix);
      setOrders(ords);
      setOccurrences(occs);
      setTicketTypes(tts);
      const locMap = {};
      locs.forEach(l => { locMap[l.id] = l; });
      setLocations(locMap);
      const mMap = {};
      mList.forEach(m => { mMap[m.id] = m; });
      setMentors(mMap);
      const lMap = {};
      lList.forEach(l => { lMap[l.id] = l; });
      setLeaders(lMap);
      setCustomFields(cfDefs.filter(cf => cf.applies_to === 'checkout' || cf.applies_to === 'ticket'));
      // Index field values by owner
      const fvMap = {};
      cfVals.forEach(fv => {
        if (!fvMap[fv.owner_id]) fvMap[fv.owner_id] = {};
        let val = fv.value_json || '';
        try { val = JSON.parse(val); } catch (_) {}
        fvMap[fv.owner_id][fv.field_definition_id] = val;
      });
      setFieldValues(fvMap);

      // Load discount codes and waitlist
      const [dcList, wlList] = await Promise.all([
        base44.entities.DiscountCode.filter({ ...wsFilter }).catch(() => []),
        base44.entities.WaitlistEntry.filter({ ...wsFilter }).catch(() => []),
      ]);
      setDiscountCodes(dcList);
      setWaitlistEntries(wlList);

      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(o => {
      if (dateFrom && o.event_date < dateFrom) return false;
      if (dateTo && o.event_date > dateTo) return false;
      return true;
    });
  }, [occurrences, dateFrom, dateTo]);

  const occMap = useMemo(() => {
    const m = {};
    occurrences.forEach(o => { m[o.id] = o; });
    return m;
  }, [occurrences]);

  const ttMap = useMemo(() => {
    const m = {};
    ticketTypes.forEach(tt => { m[tt.id] = tt; });
    return m;
  }, [ticketTypes]);

  const activeTickets = useMemo(() => tickets.filter(t => t.ticket_status === 'active'), [tickets]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  // Report 1: Tickets by Occurrence
  const occurrenceReport = filteredOccurrences.map(o => {
    const oTickets = activeTickets.filter(t => t.event_id === o.id);
    const checkedIn = oTickets.filter(t => t.check_in_status === 'checked_in').length;
    const candidates = oTickets.filter(t => (ttMap[t.ticket_type_id]?.ticket_category || 'candidate') === 'candidate').length;
    const businessOwners = oTickets.filter(t => ttMap[t.ticket_type_id]?.ticket_category === 'business_owner').length;
    const oOrders = orders.filter(ord => ord.event_id === o.id && (ord.payment_status === 'completed' || ord.payment_status === 'free'));
    const revenue = oOrders.reduce((sum, ord) => sum + (ord.total_amount || 0), 0);
    return {
      name: o.name, date: o.event_date, location: locations[o.location_id]?.name || '—',
      sold: oTickets.length, candidates, businessOwners, checkedIn, rate: oTickets.length > 0 ? Math.round(checkedIn / oTickets.length * 100) : 0,
      revenue
    };
  });

  // Report 2: Tickets by Type
  const typeReport = filteredOccurrences.flatMap(o => {
    const oTTs = ticketTypes.filter(tt => tt.event_id === o.id);
    return oTTs.map(tt => {
      const count = activeTickets.filter(t => t.ticket_type_id === tt.id).length;
      return { occurrence: o.name, date: o.event_date, type: tt.name, category: tt.ticket_category === 'business_owner' ? 'Business Owner' : 'Candidate', mode: tt.attendance_mode, count };
    });
  });

  const hasActualFees = orders.some(o => o.stripe_fee != null);

  // Report 3: Revenue by occurrence
  const revenueReport = filteredOccurrences.map(o => {
    const oOrders = orders.filter(ord => ord.event_id === o.id && (ord.payment_status === 'completed' || ord.payment_status === 'free'));
    const revenue = oOrders.reduce((s, ord) => s + (ord.total_amount || 0), 0);
    const paidOrders = oOrders.filter(ord => ord.payment_status === 'completed' && ord.total_amount > 0);
    const estimatedFees = paidOrders.reduce((s, ord) => s + (ord.total_amount * 0.029 + 0.30), 0);
    const actualFees = paidOrders.reduce((s, ord) => s + (ord.stripe_fee || 0), 0);
    const fees = hasActualFees ? actualFees : estimatedFees;
    return { name: o.name, date: o.event_date, location: locations[o.location_id]?.name || '—', revenue, fees, estimatedFees, actualFees, profit: revenue - fees };
  });

  async function handleSyncStripeFees() {
    setSyncing(true);
    setSyncResult(null);
    const res = await base44.functions.invoke('syncStripeFees', {});
    setSyncResult(res.data);
    setSyncing(false);
    toast.success(`Synced ${res.data.synced} orders. Actual fees: $${res.data.total_actual_fees.toFixed(2)} vs estimated: $${res.data.total_estimated_fees.toFixed(2)}`);
    // Reload orders to pick up stripe_fee
    const freshOrders = await base44.entities.Order.filter({});
    setOrders(freshOrders);
  }

  // Report 5: Team Attribution
  const leaderReport = {};
  activeTickets.forEach(t => {
    if (!t.platinum_leader_id) return;
    const occ = occMap[t.event_id];
    if (dateFrom && occ?.event_date < dateFrom) return;
    if (dateTo && occ?.event_date > dateTo) return;
    if (!leaderReport[t.platinum_leader_id]) leaderReport[t.platinum_leader_id] = 0;
    leaderReport[t.platinum_leader_id]++;
  });

  const mentorReport = {};
  activeTickets.forEach(t => {
    if (!t.upline_mentor_id) return;
    const occ = occMap[t.event_id];
    if (dateFrom && occ?.event_date < dateFrom) return;
    if (dateTo && occ?.event_date > dateTo) return;
    if (!mentorReport[t.upline_mentor_id]) mentorReport[t.upline_mentor_id] = 0;
    mentorReport[t.upline_mentor_id]++;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
      </div>

      <Tabs defaultValue="occurrence">
        <TabsList className="flex-wrap">
          <TabsTrigger value="occurrence">By Event</TabsTrigger>
          <TabsTrigger value="type">By Type</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="attendee">Attendee Export</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="occurrence" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCsv(
              ['Name', 'Date', 'Location', 'Sold', 'Candidates', 'Business Owners', 'Checked In', 'Rate %', 'Revenue'],
              occurrenceReport.map(r => [r.name, r.date, r.location, r.sold, r.candidates, r.businessOwners, r.checkedIn, r.rate, r.revenue.toFixed(2)]),
              'tickets-by-occurrence.csv'
            )}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead>
                <TableHead>Sold</TableHead><TableHead>Candidates</TableHead><TableHead>Business Owners</TableHead><TableHead>Checked In</TableHead><TableHead>Rate</TableHead><TableHead>Revenue</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {occurrenceReport.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.location}</TableCell>
                    <TableCell>{r.sold}</TableCell><TableCell>{r.candidates}</TableCell><TableCell>{r.businessOwners}</TableCell><TableCell>{r.checkedIn}</TableCell><TableCell>{r.rate}%</TableCell>
                    <TableCell>${r.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="type" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCsv(
              ['Occurrence', 'Date', 'Type', 'Category', 'Mode', 'Count'],
              typeReport.map(r => [r.occurrence, r.date, r.type, r.category, r.mode, r.count]),
              'tickets-by-type.csv'
            )}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Occurrence</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Mode</TableHead><TableHead>Count</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {typeReport.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.occurrence}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.type}</TableCell>
                    <TableCell>{r.category}</TableCell><TableCell className="capitalize">{r.mode?.replace('_', ' ')}</TableCell><TableCell>{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <Button variant="outline" size="sm" onClick={handleSyncStripeFees} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {syncing ? 'Syncing Stripe...' : 'Sync Actual Stripe Fees'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCsv(
              ['Event', 'Date', 'Location', 'Revenue', hasActualFees ? 'Actual Fees' : 'Est. Fees', 'Profit'],
              revenueReport.map(r => [r.name, r.date, r.location, r.revenue.toFixed(2), r.fees.toFixed(2), r.profit.toFixed(2)]),
              'revenue-report.csv'
            )}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
          {syncResult && (
            <div className="bg-card border border-border rounded-lg p-4 text-sm space-y-1">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Stripe Fee Sync Complete
              </div>
              <p className="text-muted-foreground">Synced {syncResult.synced} orders · Skipped {syncResult.skipped} · Errors {syncResult.errors}</p>
              <div className="grid grid-cols-3 gap-3 mt-2 pt-2 border-t border-border">
                <div><p className="text-xs text-muted-foreground">Estimated Fees</p><p className="font-semibold">${syncResult.total_estimated_fees.toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Actual Fees</p><p className="font-semibold">${syncResult.total_actual_fees.toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground">Difference</p><p className="font-semibold ${syncResult.difference > 0 ? 'text-red-400' : 'text-emerald-400'}">{syncResult.difference >= 0 ? '+' : ''}${syncResult.difference.toFixed(2)}</p></div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">${revenueReport.reduce((s, r) => s + r.revenue, 0).toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{hasActualFees ? 'Stripe Fees (actual)' : 'Stripe Fees (est.)'}</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-400">${revenueReport.reduce((s, r) => s + r.fees, 0).toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Profit After Fees</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-emerald-400">${revenueReport.reduce((s, r) => s + r.profit, 0).toFixed(2)}</p></CardContent>
            </Card>
          </div>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Revenue</TableHead><TableHead>Fees</TableHead><TableHead>Profit</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {revenueReport.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.location}</TableCell>
                    <TableCell>${r.revenue.toFixed(2)}</TableCell><TableCell className="text-red-400">${r.fees.toFixed(2)}</TableCell><TableCell className="text-emerald-400">${r.profit.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-3">
          {(() => {
            const refundedOrders = orders.filter(o => o.payment_status === 'refunded' || o.payment_status === 'partially_refunded');
            const totalRefunds = refundedOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
            const refundsByEvent = filteredOccurrences.map(o => {
              const eRefunds = refundedOrders.filter(r => r.event_id === o.id);
              return { name: o.name, date: o.event_date, count: eRefunds.length, amount: eRefunds.reduce((s, r) => s + (r.total_amount || 0), 0) };
            }).filter(r => r.count > 0);
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Refunds</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-400">${totalRefunds.toFixed(2)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Refunded Orders</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{refundedOrders.length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Refund Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{orders.length > 0 ? Math.round(refundedOrders.length / orders.length * 100) : 0}%</p></CardContent></Card>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportCsv(
                    ['Event', 'Date', 'Refunds', 'Amount'],
                    refundsByEvent.map(r => [r.name, r.date, r.count, r.amount.toFixed(2)]),
                    'refund-report.csv'
                  )}><Download className="h-4 w-4 mr-1" />CSV</Button>
                </div>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Refunds</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {refundsByEvent.map((r, i) => (
                        <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.count}</TableCell><TableCell className="text-red-400">${r.amount.toFixed(2)}</TableCell></TableRow>
                      ))}
                      {refundsByEvent.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No refunds</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="checkin" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Checked In</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-400">{occurrenceReport.reduce((s, r) => s + r.checkedIn, 0)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">No-Shows</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-400">{occurrenceReport.reduce((s, r) => s + (r.sold - r.checkedIn), 0)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Check-In Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{occurrenceReport.length > 0 ? Math.round(occurrenceReport.reduce((s, r) => s + r.rate, 0) / occurrenceReport.length) : 0}%</p></CardContent></Card>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCsv(
              ['Event', 'Date', 'Sold', 'Checked In', 'No Shows', 'Rate %'],
              occurrenceReport.map(r => [r.name, r.date, r.sold, r.checkedIn, r.sold - r.checkedIn, r.rate]),
              'checkin-report.csv'
            )}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </div>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Event</TableHead><TableHead>Date</TableHead><TableHead>Sold</TableHead>
                <TableHead>Checked In</TableHead><TableHead>No Shows</TableHead><TableHead>Rate</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {occurrenceReport.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.sold}</TableCell>
                    <TableCell className="text-emerald-400">{r.checkedIn}</TableCell><TableCell className="text-amber-400">{r.sold - r.checkedIn}</TableCell><TableCell>{r.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-3">
          {(() => {
            const totalDiscountRevenue = discountCodes.reduce((s, dc) => s + (dc.times_used || 0) * (dc.discount_type === 'fixed_amount' ? dc.discount_value : 0), 0);
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{discountCodes.length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Uses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{discountCodes.reduce((s, dc) => s + (dc.times_used || 0), 0)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Codes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-400">{discountCodes.filter(dc => dc.is_active).length}</p></CardContent></Card>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportCsv(
                    ['Code', 'Type', 'Value', 'Uses', 'Limit', 'Active'],
                    discountCodes.map(dc => [dc.code, dc.discount_type, dc.discount_value, dc.times_used || 0, dc.usage_limit || '∞', dc.is_active ? 'Yes' : 'No']),
                    'discount-report.csv'
                  )}><Download className="h-4 w-4 mr-1" />CSV</Button>
                </div>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Uses</TableHead><TableHead>Limit</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {discountCodes.map(dc => (
                        <TableRow key={dc.id}>
                          <TableCell className="font-mono font-semibold">{dc.code}</TableCell>
                          <TableCell className="capitalize">{dc.discount_type.replace('_', ' ')}</TableCell>
                          <TableCell>{dc.discount_type === 'percentage' ? `${dc.discount_value}%` : `$${dc.discount_value.toFixed(2)}`}</TableCell>
                          <TableCell>{dc.times_used || 0}</TableCell>
                          <TableCell>{dc.usage_limit || '∞'}</TableCell>
                          <TableCell>{dc.is_active ? '✓ Active' : 'Inactive'}</TableCell>
                        </TableRow>
                      ))}
                      {discountCodes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No discount codes</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-3">
          {(() => {
            const waitingCount = waitlistEntries.filter(e => e.status === 'waiting').length;
            // Group by event
            const byEvent = {};
            waitlistEntries.forEach(e => {
              const eName = occMap[e.event_id]?.name || 'Unknown';
              if (!byEvent[e.event_id]) byEvent[e.event_id] = { name: eName, waiting: 0, notified: 0, total: 0 };
              byEvent[e.event_id].total++;
              if (e.status === 'waiting') byEvent[e.event_id].waiting++;
              if (e.status === 'notified') byEvent[e.event_id].notified++;
            });
            const eventRows = Object.values(byEvent);
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{waitlistEntries.length}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Waiting</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-400">{waitingCount}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Notified</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{waitlistEntries.filter(e => e.status === 'notified').length}</p></CardContent></Card>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportCsv(
                    ['Event', 'Waiting', 'Notified', 'Total'],
                    eventRows.map(r => [r.name, r.waiting, r.notified, r.total]),
                    'waitlist-report.csv'
                  )}><Download className="h-4 w-4 mr-1" />CSV</Button>
                </div>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Waiting</TableHead><TableHead>Notified</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {eventRows.map((r, i) => (
                        <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="text-amber-400">{r.waiting}</TableCell><TableCell className="text-primary">{r.notified}</TableCell><TableCell>{r.total}</TableCell></TableRow>
                      ))}
                      {eventRows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No waitlist entries</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="attendee" className="space-y-3">
          <p className="text-sm text-muted-foreground">Export attendee data with custom fields included. Select an event or export all.</p>
          {(() => {
            const cfHeaders = customFields.map(cf => cf.label);
            const baseHeaders = ['Event', 'Date', 'Name', 'Email', 'Ticket Type', 'Mode', 'Check-In', 'Status'];
            const allHeaders = [...baseHeaders, ...cfHeaders];
            const rows = activeTickets.filter(t => {
              const occ = occMap[t.event_id];
              if (dateFrom && occ?.event_date < dateFrom) return false;
              if (dateTo && occ?.event_date > dateTo) return false;
              return true;
            }).map(t => {
              const occ = occMap[t.event_id];
              const base = [
                occ?.name || '', occ?.event_date || '',
                `${t.attendee_first_name} ${t.attendee_last_name}`, t.attendee_email,
                ttMap[t.ticket_type_id]?.name || '', t.attendance_mode || '',
                t.check_in_status, t.ticket_status
              ];
              const cfValues = customFields.map(cf => {
                const vals = fieldValues[t.id] || fieldValues[t.order_id] || {};
                return vals[cf.id] || '';
              });
              return [...base, ...cfValues];
            });
            return (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm">{rows.length} attendees in date range</p>
                  <Button variant="outline" size="sm" onClick={() => exportCsv(allHeaders, rows, 'attendee-export.csv')}>
                    <Download className="h-4 w-4 mr-1" />Export CSV{cfHeaders.length > 0 ? ` (+ ${cfHeaders.length} custom fields)` : ''}
                  </Button>
                </div>
                <div className="border rounded-lg overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader><TableRow>{allHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {rows.slice(0, 50).map((r, i) => (
                        <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="text-xs whitespace-nowrap">{c}</TableCell>)}</TableRow>
                      ))}
                      {rows.length > 50 && <TableRow><TableCell colSpan={allHeaders.length} className="text-center text-muted-foreground text-xs">Showing first 50 of {rows.length} — download CSV for full data</TableCell></TableRow>}
                      {rows.length === 0 && <TableRow><TableCell colSpan={allHeaders.length} className="text-center py-8 text-muted-foreground">No attendees in date range</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">By Platinum Leader</h3>
              <Button variant="outline" size="sm" onClick={() => exportCsv(
                ['Leader', 'Tickets'],
                Object.entries(leaderReport).map(([id, c]) => [leaders[id]?.name || id, c]),
                'platinum-leader-report.csv'
              )}><Download className="h-4 w-4 mr-1" />CSV</Button>
            </div>
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Leader</TableHead><TableHead>Tickets</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(leaderReport).sort((a, b) => b[1] - a[1]).map(([id, count]) => (
                    <TableRow key={id}><TableCell>{leaders[id]?.name || id}</TableCell><TableCell>{count}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">By Upline Mentor</h3>
              <Button variant="outline" size="sm" onClick={() => exportCsv(
                ['Mentor', 'Tickets'],
                Object.entries(mentorReport).map(([id, c]) => [mentors[id]?.name || id, c]),
                'mentor-report.csv'
              )}><Download className="h-4 w-4 mr-1" />CSV</Button>
            </div>
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Mentor</TableHead><TableHead>Tickets</TableHead></TableRow></TableHeader>
                <TableBody>
                  {Object.entries(mentorReport).sort((a, b) => b[1] - a[1]).map(([id, count]) => (
                    <TableRow key={id}><TableCell>{mentors[id]?.name || id}</TableCell><TableCell>{count}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}