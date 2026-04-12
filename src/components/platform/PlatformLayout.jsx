import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Building2, CreditCard, ToggleLeft, Headphones,
  ShieldAlert, Plug, ScrollText, ChevronLeft, ChevronRight, Menu, X, LogOut, Crown
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/platform', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/platform/workspaces', label: 'Workspaces', icon: Building2 },
  { path: '/platform/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/platform/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { path: '/platform/support', label: 'Support Tools', icon: Headphones },
  { path: '/platform/risk', label: 'Risk & Abuse', icon: ShieldAlert },
  { path: '/platform/integrations', label: 'Integration Health', icon: Plug },
  { path: '/platform/audit', label: 'Audit Logs', icon: ScrollText },
];

export default function PlatformLayout() {
  const [user, setUser] = useState(null);
  const [platformUser, setPlatformUser] = useState(null);
  const [platformRole, setPlatformRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      if (!me) { navigate('/'); return; }
      setUser(me);

      const pUsers = await base44.entities.PlatformUser.filter({ email: me.email });
      if (!pUsers.length) { navigate('/'); return; }
      setPlatformUser(pUsers[0]);

      const roles = await base44.entities.PlatformRoleAssignment.filter({ user_id: pUsers[0].id, is_active: true });
      const role = roles.find(r => ['platform_owner', 'platform_admin', 'platform_support', 'platform_readonly'].includes(r.role));
      if (!role) { navigate('/'); return; }
      setPlatformRole(role.role);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  const isActive = (path) => location.pathname === path || (path !== '/platform' && location.pathname.startsWith(path));
  const isReadOnly = platformRole === 'platform_readonly';

  const sidebar = (
    <div className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border ${collapsed ? 'w-16' : 'w-60'} transition-all`}>
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            <span className="font-bold text-foreground">Platform</span>
          </div>
        )}
        {collapsed && <Crown className="h-5 w-5 text-yellow-400 mx-auto" />}
        <Button variant="ghost" size="icon" className="hidden md:flex text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.path) ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
            }`}>
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {!collapsed && <p className="text-xs text-sidebar-foreground mb-2 truncate px-1">{user?.email}</p>}
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent" onClick={() => navigate('/admin')}>
          <Building2 className="h-4 w-4" />{!collapsed && 'Workspace Admin'}
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent" onClick={() => base44.auth.logout()}>
          <LogOut className="h-4 w-4" />{!collapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full w-60">{sidebar}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 md:hidden bg-card">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span className="font-semibold">Platform Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto overscroll-none p-4 md:p-6">
          <Outlet context={{ user, platformUser, platformRole, isReadOnly }} />
        </main>
      </div>
    </div>
  );
}