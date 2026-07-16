import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * ErrorState — GitHub/Vercel style. Consistent error surface with
 * optional retry, so users never see a raw JS error.
 */
export default function ErrorState({
  title = "No pudimos cargar esta sección",
  description = "Hubo un problema temporal. Intenta nuevamente en unos segundos.",
  error, onRetry, className,
}: Props) {
  const msg = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-2xl border border-destructive/25 bg-destructive/[0.04]",
        "px-6 py-10 flex flex-col items-center justify-center text-center animate-fade-in",
        className
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-destructive/10 ring-1 ring-destructive/25 flex items-center justify-center mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <h3 className="font-semibold text-[15px] text-foreground">{title}</h3>
      <p className="text-[13px] text-muted-foreground max-w-md mt-1.5">{description}</p>
      {msg && (
        <code className="text-[11px] font-mono text-muted-foreground/80 mt-3 max-w-full truncate px-2 py-1 rounded bg-muted/60">
          {msg}
        </code>
      )}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-5 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </Button>
      )}
    </div>
  );
}
