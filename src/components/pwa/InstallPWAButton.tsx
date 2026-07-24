import { useEffect, useState } from "react";
import { Download, Share, Plus, CheckCircle2, RefreshCw, HelpCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform() {
  if (typeof window === "undefined") return { isIOS: false, isAndroid: false, isStandalone: false };
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  return { isIOS, isAndroid, isStandalone };
}

const LS_IOS_PROMPTED_AT = "pwa:ios:prompted_at";
const STALE_MS = 24 * 60 * 60 * 1000;

export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState(() => detectPlatform());
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [showIOSAlt, setShowIOSAlt] = useState(false);
  const [staleIOS, setStaleIOS] = useState(false); // >24h since first prompt without install

  const recheckIOSStale = () => {
    const promptedAt = Number(localStorage.getItem(LS_IOS_PROMPTED_AT) || 0);
    setStaleIOS(!!promptedAt && Date.now() - promptedAt > STALE_MS);
  };

  // Live-detect standalone (iOS confirms install when app is reopened from home)
  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setInstalled(p.isStandalone);
    recheckIOSStale();

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      localStorage.removeItem(LS_IOS_PROMPTED_AT);
      setStaleIOS(false);
      toast.success("App instalada correctamente ✅");
    };
    const mql = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => {
      if (mql.matches) onInstalled();
    };
    const onVisibility = () => {
      const cur = detectPlatform();
      if (cur.isStandalone && !installed) onInstalled();
      recheckIOSStale();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mql.addEventListener?.("change", onModeChange);
    document.addEventListener("visibilitychange", onVisibility);

    // Poll every 5 min while the tab is open so the "no detectada en 24h" state
    // flips without needing a page reload.
    const interval = window.setInterval(recheckIOSStale, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener?.("change", onModeChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryIOSDetect = () => {
    const p = detectPlatform();
    setPlatform(p);
    setInstalled(p.isStandalone);
    recheckIOSStale();
    if (p.isStandalone) {
      toast.success("App detectada como instalada ✅");
    } else {
      toast.info("Aún no detectamos la instalación. Ábrela desde el ícono en tu pantalla de inicio.");
    }
  };

  // ---------- iOS: persistent status indicator ----------
  if (platform.isIOS) {
    if (installed) {
      return (
        <div
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-medium"
          title="App instalada en pantalla de inicio"
          aria-label="PWA instalada"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>App instalada</span>
        </div>
      );
    }

    return (
      <>
        <div className="inline-flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "h-9 min-w-9 gap-1.5 px-2.5",
              staleIOS && "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200",
            )}
            onClick={() => {
              if (!localStorage.getItem(LS_IOS_PROMPTED_AT)) {
                localStorage.setItem(LS_IOS_PROMPTED_AT, String(Date.now()));
              }
              setShowIOSHelp(true);
            }}
            title={staleIOS ? "No detectamos la instalación en 24h" : "Instalar en iPhone"}
            aria-label="Instalar en iPhone"
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">
              {staleIOS ? "No instalada" : "Instalar app"}
            </span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            onClick={retryIOSDetect}
            title="Volver a comprobar si la app está instalada"
            aria-label="Reintentar detección"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {staleIOS && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-amber-700 dark:text-amber-300"
              onClick={() => setShowIOSAlt(true)}
              title="Ver paso alternativo"
              aria-label="Ver paso alternativo"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Instalar en iPhone / iPad</DialogTitle>
              <DialogDescription>
                Safari no permite instalar automáticamente. Sigue estos pasos:
              </DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Toca el botón <Share className="h-4 w-4 inline text-blue-500" /> <b>Compartir</b> en la barra inferior de Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  Desplázate y toca <Plus className="h-4 w-4 inline" /> <b>Agregar a inicio</b>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>Confirma con <b>Agregar</b>. La app aparecerá en tu pantalla de inicio.</span>
              </li>
            </ol>
            <div className="mt-3 rounded-md bg-muted/50 p-2.5 text-[11.5px] text-muted-foreground">
              Al abrir la app desde el ícono, detectaremos automáticamente que ya está instalada.
              Si ya la instalaste, usa el botón <b>Reintentar</b> aquí para verificarlo.
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Debes abrir esta página en <b>Safari</b> (no funciona desde Chrome ni desde apps embebidas).
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={retryIOSDetect}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reintentar detección
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowIOSHelp(false); setShowIOSAlt(true); }}>
                No veo el botón Compartir
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showIOSAlt} onOpenChange={setShowIOSAlt}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Paso alternativo</DialogTitle>
              <DialogDescription>
                Detectamos que la app aún no está agregada a tu pantalla de inicio. Prueba esto:
              </DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>Toca la barra de dirección de Safari y luego el botón <b>aA</b> a la izquierda.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>Elige <b>Mostrar barra de herramientas</b> si está oculta, y vuelve a intentar con el botón <Share className="h-4 w-4 inline text-blue-500" /> Compartir.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Si sigues sin verlo, usa Safari nativo (no un enlace desde WhatsApp, Instagram o Chrome).
                </span>
              </li>
            </ol>
            <Button variant="outline" size="sm" className="mt-2" onClick={retryIOSDetect}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reintentar detección
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ---------- Non-iOS ----------
  if (installed) return null;
  if (!deferred) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-9 min-w-9 gap-1.5 px-2.5"
      onClick={async () => {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setDeferred(null);
      }}
      title="Instalar CMG Admin como aplicación"
      aria-label="Instalar aplicación"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Instalar app</span>
    </Button>
  );
}

