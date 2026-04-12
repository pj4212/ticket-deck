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
            Sell event tickets online<br />
            <span className="text-primary">without the ridiculous fees</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The cheapest Eventbrite &amp; Ticket Tailor alternative in Australia. 
            Free for up to 50 tickets/month, then from just 0.6%. No subscriptions, no flat per-ticket fees.
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

      {/* SEO Content — Why Ticket Space */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-6">
            Why Australian event organisers choose Ticket Space
          </h2>
          <div className="prose prose-invert max-w-none text-muted-foreground text-sm leading-relaxed space-y-4">
            <p>
              Finding affordable event ticketing in Australia shouldn't be hard. Platforms like <strong className="text-foreground">Eventbrite</strong> charge up to 9.15% on a $50 ticket, 
              while <strong className="text-foreground">Ticket Tailor</strong> requires a monthly subscription starting at $19/month on top of per-ticket fees. 
              <strong className="text-foreground">Humanitix</strong> donates fees to charity, but still takes 5% + Stripe fees from your revenue.
            </p>
            <p>
              <strong className="text-foreground">Ticket Deck</strong> takes a different approach: no monthly subscriptions, no flat per-ticket fees, and a free tier 
              for organisers selling up to 50 tickets a month. For higher volumes, our platform fee drops as low as 0.6% per ticket — 
              making us the cheapest way to sell event tickets online in Australia.
            </p>
            <p>
              Whether you're running conferences, workshops, community meetups, concerts, fundraisers, or hybrid events with Zoom — 
              every feature is included from day one. QR code check-in, custom branding, automated emails, real-time reporting, 
              team management, webhooks and API access — all at no extra cost.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Ready to stop overpaying for event ticketing?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join organisers across Australia who are keeping more of their ticket revenue with Ticket Deck.
          </p>
          <Button size="lg" className="mt-8 gap-2 text-base px-8" onClick={() => window.location.href = '/admin'}>
            Start selling tickets free <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Ticket Deck</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="/events" className="hover:text-foreground transition-colors">Browse Events</a>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Ticket Deck. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}