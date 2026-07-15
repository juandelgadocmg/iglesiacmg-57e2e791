import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditRow {
  id: string;
  created_at: string;
  table_name: string;
  operation: string;
  row_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  changed: Record<string, unknown> | null;
}

interface Filters {
  table: string;
  operation: string;
  actor: string;
  from: string;
  to: string;
  eventType: "all" | "db" | "storage"; // db = tabla, storage = eventos de Storage
}

const DEFAULT_FILTERS: Filters = {
  table: "all",
  operation: "all",
  actor: "",
  from: "",
  to: "",
  eventType: "all",
};

const STORAGE_KEY = "cmg.seguridad.filtros";
const PAGE_SIZE = 100;

function loadFilters(): Filters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<Filters>) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function applyFilters(
  q: ReturnType<typeof supabase.from>,
  f: Filters,
) {
  let query = q as any;
  if (f.eventType === "storage") query = query.like("table_name", "storage:%");
  else if (f.eventType === "db") query = query.not("table_name", "like", "storage:%");
  if (f.table !== "all") query = query.eq("table_name", f.table);
  if (f.operation !== "all") query = query.eq("operation", f.operation);
  if (f.actor.trim()) query = query.ilike("actor_email", `%${f.actor.trim()}%`);
  if (f.from) query = query.gte("created_at", new Date(f.from).toISOString());
  if (f.to) query = query.lte("created_at", new Date(f.to + "T23:59:59").toISOString());
  return query;
}

function opBadgeVariant(op: string) {
  switch (op) {
    case "DELETE": return "destructive" as const;
    case "INSERT":
    case "UPLOAD": return "default" as const;
    case "UPDATE": return "secondary" as const;
    default: return "outline" as const;
  }
}

export default function SeguridadPage() {
  const [filters, setFilters] = useState<Filters>(() => loadFilters());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    error,
  } = useInfiniteQuery({
    queryKey: ["security_audit_log", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("security_audit_log")
        .select("id, created_at, table_name, operation, row_id, actor_user_id, actor_email, changed")
        .order("created_at", { ascending: false })
        .range(from, to);
      q = applyFilters(q, filters);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
  });

  useEffect(() => {
    if (error) toast.error("No tienes permiso para ver la auditoría o hubo un error.");
  }, [error]);

  const rows: AuditRow[] = useMemo(
    () => (data?.pages || []).flat(),
    [data],
  );

  const tables = useMemo(() => {
    const s = new Set<string>(rows.map((r) => r.table_name));
    return Array.from(s).sort();
  }, [rows]);

  const totalLoaded = rows.length;

  const exportCsv = async () => {
    setExporting(true);
    const loadingId = toast.loading("Exportando auditoría… descargando todas las páginas");
    try {
      const collected: AuditRow[] = [];
      const MAX_ROWS = 100_000; // límite defensivo
      let page = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let q = supabase
          .from("security_audit_log")
          .select("id, created_at, table_name, operation, row_id, actor_user_id, actor_email, changed")
          .order("created_at", { ascending: false })
          .range(from, to);
        q = applyFilters(q, filters);
        const { data, error } = await q;
        if (error) throw error;
        const chunk = (data || []) as AuditRow[];
        collected.push(...chunk);
        if (chunk.length < PAGE_SIZE || collected.length >= MAX_ROWS) break;
        page += 1;
      }

      if (collected.length === 0) {
        toast.warning("No hay filas para exportar con los filtros actuales.", { id: loadingId });
        return;
      }

      const cols = ["created_at", "table_name", "operation", "row_id", "actor_email", "actor_user_id", "changed"];
      const escape = (v: unknown) => {
        const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const csv = [
        cols.join(","),
        ...collected.map((r) => cols.map((c) => escape((r as any)[c])).join(",")),
      ].join("\n");

      // BOM para que Excel lo abra en UTF-8
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-audit-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${collected.length} filas`, { id: loadingId });
    } catch (err: any) {
      console.error(err);
      toast.error("Error exportando la auditoría", { id: loadingId, description: err?.message });
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Auditoría de seguridad"
        description="Cambios sensibles y eventos de Storage registrados por el sistema."
      />

      <div className="bg-card border rounded-lg p-4 mb-4 grid gap-3 md:grid-cols-6">
        <div>
          <label className="text-xs text-muted-foreground">Origen</label>
          <Select value={filters.eventType} onValueChange={(v) => setFilters((f) => ({ ...f, eventType: v as Filters["eventType"] }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="db">Base de datos</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Tabla / bucket</label>
          <Select value={filters.table} onValueChange={(v) => setFilters((f) => ({ ...f, table: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {["user_roles", "profiles", "finanzas", "configuracion_iglesia", "sem_calificaciones", ...tables]
                .filter((t, i, arr) => t && arr.indexOf(t) === i)
                .map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Operación</label>
          <Select value={filters.operation} onValueChange={(v) => setFilters((f) => ({ ...f, operation: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="UPLOAD">UPLOAD</SelectItem>
              <SelectItem value="SIGNED_URL">SIGNED_URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Actor (email)</label>
          <Input value={filters.actor} onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))} placeholder="usuario@…" className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="h-9" />
        </div>
        <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Filter className="h-3 w-3" /> Filtros persistentes · {totalLoaded} filas cargadas
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Actualizar
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={exporting} className="gap-1.5">
              <Download className="h-4 w-4" /> {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Tabla / bucket</th>
              <th className="px-4 py-3">Op.</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Registro / path</th>
              <th className="px-4 py-3">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin registros</td></tr>
            ) : (
              rows.map((r) => {
                const isStorage = r.table_name?.startsWith("storage:");
                return (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-xs">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}</td>
                    <td className="px-4 py-2">
                      <Badge variant={isStorage ? "secondary" : "outline"} className="text-[10px]">
                        {isStorage ? "Storage" : "DB"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.table_name}</td>
                    <td className="px-4 py-2 text-xs">
                      <Badge variant={opBadgeVariant(r.operation)} className="text-[10px]">{r.operation}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs">{r.actor_email || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground break-all max-w-xs">
                      {r.row_id || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <pre className="text-[11px] whitespace-pre-wrap break-all max-w-md text-muted-foreground">
                        {r.changed ? JSON.stringify(r.changed, null, 0) : ""}
                      </pre>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {hasNextPage && (
          <div className="p-3 border-t flex justify-center">
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Cargando…" : `Cargar más (${PAGE_SIZE})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
