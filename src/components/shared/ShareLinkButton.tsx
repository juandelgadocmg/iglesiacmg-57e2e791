import { useCallback, useMemo, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, Check, QrCode, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  /** Optional override; defaults to the current URL (pathname + search). */
  buildUrl?: () => string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  /** Short human message for the toast, e.g. "Enlace de Eventos copiado". */
  toastMessage?: string;
  /** When true (default) shows a secondary button that opens a QR of the URL. */
  withQr?: boolean;
  /** Title shown in the QR dialog. */
  qrTitle?: string;
  /** Description shown in the QR dialog. */
  qrDescription?: string;
};

/**
 * Copies a shareable deep link that restores the current view/filters/selection
 * on another device (iPhone ↔ desktop). Falls back to prompt() when the
 * Clipboard API is unavailable (older iOS Safari in non-secure context).
 *
 * Renders as: [ Copiar enlace ] [ QR ]. The QR button opens a dialog that
 * shows a scannable QR of the same URL so it can be opened from another phone.
 *
 * Accessibility: Ctrl/Cmd + C on either button copies the link (instead of
 * the empty selection). Focus is visible in both light and dark mode.
 */
export default function ShareLinkButton({
  buildUrl,
  label = "Copiar enlace",
  size = "sm",
  variant = "outline",
  className,
  toastMessage = "Enlace copiado al portapapeles",
  withQr = true,
  qrTitle = "Escanear enlace",
  qrDescription = "Apunta la cámara de otro dispositivo para abrir esta vista con los mismos filtros.",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const resolveUrl = useCallback(
    () =>
      buildUrl
        ? buildUrl()
        : `${window.location.origin}${window.location.pathname}${window.location.search}`,
    [buildUrl],
  );

  const copy = useCallback(async () => {
    const url = resolveUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // iOS Safari fallback in non-secure contexts / old versions
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
      }
      setCopied(true);
      toast.success(toastMessage, { description: url });
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("No se pudo copiar automáticamente", {
        description: "Copia el enlace manualmente desde el diálogo.",
      });
      window.prompt("Copia el enlace:", url);
    }
  }, [resolveUrl, toastMessage]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Cmd/Ctrl + C while a button is focused → copy the link,
    // not the (usually empty) selection.
    if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      void copy();
    }
  };

  // Build URL lazily when opening the dialog so it always reflects latest state
  const qrUrl = useMemo(() => (qrOpen ? resolveUrl() : ""), [qrOpen, resolveUrl]);

  return (
    <>
      <div className={cn("inline-flex items-center gap-1", className)}>
        <Button
          type="button"
          size={size}
          variant={variant}
          onClick={copy}
          onKeyDown={onKeyDown}
          className="gap-1.5"
          aria-label={label}
          aria-keyshortcuts="Control+C Meta+C"
          title={`${label} (Ctrl/Cmd + C)`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          {size !== "icon" && <span className="hidden sm:inline">{copied ? "Copiado" : label}</span>}
        </Button>
        {withQr && (
          <Button
            type="button"
            size={size === "default" ? "default" : "icon"}
            variant={variant}
            onClick={() => setQrOpen(true)}
            onKeyDown={onKeyDown}
            aria-label="Mostrar código QR del enlace"
            title="Mostrar código QR"
            className="h-8 w-8"
          >
            <QrCode className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {withQr && (
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{qrTitle}</DialogTitle>
              <DialogDescription>{qrDescription}</DialogDescription>
            </DialogHeader>
            {qrUrl && (
              <QrPanel url={qrUrl} onCopy={copy} onClose={() => setQrOpen(false)} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
