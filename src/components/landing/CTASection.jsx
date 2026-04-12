import { ArrowRight, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="py-20 sm:py-28 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-3xl p-10 sm:p-16 overflow-hidden">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none" />

          <div className="relative">
            <Ticket className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Ready to sell tickets<br />
              <span className="text-primary">without the ridiculous fees?</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
              Join thousands of event organisers worldwide who are keeping more of their ticket revenue with Ticket Deck.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/25" onClick={() => window.location.href = '/admin'}>
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => window.location.href = '/pricing'}>
                Compare Pricing
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required · No contracts · Free events always free
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}