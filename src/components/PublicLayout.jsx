import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Ticket, LogIn, UserCog, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicLayout() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) setUser(await base44.auth.me());
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal public header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="font-bold text-base tracking-tight">Ticket Deck</span>
          </Link>
          <div className="flex items-center gap-2">
            {isLanding && (
              <>
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Features</a>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Pricing</Link>
              </>
            )}
            {user ? (
              <>
                <Link to="/my-tickets" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                  My Tickets
                </Link>
                <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                  Browse Events
                </Link>
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                  <Link to="/account"><UserCog className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => base44.auth.logout()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => base44.auth.redirectToLogin()}>
                <LogIn className="h-4 w-4 mr-1.5" />Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <Outlet context={{ user }} />
    </div>
  );
}