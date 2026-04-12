import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Globe, Plus, Loader2, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Clock, Shield } from 'lucide-react';

const STATUS_MAP = {
  pending_verification: { label: 'Pending DNS', variant: 'secondary', icon: Clock },
  verified: { label: 'Verified', variant: 'default', icon: CheckCircle2 },
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: AlertTriangle },
  removed: { label: 'Removed', variant: 'secondary', icon: Trash2 },
};

const SSL_MAP = {
  pending: { label: 'Pending', color: 'text-muted-foreground' },
  provisioning: { label: 'Provisioning', color: 'text-yellow-400' },
  active: { label: 'Active', color: 'text-emerald-400' },
  expired: { label: 'Expired', color: 'text-destructive' },
  failed: { label: 'Failed', color: 'text-destructive' },
};

export default function CustomDomainSettings() {
  const { workspaceId } = useOutletContext();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!workspaceId) { setLoading(false); return; }
      const d = await base44.entities.CustomDomain.filter({ workspace_id: workspaceId });
      setDomains(d.filter(dd => dd.status !== 'removed'));
      setLoading(false);
    }
    load();
  }, [workspaceId]);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setSaving(true);
    const created = await base44.entities.CustomDomain.create({
      workspace_id: workspaceId,
      domain: newDomain.trim().toLowerCase(),
      status: 'pending_verification',
      ssl_status: 'pending',
    });
    setDomains(prev => [...prev, created]);
    setNewDomain('');
    setAddOpen(false);
    setSaving(false);
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this domain?')) return;
    await base44.entities.CustomDomain.update(id, { status: 'removed' });
    setDomains(prev => prev.filter(d => d.id !== id));
  };

  const handleRefresh = async (id) => {
    setSaving(true);
    // In production, this would verify DNS. For now we simulate verification.
    await base44.entities.CustomDomain.update(id, { 
      status: 'verified', 
      dns_verified_at: new Date().toISOString() 
    });
    setDomains(prev => prev.map(d => d.id === id ? { ...d, status: 'verified', dns_verified_at: new Date().toISOString() } : d));
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Domains</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect your own domain for public event pages</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Domain</Button>
      </div>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-1">No custom domains</h2>
            <p className="text-sm text-muted-foreground mb-4">Add a domain to serve your event pages from your own URL</p>
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Domain</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map(d => {
            const st = STATUS_MAP[d.status] || STATUS_MAP.pending_verification;
            const ssl = SSL_MAP[d.ssl_status] || SSL_MAP.pending;
            const StIcon = st.icon;
            return (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-lg truncate">{d.domain}</span>
                        <Badge variant={st.variant} className="shrink-0"><StIcon className="h-3 w-3 mr-1" />{st.label}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3" />SSL: <span className={ssl.color}>{ssl.label}</span></span>
                        {d.dns_verified_at && <span>Verified: {new Date(d.dns_verified_at).toLocaleDateString('en-AU')}</span>}
                      </div>

                      {d.status === 'pending_verification' && (
                        <div className="bg-muted/50 rounded-lg p-3 mt-2 space-y-2">
                          <p className="text-xs font-medium">DNS Configuration Required</p>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Add a CNAME record pointing to your Ticket Deck instance:</p>
                            <div className="bg-background rounded border p-2 font-mono text-xs">
                              <span className="text-muted-foreground">CNAME</span> {d.domain} → <span className="text-primary">custom.ticketdeck.com.au</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {d.status === 'pending_verification' && (
                        <Button variant="outline" size="icon" onClick={() => handleRefresh(d.id)} disabled={saving} title="Verify DNS">
                          <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemove(d.id)} title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Domain</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Domain</Label>
              <Input placeholder="events.yourbrand.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Enter the subdomain or domain you want to use for your public event pages</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newDomain.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}