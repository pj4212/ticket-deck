import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, ScanLine, ClipboardList } from 'lucide-react';

const tabs = [
  { id: 'home', label: 'Events', icon: Home, path: '/scanner' },
  { id: 'dashboard', label: 'Stats', icon: BarChart3, pathSuffix: '/dashboard' },
  { id: 'scan', label: 'Scan', icon: ScanLine, pathSuffix: '/scan' },
  { id: 'list', label: 'Door List', icon: ClipboardList, pathSuffix: '/list' },
];

export default function ScannerBottomNav({ eventId }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getPath = (tab) => {
    if (tab.id === 'home') return '/scanner';
    if (!eventId) return '/scanner';
    return `/scanner/${eventId}${tab.pathSuffix}`;
  };

  const isActive = (tab) => {
    const path = location.pathname;
    if (tab.id === 'home') return path === '/scanner';
    if (!eventId) return false;
    return path === `/scanner/${eventId}${tab.pathSuffix}`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-area-bottom">
      <div className="flex items-center" style={{ minHeight: '60px' }}>
        {tabs.map(tab => {
          const active = isActive(tab);
          const disabled = tab.id !== 'home' && !eventId;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && navigate(getPath(tab))}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors touch-target ${
                active ? 'text-primary' : disabled ? 'text-muted-foreground/30 pointer-events-none' : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ minHeight: '60px' }}
            >
              <Icon className={`h-6 w-6 ${active ? 'drop-shadow-sm' : ''}`} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}