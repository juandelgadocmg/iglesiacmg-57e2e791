import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, RefreshCw, Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    // Auto clear PWA cache on 404
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    const path = (location.pathname || "").toLowerCase();
    if (
      path.includes("afirmac") ||
      path.includes("discipul") ||
      path.includes("consolidac") ||
      path.includes("lider") ||
      path.includes("meta")
    ) {
      const timer = setTimeout(() => {
        navigate("/afirmacion", { replace: true });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, navigate]);

  const handleClearCacheAndGo = (targetPath: string = "/afirmacion") => {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
    window.location.href = targetPath;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md bg-card p-8 rounded-3xl border border-border shadow-xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Ruta no encontrada</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No pudimos encontrar la ruta solicitada. Si buscas el módulo de <strong>Afirmación del Creyente</strong> o tu <strong>Dashboard</strong>, utiliza los accesos directos:
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={() => handleClearCacheAndGo("/afirmacion")}
            className="gap-2 font-bold w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-xl shadow-md"
          >
            <Sparkles className="h-4 w-4" /> Ir a Afirmación del Creyente
          </Button>

          <Button
            variant="outline"
            onClick={() => handleClearCacheAndGo("/dashboard")}
            className="gap-2 font-semibold w-full rounded-xl py-5"
          >
            <Home className="h-4 w-4 text-primary" /> Ir al Dashboard Principal
          </Button>

          <Button
            variant="ghost"
            onClick={() => handleClearCacheAndGo(window.location.pathname)}
            className="gap-2 text-xs text-muted-foreground w-full rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Limpiar Caché y Recargar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
