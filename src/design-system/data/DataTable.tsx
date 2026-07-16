import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { EmptyState } from "../surfaces/EmptyState";
import { Skeleton } from "../primitives/Skeleton";
import { Card } from "../surfaces/Card";

export type SortDir = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T, i: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string | number;
  className?: string;
  headerClassName?: string;
  sticky?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: React.ReactNode;
  rowKey: (row: T, i: number) => string | number;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: (string | number)[];
  onSelectChange?: (ids: (string | number)[]) => void;
  sort?: { id: string; dir: SortDir };
  onSortChange?: (s: { id: string; dir: SortDir }) => void;
  density?: "comfortable" | "compact";
  stickyHeader?: boolean;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}

/**
 * DataTable — canónica de DOXA. Cabecera sticky, sort, selección múltiple,
 * densidad, loading skeleton, empty state y toolbar.
 */
export function DataTable<T>({
  columns, data, loading, error, rowKey, onRowClick, selectable,
  selected = [], onSelectChange, sort, onSortChange,
  density = "comfortable", stickyHeader = true,
  toolbar, footer, empty, className,
}: DataTableProps<T>) {
  const rowPad = density === "compact" ? "h-10" : "h-12";
  const allSelected = data.length > 0 && data.every((r, i) => selected.includes(rowKey(r, i)));
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectChange) return;
    onSelectChange(allSelected ? [] : data.map((r, i) => rowKey(r, i)));
  };
  const toggleOne = (id: string | number) => {
    if (!onSelectChange) return;
    onSelectChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSortChange) return;
    if (sort?.id !== col.id) return onSortChange({ id: col.id, dir: "asc" });
    if (sort.dir === "asc") return onSortChange({ id: col.id, dir: "desc" });
    return onSortChange({ id: col.id, dir: null });
  };

  return (
    <Card padding="none" className={cn("overflow-hidden", className)}>
      {toolbar && <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-2/40">{toolbar}</div>}

      <div className={cn("relative w-full overflow-auto", stickyHeader && "max-h-[70vh]")}>
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-surface-2/80 backdrop-blur")}>
            <TableRow className="border-border-subtle hover:bg-transparent">
              {selectable && (
                <TableHead className="w-9">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  style={{ width: col.width }}
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider text-fg-muted",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortable && "cursor-pointer select-none hover:text-fg",
                    col.headerClassName
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sort?.id === col.id && sort.dir === "asc" ? <ArrowUp className="size-3" /> :
                      sort?.id === col.id && sort.dir === "desc" ? <ArrowDown className="size-3" /> :
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`sk-${i}`} className={cn(rowPad, "border-border-subtle")}>
                {selectable && <TableCell><Skeleton className="size-4" /></TableCell>}
                {columns.map((c) => (
                  <TableCell key={c.id}><Skeleton className="h-3 w-3/4" /></TableCell>
                ))}
              </TableRow>
            ))}
            {!loading && !error && data.map((row, i) => {
              const id = rowKey(row, i);
              const isSel = selected.includes(id);
              return (
                <TableRow
                  key={id}
                  data-selected={isSel}
                  className={cn(
                    rowPad, "border-border-subtle transition-colors",
                    onRowClick && "cursor-pointer hover:bg-surface-2/60",
                    isSel && "bg-primary/5"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onCheckedChange={() => toggleOne(id)} />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        "text-sm text-fg",
                        col.align === "right" && "text-right font-mono tabular-nums",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.cell(row, i)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {!loading && !error && data.length === 0 && (
          <div className="py-2">
            {empty ?? <EmptyState title="Sin registros" description="No hay datos para mostrar aún." variant="muted" size="sm" />}
          </div>
        )}
        {error && (
          <div className="py-6 text-center text-sm text-destructive">{error}</div>
        )}
      </div>

      {footer && <div className="px-4 py-3 border-t border-border-subtle bg-surface-2/40">{footer}</div>}
    </Card>
  );
}
