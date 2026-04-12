import { Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const FOOTER_LINKS = {
  Product: [
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Browse Events', to: '/events' },
  ],
  Solutions: [
    { label: 'Online Events', href: '/#features' },
    { label: 'In-Person Events', href: '/#features' },
    { label: 'Hybrid Events', href: '/#features' },
    { label: 'Recurring Sessions', href: '/#features' },
    { label: 'Box Office', href: '/#features' },
  ],
  Industries: [
    { label: 'Workshops & Classes', href: '/#industries' },
    { label: 'Conferences', href: '/#industries' },
    { label: 'Concerts & Festivals', href: '/#industries' },
    { label: 'Non-Profits', href: '/#industries' },
    { label: 'Corporate Events', href: '/#industries' },
  ],
  Company: [
    { label: 'Organiser Login', action: 'login' },
    { label: 'Get Started', to: '/admin' },
  ],
};

export default function FooterSection() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">Ticket Deck</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Australia's lowest-fee event ticketing platform. Sell tickets, scan attendees, manage events — built for Aussie organisers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-semibold text-foreground text-sm mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </Link>
                    ) : link.action === 'login' ? (
                      <button
                        onClick={() => base44.auth.redirectToLogin()}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Ticket Deck. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Built in Australia, for Australian organisers 🇦🇺</span>
          </div>
        </div>
      </div>
    </footer>
  );
}