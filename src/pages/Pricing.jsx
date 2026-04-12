import { Ticket, ArrowRight, Check, DollarSign, CreditCard, ShieldCheck, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FeeCalculator from '@/components/landing/FeeCalculator';
import { base44 } from '@/api/base44Client';
import ComparisonSection from '@/components/landing/ComparisonSection';
import FooterSection from '@/components/landing/FooterSection';

const PLANS = [
  {
    name: 'Free Events',
    price: '$0',
    subtitle: 'Always free. No catches.',
    highlight: false,
    features: [
      'Unlimited free events',
      'Unlimited attendees',
      'QR check-in scanner',
      'Custom branding',
      'Email confirmations',
      'All features included',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Paid Events',
    price: '1%',
    subtitle: 'Per ticket, capped at $1. Plus Stripe fees.',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Everything in Free, plus:',
      'Stripe payment processing',
      'Fee capped at $1 per ticket',
      'Pass fees to buyers or absorb',
      'Discount codes & promos',
      'Revenue reports & exports',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    subtitle: 'For large-scale organisers.',
    highlight: false,
    features: [
      'Everything in Paid, plus:',
      'Custom fee arrangements',
      'Dedicated support',
      'SLA guarantees',
      'Custom integrations',
      'Volume discounts',
    ],
    cta: 'Contact Us',
  },
];

const PERKS = [
  {
    icon: DollarSign,
    title: 'No subscriptions, ever',
    desc: 'No monthly fees, no contracts, no commitments. You only pay when you sell paid tickets.',
  },
  {
    icon: ShieldCheck,
    title: 'Fee capped at $1',
    desc: 'Our 1% platform fee is capped at $1 per ticket. Sell a $200 ticket? Still just $1.',
  },
  {
    icon: CreditCard,
    title: 'Free events are truly free',
    desc: 'Hosting a free event? You won\'t pay a cent. Not now, not ever. No limits.',
  },
  {
    icon: Zap,
    title: 'Every feature included',
    desc: 'No paywalls or tiers locking features. QR scanning, Zoom, reports, multi-language — all from day one.',
  },
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
            Free events are free.<br />
            <span className="text-primary">Paid events: Stripe + 1%</span>
          </h1>

          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            No subscriptions. No volume tiers. No mental math. Our 1% platform fee is capped at $1 AUD per ticket — so high-ticket organisers are always protected.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-4 mb-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.price === '1%' && <span className="text-muted-foreground ml-1 text-sm">per ticket (max $1)</span>}
              </div>
              <p className="text-sm text-muted-foreground">{plan.subtitle}</p>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={plan.highlight ? 'default' : 'outline'}
                onClick={() => {
                  if (plan.name === 'Enterprise') {
                    window.location.href = 'mailto:hello@ticketdeck.io?subject=Enterprise%20Inquiry';
                  } else {
                    base44.auth.redirectToLogin('/admin');
                  }
                }}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Fee Calculator */}
      <section className="pb-20 px-4">
        <FeeCalculator />
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

      {/* Competitor comparison */}
      <ComparisonSection />

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ready to stop overpaying for ticketing?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join Australian organisers who keep more of their ticket revenue.
          </p>
          <Button size="lg" className="mt-6 gap-2 text-base px-8" onClick={() => base44.auth.redirectToLogin('/admin')}>
            Start selling tickets <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}