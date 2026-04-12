import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowRight, Check, X, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COMPETITORS_DATA = {
  'ticket-tailor': {
    name: 'Ticket Tailor',
    description: 'With no subscription fees, a powerful suite of features, and built for Australia, Ticket Deck is a powerful Ticket Tailor alternative for your events.',
    pros: ['No monthly subscription fees', 'Fee capped at $1 per ticket', 'Built for Australian organisers'],
    cons: ['Ticket Tailor charges $19–$99/mo', 'Ticket Tailor has flat fees per ticket that add up quickly'],
    tdFee: '1% (max $1)',
    compFee: '$0.65 flat + Stripe fees',
  },
  'eventbrite': {
    name: 'Eventbrite',
    description: 'With significantly lower fees, faster payouts, and no hidden costs, Ticket Deck is the best Eventbrite alternative for Australian events.',
    pros: ['Fee capped at $1 per ticket vs Eventbrite\'s 3.5% + $1.59', 'Free events are always free', 'No organizer subscription fees'],
    cons: ['Eventbrite charges high percentage fees', 'Eventbrite may delay payouts'],
    tdFee: '1% (max $1)',
    compFee: '3.5% + $1.59',
  },
  'ticketebo': {
    name: 'Ticketebo',
    description: 'Ticket Deck offers a modern, easy-to-use interface and lower fees, making it the perfect Ticketebo alternative.',
    pros: ['Modern user interface', 'Lower capped fees', 'Better scanning app'],
    cons: ['Ticketebo charges 3.85% (incl GST)', 'Ticketebo has outdated designs'],
    tdFee: '1% (max $1)',
    compFee: '3.85%',
  },
  'trybooking': {
    name: 'TryBooking',
    description: 'Ticket Deck provides better customisation, lower fees for high-priced tickets, and a cleaner checkout than TryBooking.',
    pros: ['Fee capped at $1 per ticket', 'Fully customizable checkout', 'Advanced features built-in'],
    cons: ['TryBooking charges 5% + $0.50 per ticket', 'TryBooking has rigid layouts'],
    tdFee: '1% (max $1)',
    compFee: '5% + $0.50',
  },
  'humanitix': {
    name: 'Humanitix',
    description: 'Ticket Deck gives you full control over your revenue with fees capped at $1, a great Humanitix alternative for organisers focused on profitability.',
    pros: ['Lower overall ticketing fees', 'Keep 100% of your revenue', 'Built-in payment processing'],
    cons: ['Humanitix charges 4% + $0.99', 'Higher fees on expensive tickets'],
    tdFee: '1% (max $1)',
    compFee: '4% + $0.99',
  },
  'ticketleap': {
    name: 'Ticketleap',
    description: 'Stop paying high percentage fees. Ticket Deck is the ideal Ticketleap alternative for Australian event creators.',
    pros: ['Fee capped at $1 per ticket', 'Local Australian support', 'No hidden charges'],
    cons: ['Ticketleap charges $1 + 5% per ticket', 'High percentage fees'],
    tdFee: '1% (max $1)',
    compFee: '5% + $1.00',
  }
};

const FEATURE_COMP = [
  { feature: 'No monthly subscription', td: true, comp: true },
  { feature: 'Fee capped at $1/ticket', td: true, comp: false },
  { feature: 'Free events at $0', td: true, comp: true },
  { feature: 'Multi-currency support', td: true, comp: false },
  { feature: 'Custom branding', td: true, comp: false },
  { feature: 'QR check-in scanner', td: true, comp: true },
  { feature: 'Tax configuration (GST)', td: true, comp: false },
];

function BoolIcon({ val }) {
  if (val === true) return <Check className="h-5 w-5 text-emerald-400" />;
  return <X className="h-5 w-5 text-red-400/60" />;
}

export default function ComparePage() {
  const { competitor } = useParams();
  const data = COMPETITORS_DATA[competitor?.toLowerCase()];

  if (!data) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-6">
            Ticket Deck vs. {data.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {data.description}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gap-2 px-8 h-12" asChild>
              <Link to="/admin">
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Side by side comparison */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Why Ticket Deck is a leading {data.name} alternative</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground">Ticket Deck</h3>
              </div>
              <ul className="space-y-4">
                {data.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 bg-primary/10 rounded-xl">
                <p className="text-sm text-primary font-medium mb-1">Our Fee</p>
                <p className="text-2xl font-bold text-foreground">{data.tdFee}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm opacity-80">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <span className="font-bold text-secondary-foreground text-lg">{data.name.charAt(0)}</span>
                </div>
                <h3 className="text-2xl font-semibold text-foreground">{data.name}</h3>
              </div>
              <ul className="space-y-4">
                {data.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <X className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-4 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground font-medium mb-1">Their Fee</p>
                <p className="text-2xl font-bold text-foreground">{data.compFee}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">Feature comparison</h3>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="py-4 px-6 font-semibold text-foreground border-b border-border">Feature</th>
                  <th className="py-4 px-6 font-semibold text-primary text-center border-b border-border">Ticket Deck</th>
                  <th className="py-4 px-6 font-semibold text-muted-foreground text-center border-b border-border">{data.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURE_COMP.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 text-foreground font-medium">{row.feature}</td>
                    <td className="py-4 px-6"><div className="flex justify-center"><BoolIcon val={row.td} /></div></td>
                    <td className="py-4 px-6"><div className="flex justify-center"><BoolIcon val={row.comp} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}