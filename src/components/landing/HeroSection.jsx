import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-primary">Trusted by event organisers worldwide</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
            Selling Tickets
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Made Easy
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The all-in-one event ticketing platform with the lowest fees. 
            Create events, sell tickets, scan attendees, and manage everything — from anywhere in the world.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg shadow-primary/25" onClick={() => window.location.href = '/admin'}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 h-12"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="h-4 w-4 mr-2" /> See How It Works
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free events are always free. No credit card required. No contracts.
          </p>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: '0%', label: 'Fee on free events' },
              { value: '0.6%', label: 'Lowest platform fee' },
              { value: '$0/mo', label: 'No subscriptions' },
              { value: '∞', label: 'Events & features' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}