import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  size = 16,
  className,
  label = "Cargando",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("animate-spin text-fg-muted", className)}
      style={{ width: size, height: size }}
    />
  );
}
