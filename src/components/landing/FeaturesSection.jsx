import {
  Ticket, QrCode, Globe, Palette, BarChart3, Mail,
  Video, Users, Shield, Smartphone, Zap, DollarSign,
  Clock, CalendarRange, Languages, Receipt
} from 'lucide-react';

const FEATURES = [
  { icon: DollarSign, title: 'Australia\'s lowest fees', desc: 'Free events cost nothing. Paid tickets: just 1% capped at $1. No subscriptions, ever.' },
  { icon: Globe, title: 'AUD & multi-currency', desc: 'Sell tickets in AUD by default, with support for other currencies when you need them.' },
  { icon: Ticket, title: 'Unlimited ticket types', desc: 'In-person, online, hybrid. Group tickets, early birds, timed entry, and more.' },
  { icon: QrCode, title: 'QR code check-in', desc: 'Scan attendees at the door with our mobile check-in scanner. Works offline too.' },
  { icon: Video, title: 'Zoom integration', desc: 'Auto-create Zoom webinars and send personalised join links to online attendees.' },
  { icon: Palette, title: 'Custom branding', desc: 'Your logo, colours, and custom domain. White-label event pages that match your brand.' },
  { icon: BarChart3, title: 'Real-time analytics', desc: 'Track sales, check-ins, revenue, and refunds across all events in one dashboard.' },
  { icon: Mail, title: 'Automated emails', desc: 'Order confirmations, event reminders, and updates — all sent automatically in your brand.' },
  { icon: Users, title: 'Team management', desc: 'Assign roles like admin, scanner, or manager. Control who can access what.' },
  { icon: Shield, title: 'Secure payments', desc: 'PCI-compliant via Stripe Australia. Fast payouts to your Australian bank account.' },
  { icon: CalendarRange, title: 'Recurring events', desc: 'Set up weekly, fortnightly, or monthly sessions from templates. Clone events in one click.' },
  { icon: Clock, title: 'Timed entry slots', desc: 'Manage capacity with time-slotted bookings — perfect for tours, classes, and experiences.' },
  { icon: Languages, title: 'Multi-language ready', desc: 'Support for 25+ locales with RTL layout. Serve diverse Australian audiences in their language.' },
  { icon: Receipt, title: 'GST built in', desc: 'Configure GST per workspace or event. Inclusive or exclusive modes with ABN support.' },
  { icon: Smartphone, title: 'Mobile-first design', desc: 'Booking, scanning, and admin all work beautifully on any device. No app download required.' },
  { icon: Zap, title: 'Webhooks & API', desc: 'Connect to your CRM, Zapier, or custom integrations with real-time webhooks.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 px-4 bg-card/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Everything you need to run events in Australia
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No restrictive tiers. Every feature included on every plan — from your first free event to your thousandth.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}