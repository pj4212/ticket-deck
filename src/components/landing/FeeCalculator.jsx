import { useState } from 'react';
import { DollarSign, ArrowRight, Users, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function getTier(volume) {
  if (volume <= 50) return { name: 'Starter', pct: 0, label: 'FREE' };
  if (volume <= 200) return { name: 'Growth', pct: 0.012, label: '1.2%' };
  if (volume <= 500) return { name: 'Pro', pct: 0.009, label: '0.9%' };
  return { name: 'Scale', pct: 0.006, label: '0.6%' };
}

function calcFees(ticketPrice, volume) {
  const tier = getTier(volume);
  const stripeFee = ticketPrice > 0 ? ticketPrice * 0.0175 + 0.30 : 0;
  const platformFee = ticketPrice * tier.pct;
  const totalFee = stripeFee + platformFee;
  return { tier, stripeFee, platformFee, totalFee };
}

export default function FeeCalculator() {
  const [ticketPrice, setTicketPrice] = useState('');
  const [volume, setVolume] = useState('50');
  const [absorbFees, setAbsorbFees] = useState(false);

  const price = parseFloat(ticketPrice) || 0;
  const vol = parseInt(volume) || 50;
  const { tier, stripeFee, platformFee, totalFee } = calcFees(price, vol);

  const buyerPays = absorbFees ? price : price + totalFee;
  const youReceive = absorbFees ? price - totalFee : price;

  const isValid = price > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Calculator card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 border-b border-border px-6 py-5 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Calculate your Ticket Space fees
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Enter your ticket price to see exactly what you'll pay — no hidden costs
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Ticket price input */}
          <div className="mb-6">
            <Label htmlFor="ticket-price" className="text-base font-medium text-foreground mb-2 block">
              Ticket Price
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="ticket-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 50.00"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>

          {/* Volume selector */}
          <div className="mb-6">
            <Label htmlFor="volume" className="text-base font-medium text-foreground mb-2 block">
              Expected tickets per month
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '≤ 50', value: '50' },
                { label: '51–200', value: '100' },
                { label: '201–500', value: '300' },
                { label: '501+', value: '600' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVolume(opt.value)}
                  className={`py-2.5 px-2 rounded-lg border text-sm font-medium transition-colors ${
                    getTier(parseInt(volume)).name === getTier(parseInt(opt.value)).name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Your tier: <span className="font-semibold text-primary">{tier.name}</span> — platform fee: <span className="font-semibold text-primary">{tier.label}</span>
            </p>
          </div>

          {/* Fee mode toggle */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-1 rounded-lg">
              <button
                onClick={() => setAbsorbFees(false)}
                className={`py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  !absorbFees
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Buyers pay fees
              </button>
              <button
                onClick={() => setAbsorbFees(true)}
                className={`py-2.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  absorbFees
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                I absorb fees
              </button>
            </div>
          </div>

          {/* Results */}
          {isValid ? (
            <div className="space-y-3">
              {/* Fee breakdown */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stripe processing fee</span>
                  <span className="text-foreground font-medium">${stripeFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket Space fee ({tier.label})</span>
                  <span className="text-foreground font-medium">
                    {platformFee === 0 ? 'FREE' : `$${platformFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground font-medium">Total fees</span>
                  <span className="text-foreground font-semibold">${totalFee.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {price > 0 ? `${((totalFee / price) * 100).toFixed(1)}% of ticket price` : ''}
                </p>
              </div>

              {/* Big result cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-secondary/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Your buyers pay
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    ${buyerPays.toFixed(2)}
                  </p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-primary uppercase tracking-wider mb-1">
                    You receive
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">
                    ${youReceive.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Enter a ticket price above to see your fees</p>
            </div>
          )}
        </div>
      </div>

      {/* Footnotes */}
      <div className="mt-4 space-y-1 text-xs text-muted-foreground text-center">
        <p>Stripe fees (1.75% + $0.30) apply to all paid tickets regardless of tier. All amounts in AUD.</p>
        <p>Free events are always free — no fees whatsoever.</p>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Button size="lg" className="gap-2 text-base px-8" onClick={() => window.location.href = '/admin'}>
          Get started free <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground mt-2">No credit card required. No subscriptions.</p>
      </div>
    </div>
  );
}