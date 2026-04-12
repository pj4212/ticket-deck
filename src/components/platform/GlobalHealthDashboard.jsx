import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, XCircle, Globe, CreditCard, Receipt } from 'lucide-react';

function StatusIcon({ ok }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    : <AlertTriangle className="h-4 w-4 text-amber-400" />;
}

function HealthBadge({ status }) {
  const map = {
    healthy: { label: 'Healthy', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    warning: { label: 'Warning', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    critical: { label: 'Critical', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  };
  const m = map[status] || map.warning;
  return <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>;
}

export default function GlobalHealthDashboard({ workspaces }) {
  if (!workspaces || workspaces.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No workspaces to analyze</p>;
  }

  const rows = workspaces.map(ws => {
    const hasCurrency = !!ws.default_currency;
    const hasTimezone = !!ws.default_timezone;
    const hasLanguage = !!ws.default_language;
    const hasTaxConfig = ws.tax_mode && ws.tax_mode !== 'none';
    const hasTaxRate = hasTaxConfig && (ws.tax_rate_percent > 0);
    const hasPayment = !!ws.payment_config_json;
    const hasLegal = !!(ws.legal_privacy_url || ws.legal_terms_url);

    const localeScore = [hasCurrency, hasTimezone, hasLanguage].filter(Boolean).length;
    const taxScore = hasTaxConfig ? (hasTaxRate ? 2 : 1) : 0;
    const paymentScore = hasPayment ? 1 : 0;
    const totalScore = localeScore + taxScore + paymentScore + (hasLegal ? 1 : 0);
    const maxScore = 7;
    const pct = Math.round((totalScore / maxScore) * 100);

    let health = 'healthy';
    if (pct < 50) health = 'critical';
    else if (pct < 80) health = 'warning';

    return {
      ...ws,
      hasCurrency, hasTimezone, hasLanguage, hasTaxConfig, hasTaxRate,
      hasPayment, hasLegal, health, pct,
    };
  });

  const healthyCnt = rows.filter(r => r.health === 'healthy').length;
  const warningCnt = rows.filter(r => r.health === 'warning').length;
  const criticalCnt = rows.filter(r => r.health === 'critical').length;

  const noTaxCnt = rows.filter(r => !r.hasTaxConfig).length;
  const noPaymentCnt = rows.filter(r => !r.hasPayment).length;
  const noCurrencyCnt = rows.filter(r => !r.hasCurrency).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Globe className="h-4 w-4" />Config Health</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-400">{healthyCnt}</p>
            <p className="text-xs text-muted-foreground">{warningCnt} warning · {criticalCnt} critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Receipt className="h-4 w-4" />Missing Tax</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${noTaxCnt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{noTaxCnt}</p>
            <p className="text-xs text-muted-foreground">of {rows.length} workspaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-4 w-4" />Missing Payment</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${noPaymentCnt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{noPaymentCnt}</p>
            <p className="text-xs text-muted-foreground">of {rows.length} workspaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">No Currency Set</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${noCurrencyCnt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{noCurrencyCnt}</p>
            <p className="text-xs text-muted-foreground">of {rows.length} workspaces</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Legal</TableHead>
              <TableHead>Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.sort((a, b) => a.pct - b.pct).map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><HealthBadge status={r.health} /></TableCell>
                <TableCell><StatusIcon ok={r.hasCurrency} /> <span className="text-xs ml-1">{r.default_currency || '—'}</span></TableCell>
                <TableCell><StatusIcon ok={r.hasTimezone} /> <span className="text-xs ml-1">{r.default_timezone?.split('/').pop()?.replace(/_/g, ' ') || '—'}</span></TableCell>
                <TableCell><StatusIcon ok={r.hasLanguage} /> <span className="text-xs ml-1">{r.default_language || '—'}</span></TableCell>
                <TableCell>
                  <StatusIcon ok={r.hasTaxRate} />
                  <span className="text-xs ml-1">{r.hasTaxConfig ? `${r.tax_mode} ${r.tax_rate_percent || 0}%` : '—'}</span>
                </TableCell>
                <TableCell><StatusIcon ok={r.hasPayment} /></TableCell>
                <TableCell><StatusIcon ok={r.hasLegal} /></TableCell>
                <TableCell>
                  <span className={`text-xs font-semibold ${r.pct >= 80 ? 'text-emerald-400' : r.pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {r.pct}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}