import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-discipulando.png';
import {
  LayoutDashboard,
  Users,
  Target,
  UserCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/discipulos', label: 'Discípulos', icon: Users },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/lideres', label: 'Líderes', icon: UserCheck },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { leaderProfile, role, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between p-3 bg-card border-b border-border sticky top-0 z-50">
        <img src={logo} alt="Logo" className="h-8" />
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform lg:translate-x-0 lg:static lg:inset-auto ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-sidebar-border hidden lg:block">
            <img src={logo} alt="Logo" className="h-10" />
          </div>
          <div className="p-4 border-b border-sidebar-border lg:hidden">
            <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
              <X size={20} />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = location.pathname === href;
              return (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
            <div className="text-xs text-sidebar-foreground/70 mb-2 truncate">
              {leaderProfile?.full_name}
              {role && <span className="ml-1 text-sidebar-primary">({role})</span>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut size={16} />
              Cerrar sesión
            </Button>
          </div>
        </aside>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-foreground/20 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen lg:min-h-0">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
