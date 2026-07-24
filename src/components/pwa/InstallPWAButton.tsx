import { useEffect, useState } from "react";
import { Download, Share, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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

export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState(() => detectPlatform());
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [showIOSAlt, setShowIOSAlt] = useState(false);

  // Live-detect standalone (iOS confirms install when app is reopened from home)
  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setInstalled(p.isStandalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      localStorage.removeItem(LS_IOS_PROMPTED_AT);
      toast.success("App instalada correctamente ✅");
    };
    const mql = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => {
      if (mql.matches) onInstalled();
    };
    const onVisibility = () => {
      const cur = detectPlatform();
      if (cur.isStandalone && !installed) onInstalled();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mql.addEventListener?.("change", onModeChange);
    document.addEventListener("visibilitychange", onVisibility);

    // iOS follow-up: if user opened the help dialog and never returned as standalone
    // within 24h, offer the alternate steps on next visit.
    if (p.isIOS && !p.isStandalone) {
      const promptedAt = Number(localStorage.getItem(LS_IOS_PROMPTED_AT) || 0);
      if (promptedAt && Date.now() - promptedAt > 24 * 60 * 60 * 1000) {
        // clear so we don't nag again
        localStorage.removeItem(LS_IOS_PROMPTED_AT);
        setTimeout(() => setShowIOSAlt(true), 1500);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener?.("change", onModeChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (installed) return null;

  // iOS: no beforeinstallprompt — show manual instructions
  if (platform.isIOS) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="h-9 min-w-9 gap-1.5 px-2.5"
          onClick={() => {
            localStorage.setItem(LS_IOS_PROMPTED_AT, String(Date.now()));
            setShowIOSHelp(true);
          }}
          title="Instalar en iPhone"
          aria-label="Instalar en iPhone"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Instalar app</span>
        </Button>

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
              Al abrir la app desde el ícono, detectaremos automáticamente que ya está instalada
              y este botón desaparecerá. Si no aparece el botón <b>Compartir</b>, usa el paso alternativo.
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Debes abrir esta página en <b>Safari</b> (no funciona desde Chrome ni desde apps embebidas).
            </p>
            <Button variant="outline" size="sm" onClick={() => { setShowIOSHelp(false); setShowIOSAlt(true); }}>
              No veo el botón Compartir
            </Button>
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
          </DialogContent>
        </Dialog>
      </>
    );
  }

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
