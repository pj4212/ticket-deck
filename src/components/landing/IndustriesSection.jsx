import { 
  GraduationCap, Music, Users, Building2, 
  Dumbbell, Heart, Briefcase, PartyPopper 
} from 'lucide-react';

const INDUSTRIES = [
  {
    icon: GraduationCap,
    title: 'Workshops & Classes',
    desc: 'Pottery, cooking, art, language classes — manage registrations with timed entry slots and capacity limits.',
  },
  {
    icon: Music,
    title: 'Concerts & Festivals',
    desc: 'Multi-day events, VIP tiers, early bird pricing, and high-volume scanning at the gates.',
  },
  {
    icon: Briefcase,
    title: 'Conferences & Summits',
    desc: 'Speaker sessions, multi-track agendas, hybrid attendance, custom registration fields.',
  },
  {
    icon: Heart,
    title: 'Non-Profits & Fundraisers',
    desc: 'Free events at zero cost. Collect donations with custom checkout fields. Export attendee lists.',
  },
  {
    icon: Users,
    title: 'Community Events',
    desc: 'Local meetups, cultural celebrations, networking events. Simple setup, beautiful event pages.',
  },
  {
    icon: Building2,
    title: 'Corporate Events',
    desc: 'Private invite-only events, branded checkout, team management, and detailed reporting.',
  },
  {
    icon: Dumbbell,
    title: 'Sports & Fitness',
    desc: 'Recurring fitness classes, timed sessions, membership integrations, and waitlists.',
  },
  {
    icon: PartyPopper,
    title: 'Entertainment & Shows',
    desc: 'Theatre, comedy, drag shows, markets. Multiple ticket tiers with capacity management.',
  },
];

export default function IndustriesSection() {
  return (
    <section id="industries" className="py-20 sm:py-28 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Industries</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built for every type of event
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From intimate workshops to large-scale festivals, Ticket Deck adapts to your industry and audience — anywhere in the world.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {INDUSTRIES.map((ind) => (
            <div key={ind.title} className="group text-center p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <ind.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{ind.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}