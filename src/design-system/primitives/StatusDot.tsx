import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const toneMap: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-fg-subtle",
  brand: "bg-primary",
};

/** StatusDot — indicador de estado tipo Linear/Stripe. */
export function StatusDot({ tone = "neutral", pulse, className }: { tone?: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex size-2.5 rounded-full opacity-60 animate-ping",
            toneMap[tone]
          )}
        />
      )}
      <span className={cn("relative inline-block size-1.5 rounded-full", toneMap[tone])} />
    </span>
  );
}
