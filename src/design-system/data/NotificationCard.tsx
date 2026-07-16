import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "../primitives/StatusDot";

export interface NotificationCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
  unread?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  onDismiss?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function NotificationCard({
  title, description, time, tone = "neutral", unread, icon: Icon, onClick, onDismiss, actions, className,
}: NotificationCardProps) {
  return (
    <div
      className={cn(
        "group relative flex gap-3 px-3 py-3 rounded-lg border transition-colors",
        unread ? "bg-primary/5 border-primary/15" : "bg-card border-border-subtle",
        onClick && "cursor-pointer hover:bg-surface-2/70",
        className
      )}
      onClick={onClick}
    >
      {unread && <span className="absolute left-1.5 top-4"><StatusDot tone="brand" pulse /></span>}
      {Icon && (
        <span className={cn("mt-0.5 inline-flex items-center justify-center size-8 rounded-md",
          tone === "success" && "bg-success/10 text-success",
          tone === "warning" && "bg-warning/10 text-warning",
          tone === "danger" && "bg-destructive/10 text-destructive",
          tone === "info" && "bg-info/10 text-info",
          tone === "brand" && "bg-primary/10 text-primary",
          tone === "neutral" && "bg-surface-3 text-fg-muted"
        )}>
          <Icon className="size-4" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{description}</p>}
        <div className="flex items-center gap-3 mt-1.5">
          {time && <span className="text-[11px] text-fg-subtle">{time}</span>}
          {actions}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-3 text-fg-subtle"
          aria-label="Descartar"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
