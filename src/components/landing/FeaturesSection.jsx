import { 
  Ticket, QrCode, Globe, Palette, BarChart3, Mail, 
  Video, Users, Shield, Smartphone, Zap, DollarSign 
} from 'lucide-react';

const FEATURES = [
  { icon: DollarSign, title: 'Lowest fees in AU', desc: 'Free for ≤50 tickets/mo. From 0.6% after that. No subscriptions.' },
  { icon: Ticket, title: 'Unlimited ticket types', desc: 'In-person, online, hybrid. Group tickets, early birds, and more.' },
  { icon: QrCode, title: 'QR check-in app', desc: 'Scan attendees at the door with our mobile check-in scanner.' },
  { icon: Video, title: 'Zoom integration', desc: 'Auto-create Zoom webinars and send join links to attendees.' },
  { icon: Palette, title: 'Custom branding', desc: 'Your logo, colours, and domain. White-label event pages.' },
  { icon: Globe, title: 'Public event pages', desc: 'Beautiful event landing pages shareable via link.' },
  { icon: BarChart3, title: 'Real-time reports', desc: 'Track sales, check-ins, and revenue across all events.' },
  { icon: Mail, title: 'Automated emails', desc: 'Confirmations, reminders, and updates sent automatically.' },
  { icon: Users, title: 'Team management', desc: 'Assign roles to team members — scanners, managers, finance.' },
  { icon: Shield, title: 'Secure payments', desc: 'PCI-compliant via Stripe. Your buyers\' data is always safe.' },
  { icon: Smartphone, title: 'Mobile-first design', desc: 'Booking, scanning, and admin all work beautifully on mobile.' },
  { icon: Zap, title: 'Webhooks & API', desc: 'Connect to your existing tools with webhooks and custom integrations.' },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 bg-card/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            All-in-one event ticketing &amp; management
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No restrictive tiers. Every feature included on every plan — QR scanning, Zoom, reports, branding, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}