import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }, [location.pathname]);

  const handleClearCacheAndGo = (target: string = "/") => {
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
    window.location.href = target;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md bg-card p-8 rounded-3xl border border-border shadow-lg space-y-4">
        <h1 className="text-4xl font-extrabold text-foreground">404</h1>
        <p className="text-sm text-muted-foreground">
          Página no encontrada o en memoria caché. Haz clic abajo para ir al inicio o recargar sin caché.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => handleClearCacheAndGo("/")}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90"
          >
            Volver al Inicio
          </button>
          <button
            onClick={() => handleClearCacheAndGo(window.location.pathname)}
            className="w-full py-2 px-4 text-xs text-muted-foreground hover:underline"
          >
            Limpiar Caché y Recargar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
