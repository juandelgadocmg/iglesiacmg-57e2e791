import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpdateDetail = { reload: () => void };

export default function PWAUpdatePrompt() {
  const [detail, setDetail] = useState<UpdateDetail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<UpdateDetail>;
      setDetail(ce.detail);
    };
    window.addEventListener("doxa:pwa-update", handler);
    return () => window.removeEventListener("doxa:pwa-update", handler);
  }, []);

  if (!detail) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg border border-border bg-card shadow-lg p-3 flex items-start gap-3"
    >
      <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary">
        <RefreshCw className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium">Nueva versión disponible</p>
          <p className="text-xs text-muted-foreground">
            Actualiza para obtener las últimas mejoras de CMG Admin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={() => detail.reload()}>
            Actualizar ahora
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setDetail(null)}
          >
            Más tarde
          </Button>
        </div>
      </div>
      <button
        onClick={() => setDetail(null)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
