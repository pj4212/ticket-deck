import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { WifiOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScannerBottomNav from './ScannerBottomNav';
import useWorkspace from '../../hooks/useWorkspace';
import WorkspaceSwitcher from '../admin/WorkspaceSwitcher';

export default function ScannerLayout() {
  const [user, setUser] = useState(null);
  const [platformUser, setPlatformUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [scannerAssignments, setScannerAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { workspaces, activeWorkspace, workspaceId, loadWorkspaces, switchWorkspace } = useWorkspace();
  const [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();

  const match = location.pathname.match(/\/scanner\/([^/]+)/);
  const eventId = match ? match[1] : null;

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      if (!me) { navigate('/'); return; }
      setUser(me);
      const result = await loadWorkspaces(me);
      
      if (result?.platformUser) {
        setPlatformUser(result.platformUser);
        setMemberships(result.memberships || []);
        // Load scanner assignments for this user
        const assigns = await base44.entities.ScannerAssignment.filter({ user_id: result.platformUser.id, is_active: true });
        setScannerAssignments(assigns);
      }
      
      setLoading(false);
    }
    load();

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  // Access check: must have workspace membership with scanner-capable role or be platform admin
  const wsRole = memberships.find(m => m.workspace_id === workspaceId)?.role;
  const canScan = wsRole && ['workspace_owner', 'workspace_admin', 'event_manager', 'scanner'].includes(wsRole);
  const isPlatformAdmin = user?.role === 'admin';
  const isAdmin = isPlatformAdmin || ['workspace_owner', 'workspace_admin'].includes(wsRole);

  if (!canScan && !isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center px-4">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Scanner Access</h1>
          <p className="text-muted-foreground mb-4">You need scanner permissions to access this feature.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top">
      {isAdmin && (
        <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/admin"><Shield className="h-4 w-4" />Admin</Link>
          </Button>
          {workspaces.length > 1 && (
            <div className="w-48">
              <WorkspaceSwitcher workspaces={workspaces} activeWorkspace={activeWorkspace} onSwitch={switchWorkspace} collapsed={false} />
            </div>
          )}
        </div>
      )}
      {!online && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />Offline — read-only mode
        </div>
      )}
      <main className="flex-1 overflow-auto pb-20 overscroll-none">
        <Outlet context={{ user, workspaceId, platformUser, scannerAssignments, isAdmin }} />
      </main>
      <ScannerBottomNav eventId={eventId} />
    </div>
  );
}