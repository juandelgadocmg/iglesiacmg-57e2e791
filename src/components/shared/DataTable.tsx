import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Columns3, ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    /** Oculta la columna en móvil (vista tarjeta la puede omitir). */
    hideOnMobile?: boolean;
    /** Marca como columna primaria: se usa como título en la tarjeta móvil. */
    primary?: boolean;
  }[];
  searchKey?: string;
  searchPlaceholder?: string;
  filterKey?: string;
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
  onRowClick?: (item: T) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function DataTable<T extends Record<string, any>>({
  data, columns, searchKey, searchPlaceholder = "Buscar...",
  filterKey, filterOptions, filterPlaceholder = "Filtrar",
  onRowClick
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [hidden, setHidden] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.filter(c => c.hideOnMobile).map(c => [c.key, false]))
  );

  const filtered = useMemo(() => {
    let out = data;
    if (search && searchKey) {
      out = out.filter(item =>
        String(item[searchKey] ?? "").toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filter !== "all" && filterKey) {
      out = out.filter(item => String(item[filterKey]) === filter);
    }
    return out;
  }, [data, search, searchKey, filter, filterKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * perPage, (safePage + 1) * perPage);

  const visibleDesktop = columns.filter(c => !hidden[c.key]);
  const primaryCol = columns.find(c => c.primary) ?? columns[0];
  const secondaryCols = columns.filter(c => c.key !== primaryCol?.key && !c.hideOnMobile);

  return (
    <div className="bg-card rounded-lg border w-full max-w-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row gap-2 sm:gap-3">
        {searchKey && (
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9 bg-muted/30 border-0 w-full"
            />
          </div>
        )}
        <div className="flex gap-2">
          {filterKey && filterOptions && (
            <Select value={filter} onValueChange={v => { setFilter(v); setPage(0); }}>
              <SelectTrigger className="flex-1 sm:w-48 h-9">
                <SelectValue placeholder={filterPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {filterOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 shrink-0" title="Columnas">
                <Columns3 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Columnas</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Mostrar columnas</div>
              <div className="max-h-64 overflow-y-auto">
                {columns.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox
                      checked={!hidden[col.key]}
                      onCheckedChange={(c) => setHidden(h => ({ ...h, [col.key]: !c }))}
                    />
                    <span className="truncate">{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {visibleDesktop.map(col => (
                <th key={col.key} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={visibleDesktop.length} className="px-4 py-12 text-center text-muted-foreground">No se encontraron resultados</td></tr>
            ) : (
              paged.map((item, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(item)}
                >
                  {visibleDesktop.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? col.render(item) : String(item[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden divide-y">
        {paged.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-sm">No se encontraron resultados</div>
        ) : (
          paged.map((item, i) => (
            <button
              key={i}
              onClick={() => onRowClick?.(item)}
              className="w-full text-left px-4 py-3 hover:bg-muted/20 active:bg-muted/40 transition-colors"
            >
              {primaryCol && (
                <div className="font-medium text-sm mb-1.5 min-w-0 truncate">
                  {primaryCol.render ? primaryCol.render(item) : String(item[primaryCol.key] ?? "")}
                </div>
              )}
              {secondaryCols.length > 0 && (
                <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
                  {secondaryCols.map(col => (
                    <div key={col.key} className="contents">
                      <dt className="text-muted-foreground uppercase tracking-wide">{col.label}</dt>
                      <dd className="min-w-0 truncate text-right">
                        {col.render ? col.render(item) : String(item[col.key] ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <span className="text-muted-foreground">
            {filtered.length === 0 ? 0 : safePage * perPage + 1}-{Math.min((safePage + 1) * perPage, filtered.length)} de {filtered.length}
          </span>
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-8 w-[92px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(n => (
                <SelectItem key={n} value={String(n)}>{n} / pág</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 justify-between sm:justify-end">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1 rounded border hover:bg-muted disabled:opacity-40 min-h-[36px]"
          >
            <ChevronLeft className="h-4 w-4" /> <span className="sm:hidden">Anterior</span><span className="hidden sm:inline">Anterior</span>
          </button>
          <span className="px-3 text-muted-foreground whitespace-nowrap">{safePage + 1}/{totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1 rounded border hover:bg-muted disabled:opacity-40 min-h-[36px]"
          >
            <span className="sm:hidden">Siguiente</span><span className="hidden sm:inline">Siguiente</span> <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
