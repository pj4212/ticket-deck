import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const TIERS = [
  {
    name: 'Starter',
    tickets: '≤ 50',
    fee: 'FREE',
    feeDesc: '$0 platform fee',
    stripeFee: '$1.18',
    total: '$1.18',
    pct: '2.35%',
    highlight: false,
    badge: null,
  },
  {
    name: 'Growth',
    tickets: '51 – 200',
    fee: '1.2%',
    feeDesc: '$0.60 on a $50 ticket',
    stripeFee: '$1.18',
    total: '$1.78',
    pct: '3.55%',
    highlight: false,
    badge: null,
  },
  {
    name: 'Pro',
    tickets: '201 – 500',
    fee: '0.9%',
    feeDesc: '$0.45 on a $50 ticket',
    stripeFee: '$1.18',
    total: '$1.63',
    pct: '3.25%',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Scale',
    tickets: '501+',
    fee: '0.6%',
    feeDesc: '$0.30 on a $50 ticket',
    stripeFee: '$1.18',
    total: '$1.48',
    pct: '2.95%',
    highlight: false,
    badge: null,
  },
];

const ALL_FEATURES = [
  'Unlimited events',
  'Unlimited ticket types',
  'QR code check-in',
  'Custom branding',
  'Real-time reports',
  'Automated emails',
  'Team management',
  'Zoom integration',
  'Webhooks & API',
];

function TierCard({ tier }) {
  return (
    <div className={`relative rounded-xl border p-6 flex flex-col ${
      tier.highlight 
        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
        : 'border-border bg-card'
    }`}>
      {tier.badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
          <Sparkles className="h-3 w-3 mr-1" /> {tier.badge}
        </Badge>
      )}

      <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{tier.tickets} tickets/month</p>

      <div className="mt-5">
        <span className="text-3xl font-bold text-foreground">{tier.fee}</span>
        {tier.fee !== 'FREE' && <span className="text-sm text-muted-foreground ml-1">per ticket</span>}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{tier.feeDesc}</p>

      <div className="mt-4 p-3 rounded-lg bg-secondary/50 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stripe fee</span>
          <span className="text-foreground">{tier.stripeFee}</span>
        </div>
        <div className="flex justify-between mt-1 pt-1 border-t border-border">
          <span className="font-medium text-foreground">Total per $50 ticket</span>
          <span className="font-semibold text-foreground">{tier.total}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">{tier.pct} all-in</p>
      </div>

      <ul className="mt-5 space-y-2 flex-1">
        {ALL_FEATURES.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Button 
        className="mt-6 w-full" 
        variant={tier.highlight ? 'default' : 'outline'}
        onClick={() => window.location.href = '/admin'}
      >
        {tier.fee === 'FREE' ? 'Start free' : 'Get started'}
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-2">No subscription required</p>
    </div>
  );
}

function PricingCalculator() {
  const [ticketPrice, setTicketPrice] = useState([50]);
  const [volume, setVolume] = useState([100]);

  const price = ticketPrice[0];
  const qty = volume[0];

  const stripeFee = price * 0.0175 + 0.30;

  let platformPct = 0;
  let tierName = 'Starter';
  if (qty <= 50) { platformPct = 0; tierName = 'Starter'; }
  else if (qty <= 200) { platformPct = 0.012; tierName = 'Growth'; }
  else if (qty <= 500) { platformPct = 0.009; tierName = 'Pro'; }
  else { platformPct = 0.006; tierName = 'Scale'; }

  const platformFee = price * platformPct;
  const totalPerTicket = stripeFee + platformFee;
  const totalFees = totalPerTicket * qty;
  const revenue = price * qty;
  const netRevenue = revenue - totalFees;

  return (
    <div className="mt-16 max-w-2xl mx-auto bg-card border border-border rounded-xl p-6 sm:p-8">
      <h3 className="text-xl font-semibold text-foreground text-center mb-6">
        Calculate your fees
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Ticket price</span>
            <span className="font-medium text-foreground">${price}</span>
          </div>
          <Slider value={ticketPrice} onValueChange={setTicketPrice} min={5} max={500} step={5} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Tickets per month</span>
            <span className="font-medium text-foreground">{qty}</span>
          </div>
          <Slider value={volume} onValueChange={setVolume} min={10} max={2000} step={10} />
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your tier</span>
            <Badge variant="outline">{tierName}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stripe fee per ticket</span>
            <span className="text-foreground">${stripeFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform fee per ticket</span>
            <span className="text-foreground">{platformFee === 0 ? 'FREE' : `$${platformFee.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Total fees per ticket</span>
            <span className="font-medium text-foreground">${totalPerTicket.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total fees ({qty} tickets)</span>
            <span className="font-medium text-foreground">${totalFees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base">
            <span className="font-semibold text-foreground">You keep</span>
            <span className="font-bold text-primary">${netRevenue.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {((netRevenue / revenue) * 100).toFixed(1)}% of revenue
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No subscriptions. No flat per-ticket fees. Start free and only pay a small percentage as you grow. 
            Free events are always free.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map(tier => (
            <TierCard key={tier.name} tier={tier} />
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Stripe fees (1.75% + $0.30 per transaction) apply to all paid tickets, regardless of tier.
          <br />All prices in AUD. Free events incur no fees whatsoever.
        </p>

        <PricingCalculator />
      </div>
    </section>
  );
}