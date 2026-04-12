import { Check, X, Minus } from 'lucide-react';

const COMPETITORS = [
  {
    name: 'Ticket Space (Starter)',
    subscription: 'None',
    perTicket: 'FREE',
    stripeFee: '$1.18',
    total50: '$1.18',
    pctOf50: '2.35%',
    best: true,
  },
  {
    name: 'Ticket Space (Pro)',
    subscription: 'None',
    perTicket: '0.9%',
    stripeFee: '$1.18',
    total50: '$1.63',
    pctOf50: '3.25%',
    best: false,
  },
  {
    name: 'Ticket Tailor',
    subscription: '$19–$99/mo',
    perTicket: '$0.65 flat',
    stripeFee: '$1.18',
    total50: '$1.83 + sub',
    pctOf50: '3.65%+',
    best: false,
  },
  {
    name: 'Eventbrite',
    subscription: 'None',
    perTicket: '3.5% + $1.59',
    stripeFee: 'Included',
    total50: '$4.58',
    pctOf50: '9.15%',
    best: false,
  },
  {
    name: 'Humanitix',
    subscription: 'None',
    perTicket: '5% (to charity)',
    stripeFee: '$1.18',
    total50: '$3.68',
    pctOf50: '7.35%',
    best: false,
  },
  {
    name: 'TicketLeap',
    subscription: 'None',
    perTicket: '$1.00 + 5%',
    stripeFee: '$1.18',
    total50: '$4.68',
    pctOf50: '9.35%',
    best: false,
  },
];

const FEATURE_COMP = [
  { feature: 'No monthly subscription', td: true, tt: false, eb: true, hu: true },
  { feature: 'Free tier (≤50 tickets)', td: true, tt: false, eb: false, hu: false },
  { feature: 'Free events at $0', td: true, tt: true, eb: true, hu: true },
  { feature: 'Custom branding', td: true, tt: true, eb: false, hu: false },
  { feature: 'QR check-in scanner', td: true, tt: true, eb: true, hu: true },
  { feature: 'Zoom integration', td: true, tt: false, eb: false, hu: false },
  { feature: 'Webhooks & API', td: true, tt: true, eb: true, hu: false },
  { feature: 'Team roles & permissions', td: true, tt: true, eb: true, hu: true },
];

function BoolIcon({ val }) {
  if (val === true) return <Check className="h-4 w-4 text-green-500" />;
  if (val === false) return <X className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function ComparisonSection() {
  return (
    <section className="py-20 px-4 bg-card/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            How we compare
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Cost per $50 ticket across popular Australian ticketing platforms.
          </p>
        </div>

        {/* Price comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Platform</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Subscription</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Platform fee</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Stripe fee</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total / $50 ticket</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">% of ticket</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map(c => (
                <tr key={c.name} className={`border-b border-border ${c.best ? 'bg-primary/5' : ''}`}>
                  <td className={`py-3 px-4 font-medium ${c.best ? 'text-primary' : 'text-foreground'}`}>
                    {c.name}
                    {c.best && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Cheapest</span>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.subscription}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.perTicket}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.stripeFee}</td>
                  <td className={`py-3 px-4 font-medium ${c.best ? 'text-primary' : 'text-foreground'}`}>{c.total50}</td>
                  <td className="py-3 px-4 text-muted-foreground">{c.pctOf50}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Feature comparison */}
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">Feature comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">Feature</th>
                  <th className="text-center py-3 px-4 text-primary font-semibold">Ticket Space</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Ticket Tailor</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Eventbrite</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium">Humanitix</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMP.map(row => (
                  <tr key={row.feature} className="border-b border-border">
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