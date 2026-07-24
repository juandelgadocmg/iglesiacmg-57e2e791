import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check } from "lucide-react";
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
};

/**
 * Copies a shareable deep link that restores the current view/filters/selection
 * on another device (iPhone ↔ desktop). Falls back to prompt() when the
 * Clipboard API is unavailable (older iOS Safari in non-secure context).
 *
 * Accessibility: when this button is focused, Ctrl/Cmd + C also copies the link
 * (instead of the empty selection), with visible focus and toast feedback.
 */
export default function ShareLinkButton({
  buildUrl,
  label = "Copiar enlace",
  size = "sm",
  variant = "outline",
  className,
  toastMessage = "Enlace copiado al portapapeles",
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const url = buildUrl
      ? buildUrl()
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
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
  }, [buildUrl, toastMessage]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Cmd/Ctrl + C while the button is focused → copy the link,
    // not the (usually empty) selection.
    if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      void copy();
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={copy}
      onKeyDown={onKeyDown}
      className={cn("gap-1.5", className)}
      aria-label={label}
      aria-keyshortcuts="Control+C Meta+C"
      title={`${label} (Ctrl/Cmd + C)`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      {size !== "icon" && <span className="hidden sm:inline">{copied ? "Copiado" : label}</span>}
    </Button>
  );
}
