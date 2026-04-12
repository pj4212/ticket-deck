import { Check, X } from 'lucide-react';

const COMPETITORS = [
  {
    name: 'Ticket Deck',
    subscription: 'None',
    perTicket: '1% (max $1)',
    processingFee: '~1.75% + $0.30',
    total50: '$1.68',
    pctOf50: '3.35%',
    best: true,
  },
  {
    name: 'Ticket Tailor',
    subscription: '$19–$99/mo',
    perTicket: '$0.65 flat',
    processingFee: 'Stripe fees',
    total50: '$1.83 + sub',
    pctOf50: '3.65%+',
    best: false,
  },
  {
    name: 'Eventbrite',
    subscription: 'None',
    perTicket: '3.5% + $1.59',
    processingFee: 'Included',
    total50: '$4.58',
    pctOf50: '9.15%',
    best: false,
  },
  {
    name: 'Humanitix',
    subscription: 'None',
    perTicket: '5% (to charity)',
    processingFee: 'Stripe fees',
    total50: '$3.68',
    pctOf50: '7.35%',
    best: false,
  },
];

const FEATURE_COMP = [
  { feature: 'No monthly subscription', td: true, tt: false, eb: true, hu: true },
  { feature: 'Fee capped at $1/ticket', td: true, tt: false, eb: false, hu: false },
  { feature: 'Free events at $0', td: true, tt: true, eb: true, hu: true },
  { feature: 'Multi-currency support', td: true, tt: true, eb: true, hu: false },
  { feature: 'Custom branding & domain', td: true, tt: true, eb: false, hu: false },
  { feature: 'QR check-in scanner', td: true, tt: true, eb: true, hu: true },
  { feature: 'Zoom integration', td: true, tt: false, eb: false, hu: false },
  { feature: 'Multi-language support', td: true, tt: false, eb: false, hu: false },
  { feature: 'Tax configuration (GST/VAT)', td: true, tt: false, eb: false, hu: false },
  { feature: 'Webhooks & API', td: true, tt: true, eb: true, hu: false },
  { feature: 'Team roles & permissions', td: true, tt: true, eb: true, hu: true },
  { feature: 'Recurring events', td: true, tt: true, eb: true, hu: true },
];

function BoolIcon({ val }) {
  if (val === true) return <Check className="h-4 w-4 text-emerald-400" />;
  return <X className="h-4 w-4 text-red-400/60" />;
}

export default function ComparisonSection() {
  return (
    <section className="py-20 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Comparison</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            How Ticket Deck compares
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            See how fees and features stack up against the most popular ticketing platforms (based on a $50 AUD ticket).
          </p>
        </div>

        {/* Price comparison table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Platform</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Subscription</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Platform fee</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Processing</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total / $50</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">% of ticket</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr key={c.name} className={`border-t border-border ${c.best ? 'bg-primary/5' : ''}`}>
                  <td className={`py-3 px-4 font-medium ${c.best ? 'text-primary' : 'text-foreground'}`}>
                    {c.name}
                    {c.best && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Lowest</span>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.subscription}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.perTicket}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.processingFee}</td>
                  <td className={`py-3 px-4 font-medium ${c.best ? 'text-primary' : 'text-foreground'}`}>{c.total50}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.pctOf50}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Fees shown are approximate and based on standard Stripe rates. Actual processing fees vary by country and payment method.
        </p>

        {/* Feature comparison */}
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">Feature comparison</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-primary font-semibold">Ticket Deck</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Ticket Tailor</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Eventbrite</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Humanitix</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMP.map((row) => (
                  <tr key={row.feature} className="border-t border-border">
                    <td className="py-3 px-4 text-foreground">{row.feature}</td>
                    <td className="py-3 px-4"><div className="flex justify-center"><BoolIcon val={row.td} /></div></td>
                    <td className="py-3 px-4"><div className="flex justify-center"><BoolIcon val={row.tt} /></div></td>
                    <td className="py-3 px-4"><div className="flex justify-center"><BoolIcon val={row.eb} /></div></td>
                    <td className="py-3 px-4"><div className="flex justify-center"><BoolIcon val={row.hu} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}