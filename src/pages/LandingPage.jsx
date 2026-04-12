import { Button } from '@/components/ui/button';
import { Ticket, ArrowRight } from 'lucide-react';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
import ComparisonSection from '@/components/landing/ComparisonSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-24 sm:py-32 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Australia's lowest-fee ticketing platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Sell tickets without<br />
            <span className="text-primary">the ridiculous fees</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free for up to 50 tickets/month. No subscriptions, no flat per-ticket fees. 
            Just simple percentage-based pricing that gets cheaper as you grow.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gap-2 text-base px-8" onClick={() => window.location.href = '/admin'}>
              Get started free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              View pricing
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free events are always free. No credit card required.
          </p>
        </div>
      </section>

      <FeaturesSection />
      <PricingSection />
      <ComparisonSection />

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Ready to stop overpaying for ticketing?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join organisers across Australia who are keeping more of their ticket revenue.
          </p>
          <Button size="lg" className="mt-8 gap-2 text-base px-8" onClick={() => window.location.href = '/admin'}>
            Start selling tickets <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Ticket Deck</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Ticket Deck. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}