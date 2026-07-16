import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "../primitives/Avatar";

export interface ActivityItem {
  id: string;
  actor?: { name?: string; avatar?: string | null };
  action: React.ReactNode; // ej: "creó la tarea", "actualizó el estado"
  target?: React.ReactNode;
  time: React.ReactNode; // ej: "hace 2 h"
  detail?: React.ReactNode;
}

/** ActivityFeed — feed compacto tipo GitHub/Linear. */
export function ActivityFeed({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((it) => (
        <li key={it.id} className="flex items-start gap-3">
          <Avatar src={it.actor?.avatar} name={it.actor?.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-fg-muted">
              <span className="font-medium text-fg">{it.actor?.name || "Sistema"}</span>{" "}
              {it.action}
              {it.target && <> <span className="font-medium text-fg">{it.target}</span></>}
            </p>
            {it.detail && <div className="mt-1 text-xs text-fg-muted">{it.detail}</div>}
            <p className="text-[11px] text-fg-subtle mt-0.5">{it.time}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
