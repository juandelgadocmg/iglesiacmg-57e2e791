import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, ChevronLeft, ChevronRight, Search, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ACTIONS = [
  { value: "all", label: "Todas" },
  { value: "certificado.generado", label: "Certificado generado", group: "Certificado" },
  { value: "certificado.lote", label: "Certificado lote", group: "Certificado" },
  { value: "kardex.descargado", label: "Kárdex descargado", group: "Kárdex" },
  { value: "zoom.regenerado", label: "Zoom regenerado", group: "Zoom" },
  { value: "inscripcion.creada", label: "Inscripción creada", group: "Inscripción" },
  { value: "inscripcion.eliminada", label: "Inscripción eliminada", group: "Inscripción" },
  { value: "matricula.creada", label: "Matrícula creada", group: "Matrícula" },
  { value: "matricula.eliminada", label: "Matrícula eliminada", group: "Matrícula" },
  { value: "matricula.actualizada", label: "Matrícula actualizada", group: "Matrícula" },
];

const ACTION_GROUPS: Record<string, string[]> = {
  certificado: ["certificado.generado", "certificado.lote"],
  zoom: ["zoom.regenerado"],
  matricula: ["matricula.creada", "matricula.eliminada", "matricula.actualizada", "inscripcion.creada", "inscripcion.eliminada"],
  kardex: ["kardex.descargado"],
};

const PAGE_SIZE = 25;

export default function AuditoriaSection() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actor, setActor] = useState("");
  const [grupo, setGrupo] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [persona, setPersona] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sem-audit", from, to, actor, grupo, action, persona, page],
    queryFn: async () => {
      const sb = supabase as any;
      let q = sb.from("sem_audit_log")
        .select("*, personas:persona_id(nombres,apellidos,documento)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      if (actor.trim()) q = q.ilike("actor_email", `%${actor.trim()}%`);
      if (action !== "all") q = q.eq("action", action);
      else if (grupo !== "all" && ACTION_GROUPS[grupo]) q = q.in("action", ACTION_GROUPS[grupo]);
      const { data: rows, count, error } = await q;
      if (error) throw error;
      let filtered = rows || [];
      if (persona.trim()) {
        const t = persona.trim().toLowerCase();
        filtered = filtered.filter((r: any) => {
          const p = r.personas;
          if (!p) return false;
          const full = `${p.nombres || ""} ${p.apellidos || ""} ${p.documento || ""}`.toLowerCase();
          return full.includes(t);
        });
      }
      return { rows: filtered, count: count ?? 0 };
    },
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows || [];

  const reset = () => {
    setFrom(""); setTo(""); setActor(""); setGrupo("all"); setAction("all"); setPersona(""); setPage(0);
  };

  const fetchAllForExport = async () => {
    const sb = supabase as any;
    let q = sb.from("sem_audit_log")
      .select("created_at, action, actor_email, persona_id, inscripcion_id, oferta_id, materia_id, details, personas:persona_id(nombres,apellidos,documento)")
      .order("created_at", { ascending: false }).limit(5000);
    if (from) q = q.gte("created_at", new Date(from + "T00:00:00").toISOString());
    if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
    if (actor.trim()) q = q.ilike("actor_email", `%${actor.trim()}%`);
    if (action !== "all") q = q.eq("action", action);
    else if (grupo !== "all" && ACTION_GROUPS[grupo]) q = q.in("action", ACTION_GROUPS[grupo]);
    const { data, error } = await q;
    if (error) throw error;
    let res = data || [];
    if (persona.trim()) {
      const t = persona.trim().toLowerCase();
      res = res.filter((r: any) => {
        const p = r.personas;
        if (!p) return false;
        return `${p.nombres || ""} ${p.apellidos || ""} ${p.documento || ""}`.toLowerCase().includes(t);
      });
    }
    return res;
  };

  const exportCsv = async () => {
    try {
      const all = await fetchAllForExport();
      const headers = ["Fecha", "Usuario", "Acción", "Estudiante", "Documento", "Detalles"];
      const lines = [headers.join(",")];
      all.forEach((r: any) => {
        const fecha = format(new Date(r.created_at), "yyyy-MM-dd HH:mm");
        const est = r.personas ? `${r.personas.nombres} ${r.personas.apellidos}` : "";
        const doc = r.personas?.documento || "";
        const det = JSON.stringify(r.details || {}).replace(/"/g, '""');
        const row = [fecha, r.actor_email || "", r.action, est, doc, det]
          .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        lines.push(row);
      });
      const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `auditoria_seminario_${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${all.length} filas exportadas`);
    } catch (e: any) { toast.error(e.message); }
  };

  const exportPdf = async () => {
    try {
      const all = await fetchAllForExport();
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Auditoría — Seminario Bíblico CMG", 14, 14);
      doc.setFontSize(9);
      const filtros = [
        from && `Desde: ${from}`, to && `Hasta: ${to}`,
        actor && `Usuario: ${actor}`, action !== "all" && `Acción: ${action}`,
        grupo !== "all" && action === "all" && `Grupo: ${grupo}`,
        persona && `Estudiante: ${persona}`,
      ].filter(Boolean).join(" · ") || "Sin filtros";
      doc.text(filtros, 14, 20);
      doc.text(`Total: ${all.length} registros · Generado ${new Date().toLocaleString("es-CO")}`, 14, 26);
      autoTable(doc, {
        startY: 32,
        head: [["Fecha", "Usuario", "Acción", "Estudiante", "Detalles"]],
        body: all.map((r: any) => [
          format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
          r.actor_email || "—",
          r.action,
          r.personas ? `${r.personas.nombres} ${r.personas.apellidos}` : "—",
          JSON.stringify(r.details || {}).slice(0, 80),
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [37, 99, 235] },
      });
      doc.save(`auditoria_seminario_${Date.now()}.pdf`);
      toast.success(`PDF generado (${all.length} filas)`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Auditoría</h2>
          <p className="text-xs text-muted-foreground">Registro de acciones del seminario: certificados, Zoom, matrículas e inscripciones.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />Actualizar
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
          <Button size="sm" variant="outline" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" />PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid gap-3 md:grid-cols-6">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label className="text-xs">Usuario (email)</Label>
              <Input value={actor} onChange={e => { setActor(e.target.value); setPage(0); }} placeholder="usuario@..." />
            </div>
            <div>
              <Label className="text-xs">Grupo de acción</Label>
              <Select value={grupo} onValueChange={(v) => { setGrupo(v); setAction("all"); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="certificado">Certificado</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="matricula">Matrícula / Inscripción</SelectItem>
                  <SelectItem value="kardex">Kárdex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Acción específica</Label>
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estudiante</Label>
              <Input value={persona} onChange={e => { setPersona(e.target.value); setPage(0); }} placeholder="Nombre o documento" />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <Button size="sm" variant="ghost" onClick={reset}><Filter className="h-3.5 w-3.5 mr-1" />Limpiar filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Usuario</th>
                  <th className="text-left p-2">Acción</th>
                  <th className="text-left p-2">Estudiante</th>
                  <th className="text-left p-2">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Sin resultados.</td></tr>
                ) : rows.map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 whitespace-nowrap">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}</td>
                    <td className="p-2 truncate max-w-[160px]">{r.actor_email || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.action}</Badge></td>
                    <td className="p-2 truncate max-w-[180px]">
                      {r.personas ? `${r.personas.nombres} ${r.personas.apellidos}` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2 max-w-[420px] truncate font-mono text-[10px] text-muted-foreground" title={JSON.stringify(r.details)}>
                      {JSON.stringify(r.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 border-t text-xs">
            <span className="text-muted-foreground">{total} registros · Página {page + 1} de {totalPages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
