import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";

const trackTone: Record<Tone, string> = {
  brand: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-fg-subtle",
};

export interface ProgressBarProps {
  value: number; // 0..100
  tone?: Tone;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  label?: React.ReactNode;
  className?: string;
}

const heightMap = { xs: "h-1", sm: "h-1.5", md: "h-2" };

export function ProgressBar({
  value, tone = "brand", size = "sm", showLabel, label, className,
}: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1 text-[11px] text-fg-muted">
          <span>{label ?? ""}</span>
          {showLabel && <span className="font-mono tabular-nums">{Math.round(v)}%</span>}
        </div>
      )}
      <div className={cn("relative w-full rounded-full bg-surface-3 overflow-hidden", heightMap[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", trackTone[tone])}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
