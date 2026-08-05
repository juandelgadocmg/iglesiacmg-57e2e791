import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoAsset from '@/assets/discipulando-naciones-logo-v2.png.asset.json';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <Link to="/discipulado/reportes" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="Discipulando Naciones" className="h-12 object-contain" />
            <span className="font-bold text-lg hidden sm:inline-block">Discipulado</span>
          </Link>
          <div>
            <Link to="/discipulado/configuracion">
              <Button variant="ghost" size="icon" title="Configuración">
                <Settings size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
