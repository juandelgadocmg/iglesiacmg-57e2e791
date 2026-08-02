import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User as UserIcon, Calendar, ArrowDownUp, X } from "lucide-react";
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
  if (op === "LOAD_FAILURE") return "bg-orange-500/10 text-orange-700 border-orange-500/30";
  return "bg-muted text-muted-foreground border-border";
}

// Severidad: crítico > alta > media > baja
function severity(r: Row): number {
  if (r.operation === "LOAD_FAILURE" || r.operation.includes("DELETED") || r.operation === "DELETE") return 4;
  if (r.operation === "EXPORT_FICHA" || r.operation === "EXPORT_HISTORIAL" || r.operation === "PROFILE_QUICK_ACTION") return 3;
  if (r.operation.includes("UPDATED") || r.operation === "UPDATE") return 2;
  return 1;
}
const SEV_LABEL: Record<number, string> = { 4: "Crítica", 3: "Alta", 2: "Media", 1: "Baja" };
const SEV_TONE: Record<number, string> = {
  4: "bg-destructive/10 text-destructive border-destructive/30",
  3: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  2: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  1: "bg-muted text-muted-foreground border-border",
};

const MODULE_GROUPS: Record<string, string[]> = {
  personas: ["personas", "profiles", "relaciones_familiares", "persona_procesos"],
  grupos: ["grupos", "grupo_miembros", "reportes_grupos", "planificaciones_grupo"],
  academia: ["matriculas", "calificaciones", "sem_inscripciones", "sem_calificaciones", "sem_pagos_inscripcion", "sem_entregas", "sem_asistencias"],
  finanzas: ["finanzas", "donaciones", "pagos_matricula", "tesoreria_ofrendas_cdp", "tesoreria_consignacion_semanal"],
  reuniones: ["servicios", "eventos", "asistencia"],
  seguridad: ["user_roles", "role_permissions"],
};

function moduleOf(table: string): string {
  for (const [mod, arr] of Object.entries(MODULE_GROUPS)) if (arr.includes(table)) return mod;
  return "otros";
}

export default function ActividadPage() {
  const [q, setQ] = useState("");
  const [modulo, setModulo] = useState<string>("all");
  const [tabla, setTabla] = useState<string>("all");
  const [operacion, setOperacion] = useState<string>("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState<"fecha" | "severidad">("fecha");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["actividad-reciente"],
    queryFn: async () => {
      const { data, error } = await supabase.from("security_audit_log")
        .select("id,created_at,table_name,operation,row_id,actor_email,actor_user_id,changed,old_row,new_row")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data as Row[]) || [];
    },
  });

  const tables = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (modulo === "all" || moduleOf(r.table_name) === modulo) set.add(r.table_name);
    return ["all", ...Array.from(set).sort()];
  }, [rows, modulo]);

  const operations = useMemo(
    () => ["all", ...Array.from(new Set(rows.map(r => r.operation))).sort()],
    [rows]
  );

  const filtered = useMemo(() => {
    let list = rows.filter(r => {
      if (modulo !== "all" && moduleOf(r.table_name) !== modulo) return false;
      if (tabla !== "all" && r.table_name !== tabla) return false;
      if (operacion !== "all" && r.operation !== operacion) return false;
      if (desde && r.created_at.slice(0, 10) < desde) return false;
      if (hasta && r.created_at.slice(0, 10) > hasta) return false;
      if (q) {
        const s = `${r.actor_email || ""} ${r.table_name} ${r.operation} ${r.row_id || ""} ${JSON.stringify(r.changed || {})}`.toLowerCase();
        return s.includes(q.toLowerCase());
      }
      return true;
    });
    if (orden === "severidad") {
      list = [...list].sort((a, b) => severity(b) - severity(a) || b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [rows, q, modulo, tabla, operacion, desde, hasta, orden]);

  // Agrupar por día solo cuando el orden es por fecha
  const groups = useMemo(() => {
    if (orden !== "fecha") return null;
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const day = format(new Date(r.created_at), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered, orden]);

  const clearFilters = () => {
    setQ(""); setModulo("all"); setTabla("all"); setOperacion("all"); setDesde(""); setHasta("");
  };
  const anyFilter = q || modulo !== "all" || tabla !== "all" || operacion !== "all" || desde || hasta;

  return (
    <div className="animate-fade-in space-y-5 max-w-6xl mx-auto">
      <PageHeader title="Actividad reciente" description="Historial de eventos del sistema con fecha, hora y responsable" variant="auditoria" />

      <Card className="p-3 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por persona (email/id), tabla, operación, detalles…" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setOrden(o => o === "fecha" ? "severidad" : "fecha")} className="gap-1.5">
            <ArrowDownUp className="h-4 w-4" />
            {orden === "fecha" ? "Ordenar por severidad" : "Ordenar por fecha"}
          </Button>
          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-4 w-4" /> Limpiar</Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={modulo} onValueChange={(v) => { setModulo(v); setTabla("all"); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Módulo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los módulos</SelectItem>
              {Object.keys(MODULE_GROUPS).map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              <SelectItem value="otros">Otros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tabla} onValueChange={setTabla}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Tabla" /></SelectTrigger>
            <SelectContent>{tables.map(t => <SelectItem key={t} value={t}>{t === "all" ? "Todas las tablas" : t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={operacion} onValueChange={setOperacion}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Operación" /></SelectTrigger>
            <SelectContent>{operations.map(o => <SelectItem key={o} value={o}>{o === "all" ? "Todas las operaciones" : o}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" aria-label="Desde" />
            <span className="text-xs text-muted-foreground">a</span>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-40" aria-label="Hasta" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} evento(s) {anyFilter ? "coinciden con los filtros" : "recientes"}
        </p>
      </Card>

      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
      {!isLoading && filtered.length === 0 && <p className="text-muted-foreground">Sin eventos que coincidan.</p>}

      {orden === "severidad" ? (
        <ol className="space-y-2">
          {filtered.map(r => (
            <li key={r.id}>
              <EventCard r={r} showDate />
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-6">
          {groups?.map(([day, items]) => (
            <section key={day}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {format(new Date(day), "EEEE d MMMM yyyy", { locale: es })}
                <Badge variant="outline" className="ml-2">{items.length}</Badge>
              </h2>
              <ol className="relative border-l border-border pl-6 space-y-3" aria-label={`Eventos del ${day}`}>
                {items.map(r => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-primary ring-4 ring-background" aria-hidden />
                    <EventCard r={r} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ r, showDate }: { r: Row; showDate?: boolean }) {
  const sev = severity(r);
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={opClass(r.operation)} variant="outline">{r.operation}</Badge>
            <Badge className={SEV_TONE[sev]} variant="outline">{SEV_LABEL[sev]}</Badge>
            <span className="font-medium">{r.table_name}</span>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider capitalize">{moduleOf(r.table_name)}</Badge>
            {r.row_id && <span className="text-xs text-muted-foreground font-mono truncate max-w-[220px]">#{r.row_id.slice(0, 12)}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" /> {r.actor_email || "sistema"}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {showDate ? format(new Date(r.created_at), "dd MMM · HH:mm:ss", { locale: es }) : format(new Date(r.created_at), "HH:mm:ss")}
        </span>
      </div>
    </Card>
  );
}
