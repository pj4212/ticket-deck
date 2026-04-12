import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, Download } from 'lucide-react';

const SEVERITY_COLORS = {
  info: 'bg-blue-500/15 text-blue-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  critical: 'bg-red-500/15 text-red-400',
};

export default function PlatformAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [workspaces, setWorkspaces] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { load(); }, []);

  async function load() {
    const [al, ws, pu] = await Promise.all([
      base44.entities.AuditLog.list('-created_date', 500),
      base44.entities.Workspace.filter({}),
      base44.entities.PlatformUser.filter({}),
    ]);
    setLogs(al);
    setWorkspaces(Object.fromEntries(ws.map(w => [w.id, w])));
    setUsers(Object.fromEntries(pu.map(u => [u.id, u])));
    setLoading(false);
  }

  const actionTypes = [...new Set(logs.map(l => l.action_type))].sort();
  const actorTypes = [...new Set(logs.map(l => l.actor_type))].sort();

  const filtered = logs.filter(l => {
    if (actionFilter !== 'all' && l.action_type !== actionFilter) return false;
    if (actorFilter !== 'all' && l.actor_type !== actorFilter) return false;
    if (severityFilter !== 'all' && (l.severity || 'info') !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const ws = workspaces[l.workspace_id]?.name || '';
      const user = users[l.actor_user_id]?.name || '';
      if (!l.entity_type?.toLowerCase().includes(q) && !l.entity_id?.includes(search) &&
          !ws.toLowerCase().includes(q) && !user.toLowerCase().includes(q) &&
          !l.action_type?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCSV = () => {
    const headers = ['Date', 'Action', 'Actor Type', 'Actor', 'Entity Type', 'Entity ID', 'Workspace', 'Severity'];
    const rows = filtered.map(l => [
      l.created_date ? new Date(l.created_date).toISOString() : '',
      l.action_type, l.actor_type, users[l.actor_user_id]?.name || l.actor_user_id || '',
      l.entity_type, l.entity_id, workspaces[l.workspace_id]?.name || '', l.severity || 'info',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actorFilter} onValueChange={v => { setActorFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Actor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actors</SelectItem>
            {actorTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={v => { setSeverityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} logs found · Page {page + 1} of {totalPages || 1}</p>

      <div className="space-y-1">
        {paginated.map(log => {
          const expanded = expandedId === log.id;
          const ws = workspaces[log.workspace_id];
          const actor = users[log.actor_user_id];

          return (
            <div key={log.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-secondary/30" onClick={() => setExpandedId(expanded ? null : log.id)}>
                <Badge className={`text-xs shrink-0 ${SEVERITY_COLORS[log.severity || 'info'] || SEVERITY_COLORS.info}`}>
                  {log.severity || 'info'}
                </Badge>
                <Badge variant="outline" className="text-xs shrink-0">{log.action_type}</Badge>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {log.entity_type} · {actor?.name || log.actor_type}{ws ? ` · ${ws.name}` : ''}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{log.created_date ? new Date(log.created_date).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {expanded && (
                <div className="border-t border-border px-3 py-2 bg-secondary/20 space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="text-muted-foreground">Entity Type:</span> {log.entity_type}</div>
                    <div><span className="text-muted-foreground">Entity ID:</span> <span className="font-mono">{log.entity_id}</span></div>
                    <div><span className="text-muted-foreground">Actor:</span> {actor?.name || 'Unknown'} ({log.actor_type})</div>
                    <div><span className="text-muted-foreground">Workspace:</span> {ws?.name || log.workspace_id || '—'}</div>
                    {log.ip_address && <div><span className="text-muted-foreground">IP:</span> {log.ip_address}</div>}
                    <div><span className="text-muted-foreground">Log ID:</span> <span className="font-mono">{log.id}</span></div>
                  </div>
                  {log.metadata_json && log.metadata_json !== '{}' && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Metadata:</p>
                      <pre className="bg-background rounded p-2 overflow-x-auto text-xs font-mono">{JSON.stringify(JSON.parse(log.metadata_json || '{}'), null, 2)}</pre>
                    </div>
                  )}
                  {log.before_json && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Before:</p>
                      <pre className="bg-background rounded p-2 overflow-x-auto text-xs font-mono max-h-40">{JSON.stringify(JSON.parse(log.before_json || '{}'), null, 2)}</pre>
                    </div>
                  )}
                  {log.after_json && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">After:</p>
                      <pre className="bg-background rounded p-2 overflow-x-auto text-xs font-mono max-h-40">{JSON.stringify(JSON.parse(log.after_json || '{}'), null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {paginated.length === 0 && <p className="text-center text-muted-foreground py-8">No audit logs found</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
        </div>
      )}
    </div>
  );
}