import { CalendarPlus, Ticket, QrCode, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    icon: CalendarPlus,
    step: '01',
    title: 'Create Your Event',
    desc: 'Set up your event in minutes. Add ticket types, set prices in AUD, configure time slots, and customise your event page with your branding.',
  },
  {
    icon: Ticket,
    step: '02',
    title: 'Sell Tickets Online',
    desc: 'Share your event page and start selling. Accept payments via Stripe Australia. Buyers get instant confirmation emails with QR code tickets.',
  },
  {
    icon: QrCode,
    step: '03',
    title: 'Scan & Manage',
    desc: 'Check attendees in with our mobile QR scanner app. Track sales in real-time, manage orders, send reminders, and export reports — all from one dashboard.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Three simple steps to selling tickets
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From setup to check-in, everything you need in one platform. Get your first event live in under 5 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.step} className="relative group">
              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[calc(100%-20%)] h-px">
                  <div className="h-full border-t-2 border-dashed border-border" />
                  <ArrowRight className="absolute -right-2 -top-2 h-4 w-4 text-muted-foreground" />
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 h-full">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-4xl font-bold text-border group-hover:text-primary/20 transition-colors">{s.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}