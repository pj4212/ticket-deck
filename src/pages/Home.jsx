import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import LandingPage from '@/pages/LandingPage';

export default function Home() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const authed = await base44.auth.isAuthenticated();
        if (authed) {
          const me = await base44.auth.me();
          setUser(me);
          if (['admin', 'super_admin', 'event_admin'].includes(me.role)) {
            navigate('/admin', { replace: true });
            return;
          }
          if (me.role === 'scanner') {
            navigate('/scanner', { replace: true });
            return;
          }
          // Authenticated regular user → send to events
          navigate('/events', { replace: true });
          return;
        }
      } catch (e) {}
      setChecked(true);
    }
    load();
  }, []);

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Non-authenticated users see the landing page
  return <LandingPage />;
}