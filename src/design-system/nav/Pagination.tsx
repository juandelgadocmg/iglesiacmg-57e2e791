import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "../primitives/Button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (n: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page, pageCount, onPageChange, totalItems, pageSize, onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100], className,
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < pageCount;
  return (
    <div className={cn("flex items-center justify-between flex-wrap gap-3", className)}>
      <div className="text-xs text-fg-muted">
        {totalItems != null ? (
          <>Mostrando <span className="font-mono tabular-nums text-fg">{Math.min((page - 1) * (pageSize || 0) + 1, totalItems)}</span>
          –<span className="font-mono tabular-nums text-fg">{Math.min(page * (pageSize || 0), totalItems)}</span>
          {" de "}<span className="font-mono tabular-nums text-fg">{totalItems}</span></>
        ) : (
          <>Página <span className="font-mono tabular-nums text-fg">{page}</span> de <span className="font-mono tabular-nums text-fg">{pageCount}</span></>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && pageSize != null && (
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            Filas
            <select
              className="h-7 rounded-md border border-border bg-surface-1 text-xs px-1.5"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" disabled={!canPrev} onClick={() => onPageChange(1)} aria-label="Primera"><ChevronsLeft /></Button>
          <Button size="icon-sm" variant="ghost" disabled={!canPrev} onClick={() => onPageChange(page - 1)} aria-label="Anterior"><ChevronLeft /></Button>
          <Button size="icon-sm" variant="ghost" disabled={!canNext} onClick={() => onPageChange(page + 1)} aria-label="Siguiente"><ChevronRight /></Button>
          <Button size="icon-sm" variant="ghost" disabled={!canNext} onClick={() => onPageChange(pageCount)} aria-label="Última"><ChevronsRight /></Button>
        </div>
      </div>
    </div>
  );
}
