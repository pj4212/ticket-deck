import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Building2, User, ShoppingCart, Ticket, ExternalLink } from 'lucide-react';

export default function PlatformSupportTools() {
  const { platformRole } = useOutletContext();
  const [lookupType, setLookupType] = useState('workspace');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const res = await base44.functions.invoke('platformAdmin', { action: 'support_lookup', lookup_type: lookupType, query: query.trim() });
    setResults(res.data.status === 'success' ? res.data.results : []);
    setSearching(false);
  };

  const handleAuditSearch = async () => {
    if (!auditSearch.trim()) return;
    setAuditLoading(true);
    const logs = await base44.entities.AuditLog.filter({});
    const q = auditSearch.toLowerCase();
    const filtered = logs.filter(l =>
      l.entity_id === auditSearch || l.entity_type?.toLowerCase().includes(q) ||
      l.action_type?.toLowerCase().includes(q) || l.actor_user_id === auditSearch
    ).slice(0, 50);
    setAuditLogs(filtered);
    setAuditLoading(false);
  };

  const icons = { workspace: Building2, user: User, order: ShoppingCart, ticket: Ticket };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Support Tools</h1>

      <Tabs defaultValue="lookup">
        <TabsList><TabsTrigger value="lookup">Entity Lookup</TabsTrigger><TabsTrigger value="audit">Audit Trail</TabsTrigger></TabsList>

        <TabsContent value="lookup" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={lookupType} onValueChange={setLookupType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">Workspace</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search by name, email, ID, or ${lookupType === 'order' ? 'order number' : 'identifier'}...`} value={query}
                onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-9" />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          <div className="space-y-2">
            {results.map((item, i) => {
              const Icon = icons[lookupType] || Building2;
              return (
                <div key={item.id || i} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    {lookupType === 'workspace' && (
                      <>
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.slug} · {item.is_active ? 'Active' : 'Suspended'}</p>
                      </>
                    )}
                    {lookupType === 'user' && (
                      <>
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </>
                    )}
                    {lookupType === 'order' && (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.order_number}</p>
                          <Badge variant="outline" className="text-xs">{item.payment_status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.buyer_first_name} {item.buyer_last_name} · {item.buyer_email}</p>
                      </>
                    )}
                    {lookupType === 'ticket' && (
                      <>
                        <p className="font-medium truncate">{item.attendee_first_name} {item.attendee_last_name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{item.attendee_email}</span>
                          <Badge variant="outline" className="text-xs">{item.check_in_status}</Badge>
                          <Badge variant="outline" className="text-xs">{item.ticket_status}</Badge>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono shrink-0">{item.id?.slice(0, 8)}...</p>
                </div>
              );
            })}
            {results.length === 0 && query && !searching && <p className="text-center text-muted-foreground py-8">No results found</p>}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by entity ID, type, action, or actor ID..." value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuditSearch()} className="pl-9" />
            </div>
            <Button onClick={handleAuditSearch} disabled={auditLoading}>
              {auditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{log.action_type}</Badge>
                    <Badge variant="secondary" className="text-xs">{log.entity_type}</Badge>
                    <Badge variant="secondary" className="text-xs">{log.actor_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.created_date ? new Date(log.created_date).toLocaleString() : ''}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">Entity: {log.entity_id?.slice(0, 12)}... · Actor: {log.actor_user_id?.slice(0, 12) || 'system'}...</p>
              </div>
            ))}
            {auditLogs.length === 0 && auditSearch && !auditLoading && <p className="text-center text-muted-foreground py-8">No audit logs found</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}