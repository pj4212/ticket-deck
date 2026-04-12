import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const TIERS = [
  { name: 'Starter', range: '≤ 50 tickets/mo', fee: 'FREE', note: '$0 platform fee', highlight: false },
  { name: 'Growth', range: '51–200 tickets/mo', fee: '1.2%', note: 'per ticket', highlight: false },
  { name: 'Pro', range: '201–500 tickets/mo', fee: '0.9%', note: 'per ticket', highlight: true, badge: 'Most Popular' },
  { name: 'Scale', range: '501+ tickets/mo', fee: '0.6%', note: 'per ticket', highlight: false },
];

const INCLUDED = [
  'All features included',
  'No monthly subscription',
  'No flat per-ticket fees',
  'Free events always free',
  'Cancel anytime',
];

export default function PricingPreviewSection() {
  return (
    <section className="py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Simple, volume-based pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No subscriptions. No flat per-ticket fees. The more you sell, the less you pay. Free events are always free.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border p-6 flex flex-col text-center ${
                t.highlight
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {t.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                  {t.badge}
                </Badge>
              )}
              <h3 className="text-lg font-semibold text-foreground">{t.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t.range}</p>
              <div className="mt-5 mb-2">
                <span className="text-4xl font-bold text-foreground">{t.fee}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.note}</p>

              <ul className="mt-6 space-y-2 text-left flex-1">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={t.highlight ? 'default' : 'outline'}
                onClick={() => window.location.href = '/admin'}
              >
                {t.fee === 'FREE' ? 'Start Free' : 'Get Started'}
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