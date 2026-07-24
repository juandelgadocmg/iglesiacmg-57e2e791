import { useState } from "react";
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

  const handleCopy = async () => {
    const url = buildUrl
      ? buildUrl()
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copia el enlace:", url);
      }
      setCopied(true);
      toast.success(toastMessage);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleCopy}
      className={cn("gap-1.5", className)}
      aria-label={label}
      title={label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      {size !== "icon" && <span className="hidden sm:inline">{copied ? "Copiado" : label}</span>}
    </Button>
  );
}
