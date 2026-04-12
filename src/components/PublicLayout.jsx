import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Ticket, LogIn, LogOut, UserCog, Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSelector from '@/components/booking/LanguageSelector';
import { resolveLocale, getWorkspaceLanguages } from '@/lib/i18n';
import { getLocaleDirection } from '@/lib/i18n/locales';

const NAV_LINKS = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', to: '/pricing' },
  {
    label: 'Solutions',
    children: [
      { label: 'Online Events & Webinars', href: '/#features' },
      { label: 'In-Person Events', href: '/#features' },
      { label: 'Hybrid Events', href: '/#features' },
      { label: 'Recurring Sessions', href: '/#features' },
      { label: 'Box Office & Walk-ins', href: '/#features' },
    ],
  },
  {
    label: 'Industries',
    children: [
      { label: 'Conferences & Summits', href: '/#industries' },
      { label: 'Workshops & Classes', href: '/#industries' },
      { label: 'Concerts & Festivals', href: '/#industries' },
      { label: 'Community & Non-Profits', href: '/#industries' },
      { label: 'Corporate Events', href: '/#industries' },
      { label: 'Sports & Fitness', href: '/#industries' },
    ],
  },
];

function NavDropdown({ item, onClose }) {
  const [open, setOpen] = useState(false);
  let timeout = null;
  const handleEnter = () => { clearTimeout(timeout); setOpen(true); };
  const handleLeave = () => { timeout = setTimeout(() => setOpen(false), 150); };
  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        onClick={() => setOpen(prev => !prev)}
      >
        {item.label} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 pt-1 w-56 z-50">
          <div className="bg-card border border-border rounded-lg shadow-xl py-2">
            {item.children.map((child) => (
              <a
                key={child.label}
                href={child.href || child.to}
                onClick={() => { setOpen(false); onClose?.(); }}
                className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {child.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicLayout() {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const locale = resolveLocale(workspace);
  const dir = getLocaleDirection(locale);
  const languages = getWorkspaceLanguages(workspace);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) setUser(await base44.auth.me());
    }).catch(() => {});
    // Load first workspace for language config
    base44.entities.Workspace.filter({}).then(wsList => {
      if (wsList.length) setWorkspace(wsList[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const scrollToSection = (href) => {
    setMobileOpen(false);
    if (href.startsWith('/#')) {
      const id = href.replace('/#', '');
      if (location.pathname === '/') {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Top navigation bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Ticket className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Ticket Deck</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6 ml-10">
            {NAV_LINKS.map((item) =>
              item.children ? (
                <NavDropdown key={item.label} item={item} />
              ) : item.to ? (
                <Link key={item.label} to={item.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => { e.preventDefault(); scrollToSection(item.href); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Browse Events
                </Link>
                <Link to="/my-tickets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  My Tickets
                </Link>
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                  <Link to="/account"><UserCog className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => base44.auth.logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => base44.auth.redirectToLogin()}>
                  Organiser Login
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => base44.auth.redirectToLogin('/admin')}>
                  Get Started Free
                </Button>
              </>
            )}
            {languages.length > 1 && (
              <LanguageSelector languages={languages} currentLocale={locale} />
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1">
            {NAV_LINKS.map((item) =>
              item.children ? (
                <div key={item.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-1">{item.label}</p>
                  {item.children.map((child) => (
                    <a
                      key={child.label}
                      href={child.href || child.to}
                      onClick={() => setMobileOpen(false)}
                      className="block px-2 py-2 text-sm text-foreground hover:text-primary transition-colors"
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              ) : item.to ? (
                <Link key={item.label} to={item.to} className="block px-2 py-2 text-sm text-foreground hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => { e.preventDefault(); scrollToSection(item.href); }}
                  className="block px-2 py-2 text-sm text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {item.label}
                </a>
              )
            )}
            <div className="pt-3 border-t border-border space-y-2">
              {user ? (
                <>
                  <Link to="/events" className="block px-2 py-2 text-sm text-foreground">Browse Events</Link>
                  <Link to="/my-tickets" className="block px-2 py-2 text-sm text-foreground">My Tickets</Link>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => base44.auth.logout()}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => base44.auth.redirectToLogin()}>
                    Organiser Login
                  </Button>
                  <Button size="sm" className="w-full" onClick={() => base44.auth.redirectToLogin('/admin')}>
                    Get Started Free
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <Outlet context={{ user, workspace, locale, dir }} />
    </div>
  );
}