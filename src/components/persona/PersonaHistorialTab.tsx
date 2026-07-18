import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, User as UserIcon, Search, Calendar, RefreshCw, History } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  table_name: string;
  operation: string;
  row_id: string | null;
  actor_email: string | null;
  changed: any;
  old_row: any;
  new_row: any;
};

const OP_LABEL: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  CHECKIN: "Check-in",
  ATTENDANCE_MARK: "Asistencia",
  EXPORT_FICHA: "Exportar ficha",
  EXPORT_HISTORIAL: "Exportar historial",
  CERTIFICATE_ISSUED: "Certificado emitido",
  PROFILE_QUICK_ACTION: "Acción rápida",
  CDP_REPORT_CREATED: "Reporte CDP creado",
  CDP_REPORT_UPDATED: "Reporte CDP editado",
  CDP_REPORT_DELETED: "Reporte CDP eliminado",
  CDP_PLAN_CREATED: "Planificación creada",
  CDP_PLAN_UPDATED: "Planificación editada",
  CDP_PLAN_DELETED: "Planificación eliminada",
};

const OP_TONE = (op: string) => {
  if (op.includes("CREATED") || op === "INSERT") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  if (op.includes("UPDATED") || op === "UPDATE") return "bg-sky-500/10 text-sky-700 border-sky-500/30";
  if (op.includes("DELETED") || op === "DELETE") return "bg-destructive/10 text-destructive border-destructive/30";
  if (op === "LOAD_FAILURE") return "bg-orange-500/10 text-orange-700 border-orange-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const TYPE_GROUPS: Record<string, string[]> = {
  perfil: ["personas", "profiles"],
  cdp: ["reportes_grupos", "planificaciones_grupo", "grupos", "grupo_miembros"],
  academia: ["matriculas", "calificaciones", "sem_inscripciones", "sem_calificaciones", "sem_pagos_inscripcion", "sem_entregas"],
  asistencia: ["asistencia", "asistencia_materias", "sem_asistencias"],
  finanzas: ["finanzas", "donaciones", "pagos_matricula"],
};

function typeOfRow(r: Row): string {
  for (const [k, arr] of Object.entries(TYPE_GROUPS)) if (arr.includes(r.table_name)) return k;
  return "otros";
}

export default function PersonaHistorialTab({ personaId, personaEmail }: { personaId: string; personaEmail?: string | null }) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("all");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["persona-historial", personaId, personaEmail],
    queryFn: async () => {
      // 1) Cambios/acciones directos sobre esta persona (row_id = personaId)
      const byRow = supabase
        .from("security_audit_log")
        .select("id,created_at,table_name,operation,row_id,actor_email,changed,old_row,new_row")
        .eq("row_id", personaId)
        .order("created_at", { ascending: false })
        .limit(300);

      // 2) Eventos donde 'changed' JSON incluya persona_id = personaId (log_persona_action)
      const byChanged = supabase
        .from("security_audit_log")
        .select("id,created_at,table_name,operation,row_id,actor_email,changed,old_row,new_row")
        .contains("changed", { persona_id: personaId })
        .order("created_at", { ascending: false })
        .limit(300);

      const [r1, r2] = await Promise.all([byRow, byChanged]);
      if (r1.error) throw r1.error;
      const merged = new Map<string, Row>();
      for (const row of ((r1.data || []) as Row[])) merged.set(row.id, row);
      if (!r2.error) for (const row of ((r2.data || []) as Row[])) merged.set(row.id, row);
      return Array.from(merged.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (tipo !== "all" && typeOfRow(r) !== tipo) return false;
      if (desde && r.created_at.slice(0, 10) < desde) return false;
      if (hasta && r.created_at.slice(0, 10) > hasta) return false;
      if (q) {
        const hay = `${r.actor_email || ""} ${r.table_name} ${r.operation} ${JSON.stringify(r.changed || {})}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, tipo, desde, hasta]);

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por usuario, tabla, operación…" />
        </div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="perfil">Perfil</SelectItem>
            <SelectItem value="cdp">Casas de paz</SelectItem>
            <SelectItem value="academia">Academia</SelectItem>
            <SelectItem value="asistencia">Asistencia</SelectItem>
            <SelectItem value="finanzas">Finanzas</SelectItem>
            <SelectItem value="otros">Otros</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" />
          <span className="text-muted-foreground text-xs">a</span>
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-40" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Recargar">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </Card>

      {isLoading && <p className="text-muted-foreground text-sm">Cargando historial…</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin eventos de auditoría para esta persona</p>
        </div>
      )}

      <ol className="space-y-2">
        {filtered.map(r => (
          <li key={r.id}>
            <Card className="p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={OP_TONE(r.operation)} variant="outline">
                      {OP_LABEL[r.operation] || r.operation}
                    </Badge>
                    <span className="font-medium text-sm">{r.table_name}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{typeOfRow(r)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" /> {r.actor_email || "sistema"}
                  </p>
                  {r.changed && Object.keys(r.changed).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Ver detalle</summary>
                      <pre className="mt-1 text-[11px] bg-muted/50 rounded p-2 overflow-auto max-h-40">
                        {JSON.stringify(r.changed, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {format(parseISO(r.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
