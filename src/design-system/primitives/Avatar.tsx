import * as React from "react";
import { Avatar as SAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sizeMap = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-16 text-lg",
} as const;

export interface DoxaAvatarProps {
  src?: string | null;
  name?: string;
  size?: keyof typeof sizeMap;
  className?: string;
  ring?: boolean;
}

function initials(name?: string) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "·";
}

export function Avatar({ src, name, size = "md", ring, className }: DoxaAvatarProps) {
  return (
    <SAvatar
      className={cn(
        sizeMap[size],
        ring && "ring-2 ring-background shadow-elev-1",
        "bg-surface-3",
        className
      )}
    >
      {src && <AvatarImage src={src} alt={name || ""} />}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {initials(name)}
      </AvatarFallback>
    </SAvatar>
  );
}

export interface AvatarGroupProps {
  people: { src?: string | null; name?: string }[];
  size?: keyof typeof sizeMap;
  max?: number;
  className?: string;
}

export function AvatarGroup({ people, size = "sm", max = 4, className }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {shown.map((p, i) => (
        <Avatar key={i} src={p.src} name={p.name} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            sizeMap[size],
            "inline-flex items-center justify-center rounded-full bg-surface-3 text-fg-muted",
            "border-2 border-background font-semibold"
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
