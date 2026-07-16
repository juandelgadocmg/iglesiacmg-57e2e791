import { cn } from "@/lib/utils";

/** Anillo de progreso circular ligero (SVG puro). */
export function ProgressRing({
  value,
  size = 40,
  stroke = 4,
  tone = "brand",
  label,
  className,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  tone?: "brand" | "accent" | "success" | "warning" | "danger";
  label?: React.ReactNode;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  const colorMap = {
    brand: "text-primary",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-surface-3" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className={cn("transition-all duration-500 ease-out", colorMap[tone])}
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-fg font-mono tabular-nums">
        {label ?? `${Math.round(v)}%`}
      </span>
    </div>
  );
}
