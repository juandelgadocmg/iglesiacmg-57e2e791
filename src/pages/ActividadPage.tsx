import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Row = {
  id: string; created_at: string; table_name: string; operation: string;
  row_id: string | null; actor_email: string | null; actor_user_id: string | null;
  changed: any; old_row: any; new_row: any;
};

const OP_TONE: Record<string, string> = {
  INSERT: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  UPDATE: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  DELETE: "bg-destructive/10 text-destructive border-destructive/30",
};

function opClass(op: string) {
  if (op.includes("CREATED") || op === "INSERT") return OP_TONE.INSERT;
  if (op.includes("UPDATED") || op === "UPDATE") return OP_TONE.UPDATE;
  if (op.includes("DELETED") || op === "DELETE") return OP_TONE.DELETE;
  return "bg-muted text-muted-foreground border-border";
}

export default function ActividadPage() {
  const [q, setQ] = useState("");
  const [tabla, setTabla] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["actividad-reciente"],
    queryFn: async () => {
      const { data, error } = await supabase.from("security_audit_log")
        .select("id,created_at,table_name,operation,row_id,actor_email,actor_user_id,changed,old_row,new_row")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as Row[]) || [];
    },
  });

  const tables = useMemo(() => ["all", ...Array.from(new Set(rows.map(r => r.table_name))).sort()], [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (tabla !== "all" && r.table_name !== tabla) return false;
      if (!q) return true;
      const s = `${r.actor_email || ""} ${r.table_name} ${r.operation} ${r.row_id || ""}`.toLowerCase();
      return s.includes(q.toLowerCase());
    });
  }, [rows, q, tabla]);

  // Agrupar por día
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const day = format(new Date(r.created_at), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="animate-fade-in space-y-5 max-w-5xl mx-auto">
      <PageHeader title="Actividad reciente" description="Historial de eventos del sistema con fecha, hora y responsable" variant="auditoria" />

      <Card className="p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por usuario, tabla, operación o ID…" />
        </div>
        <Select value={tabla} onValueChange={setTabla}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t === "all" ? "Todas las tablas" : t}</SelectItem>)}</SelectContent>
        </Select>
      </Card>

      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {!isLoading && filtered.length === 0 && <p className="text-muted-foreground">Sin eventos que coincidan.</p>}

      <div className="space-y-6">
        {groups.map(([day, items]) => (
          <section key={day}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {format(new Date(day), "EEEE d MMMM yyyy", { locale: es })}
              <Badge variant="outline" className="ml-2">{items.length}</Badge>
            </h2>
            <ol className="relative border-l border-border pl-6 space-y-3" aria-label={`Eventos del ${day}`}>
              {items.map(r => (
                <li key={r.id} className="relative">
                  <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-primary ring-4 ring-background" aria-hidden />
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={opClass(r.operation)} variant="outline">{r.operation}</Badge>
                          <span className="font-medium">{r.table_name}</span>
                          {r.row_id && <span className="text-xs text-muted-foreground font-mono truncate max-w-[220px]">#{r.row_id.slice(0, 12)}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5" /> {r.actor_email || "sistema"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{format(new Date(r.created_at), "HH:mm:ss")}</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
