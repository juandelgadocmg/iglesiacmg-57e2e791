import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ShieldCheck } from "lucide-react";
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

export default function SeguridadPage() {
  const [table, setTable] = useState<string>("all");
  const [operation, setOperation] = useState<string>("all");
  const [actor, setActor] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["security_audit_log", table, operation, actor, from, to],
    queryFn: async () => {
      let q = supabase
        .from("security_audit_log")
        .select("id, created_at, table_name, operation, row_id, actor_user_id, actor_email, changed")
        .order("created_at", { ascending: false })
        .limit(500);
      if (table !== "all") q = q.eq("table_name", table);
      if (operation !== "all") q = q.eq("operation", operation);
      if (actor.trim()) q = q.ilike("actor_email", `%${actor.trim()}%`);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  useEffect(() => {
    if (error) toast.error("No tienes permiso para ver la auditoría o hubo un error.");
  }, [error]);

  const tables = useMemo(() => {
    const s = new Set<string>((data || []).map((r) => r.table_name));
    return Array.from(s).sort();
  }, [data]);

  const exportCsv = () => {
    if (!data || data.length === 0) {
      toast.warning("No hay filas para exportar.");
      return;
    }
    const cols = ["created_at", "table_name", "operation", "row_id", "actor_email", "actor_user_id", "changed"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      cols.join(","),
      ...data.map((r) => cols.map((c) => escape((r as any)[c])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-audit-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Auditoría de seguridad"
        description="Cambios sensibles registrados por triggers en la base de datos."
      />

      <div className="bg-card border rounded-lg p-4 mb-4 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Tabla</label>
          <Select value={table} onValueChange={setTable}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {["user_roles", "profiles", "finanzas", "configuracion_iglesia", "sem_calificaciones", ...tables]
                .filter((t, i, arr) => arr.indexOf(t) === i)
                .map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Operación</label>
          <Select value={operation} onValueChange={setOperation}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Actor (email)</label>
          <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="usuario@…" className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div className="md:col-span-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>Actualizar</Button>
          <Button size="sm" onClick={exportCsv} className="gap-1.5"><Download className="h-4 w-4" /> Exportar CSV</Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tabla</th>
              <th className="px-4 py-3">Op.</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Cambios</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>
            ) : (data || []).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin registros</td></tr>
            ) : (
              (data || []).map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 whitespace-nowrap text-xs">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss")}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.table_name}</td>
                  <td className="px-4 py-2 text-xs">{r.operation}</td>
                  <td className="px-4 py-2 text-xs">{r.actor_email || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">{r.row_id?.slice(0, 8) || "—"}</td>
                  <td className="px-4 py-2">
                    <pre className="text-[11px] whitespace-pre-wrap break-all max-w-lg text-muted-foreground">
                      {r.changed ? JSON.stringify(r.changed, null, 0) : ""}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
