import { useEffect, useState } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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

export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState(() => detectPlatform());
  const [showIOSHelp, setShowIOSHelp] = useState(false);

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
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // iOS: no beforeinstallprompt — show manual instructions
  if (platform.isIOS) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => setShowIOSHelp(true)}
          title="Instalar en iPhone"
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
            <p className="text-xs text-muted-foreground mt-2">
              Debes abrir esta página en <b>Safari</b> (no funciona desde Chrome ni desde apps embebidas).
            </p>
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
      className="h-8 gap-1.5 px-2.5"
      onClick={async () => {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setDeferred(null);
      }}
      title="Instalar CMG Admin como aplicación"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Instalar app</span>
    </Button>
  );
}
