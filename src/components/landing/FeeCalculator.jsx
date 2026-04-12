import { useState } from 'react';
import { DollarSign, ArrowRight, Users, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function calcFees(ticketPrice) {
  if (ticketPrice <= 0) return { stripeFee: 0, platformFee: 0, totalFee: 0 };
  const stripeFee = ticketPrice * 0.0175 + 0.30;
  const platformFee = Math.min(ticketPrice * 0.01, 1.00);
  const totalFee = stripeFee + platformFee;
  return { stripeFee, platformFee, totalFee };
}

export default function FeeCalculator() {
  const [ticketPrice, setTicketPrice] = useState('');
  const [absorbFees, setAbsorbFees] = useState(false);

  const price = parseFloat(ticketPrice) || 0;
  const { stripeFee, platformFee, totalFee } = calcFees(price);

  const buyerPays = absorbFees ? price : price + totalFee;
  const youReceive = absorbFees ? price - totalFee : price;

  const isValid = price > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 border-b border-border px-6 py-5 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Calculate your fees
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Enter your ticket price — our fee is 1%, capped at $1
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Ticket price input */}
          <div className="mb-6">
            <Label htmlFor="ticket-price" className="text-base font-medium text-foreground mb-2 block">
              Ticket Price (AUD)
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
                  <span className="text-muted-foreground">Payment processing (Stripe)</span>
                  <span className="text-foreground font-medium">${stripeFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket Deck fee (1%, max $1)</span>
                  <span className="text-foreground font-medium">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground font-medium">Total fees</span>
                  <span className="text-foreground font-semibold">${totalFee.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {((totalFee / price) * 100).toFixed(1)}% of ticket price
                </p>
              </div>

              {/* Big result cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-secondary/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Buyer pays
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
        <p>Payment processing fees (e.g. Stripe 1.75% + $0.30) apply to all paid tickets. Actual rates vary by country.</p>
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