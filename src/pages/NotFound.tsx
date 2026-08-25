import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    const path = (location.pathname || "").toLowerCase();
    if (
      path.includes("afirmac") ||
      path.includes("discipul") ||
      path.includes("consolidac")
    ) {
      // Auto-redirect after stale cache fallback
      const timer = setTimeout(() => {
        navigate("/afirmacion", { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, navigate]);

  const handleClearCacheAndGo = () => {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.href = "/afirmacion";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md bg-card p-8 rounded-3xl border border-border shadow-lg space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">
          No pudimos encontrar esta ruta directamente. Si intentabas acceder al nuevo{" "}
          <strong>Módulo de Afirmación</strong>, haz clic en el botón a continuación.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleClearCacheAndGo} className="gap-2 font-bold w-full">
            <CheckCircle2 className="h-4 w-4" /> Ir a Afirmación del Creyente
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="gap-2 text-xs w-full"
          >
            <Home className="h-4 w-4" /> Volver al Inicio (Dashboard)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
