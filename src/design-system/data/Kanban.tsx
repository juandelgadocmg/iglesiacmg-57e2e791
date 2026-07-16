import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "../surfaces/Card";
import { Badge } from "../primitives/Badge";

export interface KanbanCard {
  id: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  tags?: string[];
  footer?: React.ReactNode;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: "brand" | "accent" | "success" | "warning" | "danger" | "neutral";
  wip?: number;
  cards: KanbanCard[];
}

/**
 * Kanban — shell visual (columnas + cards). Drag/drop se conecta desde arriba
 * con un handler `onCardMove`; el componente sólo gestiona presentación.
 */
export function Kanban({
  columns, onCardClick, onCardMove, className,
}: {
  columns: KanbanColumn[];
  onCardClick?: (colId: string, card: KanbanCard) => void;
  onCardMove?: (cardId: string, fromCol: string, toCol: string) => void;
  className?: string;
}) {
  const [dragId, setDragId] = React.useState<{ card: string; from: string } | null>(null);
  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
      {columns.map((col) => (
        <div
          key={col.id}
          className="w-72 shrink-0 flex flex-col bg-surface-2/50 border border-border-subtle rounded-xl"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={() => {
            if (dragId && dragId.from !== col.id) onCardMove?.(dragId.card, dragId.from, col.id);
            setDragId(null);
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Badge tone={col.color || "neutral"} size="xs" dot>{col.title}</Badge>
              <span className="text-[11px] font-mono tabular-nums text-fg-subtle">{col.cards.length}{col.wip ? `/${col.wip}` : ""}</span>
            </div>
            <button className="p-1 rounded hover:bg-surface-3 text-fg-subtle" aria-label="Más">
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
            {col.cards.map((c) => (
              <Card
                key={c.id}
                padding="sm"
                interactive
                onClick={() => onCardClick?.(col.id, c)}
                draggable
                onDragStart={() => setDragId({ card: c.id, from: col.id })}
                className="text-left"
              >
                <p className="text-[13px] font-medium text-fg leading-snug">{c.title}</p>
                {c.meta && <p className="text-[11px] text-fg-muted mt-1">{c.meta}</p>}
                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.map((t) => <Badge key={t} tone="neutral" size="xs">{t}</Badge>)}
                  </div>
                )}
                {c.footer && <div className="mt-2 pt-2 border-t border-border-subtle text-[11px] text-fg-muted">{c.footer}</div>}
              </Card>
            ))}
            {col.cards.length === 0 && (
              <div className="text-center text-[11px] text-fg-subtle py-6">Sin tarjetas</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
