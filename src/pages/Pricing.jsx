import { Ticket, ArrowRight, DollarSign, CreditCard, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import FeeCalculator from '@/components/landing/FeeCalculator';

const PERKS = [
  {
    icon: DollarSign,
    title: 'Free for small events',
    desc: 'Sell up to 50 tickets a month with zero platform fees. You only pay Stripe processing.',
  },
  {
    icon: CreditCard,
    title: 'No subscriptions ever',
    desc: 'No monthly fees, no contracts, no commitments. Only pay when you sell paid tickets.',
  },
  {
    icon: ShieldCheck,
    title: 'Free events are always free',
    desc: 'Hosting a free event? You won\'t pay a cent in fees. Not now, not ever.',
  },
  {
    icon: Zap,
    title: 'Every feature included',
    desc: 'No paywalls or tiers locking features. Get QR scanning, Zoom, reports, and more from day one.',
  },
];

const TIERS = [
  { name: 'Starter', range: '≤ 50 tickets/mo', fee: 'FREE', platformFee: '$0', totalOn50: '$1.18', pct: '2.35%', highlight: false },
  { name: 'Growth', range: '51 – 200 tickets/mo', fee: '1.2%', platformFee: '$0.60', totalOn50: '$1.78', pct: '3.55%', highlight: false },
  { name: 'Pro', range: '201 – 500 tickets/mo', fee: '0.9%', platformFee: '$0.45', totalOn50: '$1.63', pct: '3.25%', highlight: true },
  { name: 'Scale', range: '501+ tickets/mo', fee: '0.6%', platformFee: '$0.30', totalOn50: '$1.48', pct: '2.95%', highlight: false },
];

export default function Pricing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple, transparent pricing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
            The lowest ticketing fees<br />
            <span className="text-primary">in Australia</span>
          </h1>

          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            No subscriptions, no flat per-ticket fees, no hidden costs. Start free and only pay a 
            small percentage as you grow. Pass fees to buyers or absorb them — your choice.
          </p>
        </div>
      </section>

      {/* Fee Calculator */}
      <section className="pb-20 px-4">
        <FeeCalculator />
      </section>

      {/* Tier summary */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">
            Volume-based tiers
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            Your tier is based on monthly ticket volume. The more you sell, the less you pay.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`rounded-xl border p-5 ${
                  t.highlight
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-card'
                }`}
              >
                <h3 className="font-semibold text-foreground text-lg">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.range}</p>
                <div className="mt-4">
                  <span className="text-2xl font-bold text-foreground">{t.fee}</span>
                  {t.fee !== 'FREE' && (
                    <span className="text-sm text-muted-foreground ml-1">per ticket</span>
                  )}
                </div>
                <div className="mt-3 text-sm text-muted-foreground space-y-1">
                  <p>Platform fee on $50 ticket: <span className="text-foreground font-medium">{t.platformFee}</span></p>
                  <p>Total fee on $50 ticket: <span className="text-foreground font-medium">{t.totalOn50}</span></p>
                  <p>All-in: <span className="text-foreground font-medium">{t.pct}</span></p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Stripe processing fees (1.75% + $0.30) are included in all totals above. All amounts in AUD.
          </p>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PERKS.map((p) => (
              <div key={p.title} className="bg-card border border-border rounded-xl p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ready to stop overpaying for ticketing?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join organisers across Australia who keep more of their ticket revenue.
          </p>
          <Button size="lg" className="mt-6 gap-2 text-base px-8" onClick={() => window.location.href = '/admin'}>
            Start selling tickets <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}