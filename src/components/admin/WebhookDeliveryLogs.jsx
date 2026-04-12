import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  success: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-600/20 text-red-400 border-red-500/30',
  retrying: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  pending: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
};

export default function WebhookDeliveryLogs({ endpointId, workspaceId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('webhookDispatch', {
      action: 'get_delivery_logs',
      endpoint_id: endpointId || undefined,
      workspace_id: workspaceId,
    });
    setLogs(res.data.logs || []);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [endpointId, workspaceId]);

  const handleRetry = async (logId) => {
    setRetrying(logId);
    const res = await base44.functions.invoke('webhookDispatch', {
      action: 'retry_delivery',
      log_id: logId,
    });
    if (res.data.status === 'success') toast.success('Retry succeeded');
    else toast.error('Retry failed');
    setRetrying(null);
    loadLogs();
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (!logs.length) return <p className="text-sm text-muted-foreground text-center py-6">No delivery logs yet.</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Delivery Logs ({logs.length})</p>
        <Button variant="ghost" size="sm" onClick={loadLogs}><RotateCcw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {logs.map(log => (
          <div key={log.id} className="p-3 border rounded-lg bg-card text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[log.delivery_status] || ''}`}>
                {log.delivery_status}
              </Badge>
              <span className="text-xs text-muted-foreground">{fmtDate(log.created_date)}</span>
            </div>
            <p className="text-xs font-mono truncate">{log.event_type}</p>
            {log.duration_ms && <p className="text-xs text-muted-foreground">{log.duration_ms}ms · Attempt {log.attempt_number}/{log.max_attempts}</p>}
            {log.error_message && <p className="text-xs text-destructive">{log.error_message}</p>}
            {log.delivery_status === 'failed' && (
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleRetry(log.id)} disabled={retrying === log.id}>
                {retrying === log.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}Retry
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block border rounded-lg overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>HTTP</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <>
                <TableRow key={log.id} className="cursor-pointer" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.created_date)}</TableCell>
                  <TableCell className="font-mono text-xs">{log.event_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[log.delivery_status] || ''}`}>
                      {log.delivery_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.response_status || '—'}</TableCell>
                  <TableCell className="text-xs">{log.duration_ms ? `${log.duration_ms}ms` : '—'}</TableCell>
                  <TableCell className="text-xs">{log.attempt_number}/{log.max_attempts}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {log.delivery_status === 'failed' && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }} disabled={retrying === log.id}>
                          {retrying === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        </Button>
                      )}
                      {expandedLog === log.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedLog === log.id && (
                  <TableRow key={`${log.id}-details`}>
                    <TableCell colSpan={7} className="bg-muted/30">
                      <div className="text-xs space-y-1 py-1">
                        <p><strong>URL:</strong> {log.url}</p>
                        {log.error_message && <p className="text-destructive"><strong>Error:</strong> {log.error_message}</p>}
                        {log.response_body && <p className="truncate"><strong>Response:</strong> {log.response_body.substring(0, 200)}</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}