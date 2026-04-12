import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Workshop Organiser',
    location: 'Sydney, Australia',
    text: 'We switched from Eventbrite and saved over $800 in fees in our first quarter. The QR check-in scanner alone is worth it — so much smoother than paper lists.',
    stars: 5,
  },
  {
    name: 'James K.',
    role: 'Festival Director',
    location: 'London, UK',
    text: 'The recurring event templates save us hours every week. We run 12 weekly sessions and Ticket Deck handles the whole thing — ticketing, reminders, check-ins, reports.',
    stars: 5,
  },
  {
    name: 'Maria L.',
    role: 'Non-Profit Coordinator',
    location: 'Toronto, Canada',
    text: 'Free events being truly free was the dealbreaker for us. No hidden fees, no "but you still pay processing". Our charity events cost us nothing to run.',
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Loved by organisers worldwide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col">
              <Quote className="h-8 w-8 text-primary/30 mb-4 shrink-0" />
              <p className="text-foreground leading-relaxed flex-1">{t.text}</p>
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role} · {t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}