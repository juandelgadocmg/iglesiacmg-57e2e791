import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-discipulando.png';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <Link to="/">
            <img src={logo} alt="Discipulando Naciones" className="h-36 sm:h-44" />
          </Link>
          <div className="ml-auto">
            <Link to="/setup">
              <Button variant="ghost" size="icon" title="Configuración">
                <Settings size={28} />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
