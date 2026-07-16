import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/** TrendDelta — chip de delta (+2.1%) con dirección y color. */
export function TrendDelta({
  value, invert, className, size = "sm", suffix = "%",
}: {
  value: number;
  invert?: boolean; // cuando "bajar" es bueno (ej: churn)
  className?: string;
  size?: "xs" | "sm";
  suffix?: string;
}) {
  const positive = value > 0;
  const neutral = value === 0;
  const good = neutral ? false : invert ? !positive : positive;
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const pad = size === "xs" ? "text-[10px] px-1 py-0.5" : "text-[11px] px-1.5 py-0.5";
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full font-semibold font-mono tabular-nums",
      pad,
      neutral && "bg-surface-3 text-fg-muted",
      !neutral && good && "bg-success/10 text-success",
      !neutral && !good && "bg-destructive/10 text-destructive",
      className
    )}>
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}
