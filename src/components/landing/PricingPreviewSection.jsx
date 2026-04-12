import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PLANS = [
  {
    name: 'Free Events',
    price: '$0',
    subtitle: 'Always free. No catches.',
    highlight: false,
    features: [
      'Unlimited free events',
      'All features included',
      'No credit card needed',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Paid Events',
    price: '1%',
    subtitle: 'Per ticket, capped at $1',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Stripe processing + 1%',
      'Fee never exceeds $1',
      'No subscriptions ever',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    subtitle: 'For large-scale organisers',
    highlight: false,
    features: [
      'Custom fee arrangements',
      'Dedicated support & SLA',
      'Volume discounts',
    ],
    cta: 'Contact Us',
  },
];

export default function PricingPreviewSection() {
  return (
    <section className="py-20 sm:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Brutally simple pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Free events cost nothing. Paid tickets: Stripe + 1%, capped at $1. That's it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col text-center ${
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
                {plan.price === '1%' && <span className="text-muted-foreground ml-1 text-sm">max $1</span>}
              </div>
              <p className="text-sm text-muted-foreground">{plan.subtitle}</p>

              <ul className="mt-6 space-y-2.5 text-left flex-1">
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
                    window.location.href = '/admin';
                  }
                }}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Payment processing fees (e.g. Stripe 1.75% + $0.30) apply on paid tickets. Varies by country.
          </p>
          <Link to="/pricing">
            <Button variant="link" className="gap-1 text-primary">
              View full pricing & fee calculator <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}