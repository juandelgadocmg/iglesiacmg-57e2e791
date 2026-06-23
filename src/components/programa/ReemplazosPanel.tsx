import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useProgReemplazos, useUpsertReemplazo, useUpsertAsignacion, useProgServidores, useAsignacionesPorPersona, useProgAsignaciones, useProgMinisterios, useProgCargos, useProgEventos, logProgAction } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ReemplazosPanel({ eventoId }: { eventoId?: string }) {
  const { data: reemplazos = [] } = useProgReemplazos();
  const { data: personas = [] } = usePersonas();
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const { data: eventos = [] } = useProgEventos();
  const { data: servidores = [] } = useProgServidores();
  const { data: asigs = [] } = useProgAsignaciones();
  const up = useUpsertReemplazo();
  const upAsig = useUpsertAsignacion();
  const stats = useAsignacionesPorPersona();

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);
  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);
  const evMap = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);

  const list = reemplazos
    .filter((r) => (!eventoId || r.evento_id === eventoId) && r.estado === "pendiente")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const pickAuto = (r: any) => {
    if (r.persona_reemplazo_id) return r.persona_reemplazo_id;
    const ev = evMap.get(r.evento_id);
    if (!ev) return null;
    const ocupados = new Set(asigs.filter((a) => a.evento_id === r.evento_id).map((a) => a.persona_id));
    const candidatos = servidores
      .filter((s) => s.ministerio_id === r.ministerio_id && s.activo && s.persona_id !== r.persona_solicita_id && !ocupados.has(s.persona_id))
      .map((s) => ({ ...s, total: stats.get(s.persona_id)?.total || 0 }))
      .sort((a, b) => a.total - b.total);
    return candidatos[0]?.persona_id || null;
  };

  const aprobar = async (r: any) => {
    const replacementPersonaId = pickAuto(r);
    if (!replacementPersonaId) return toast.error("No hay servidores disponibles para reasignar");
    try {
      // libera al original
      await upAsig.mutateAsync({ id: r.asignacion_id, persona_id: replacementPersonaId, estado: "pendiente", confirmado_at: null });
      await up.mutateAsync({ id: r.id, estado: "aprobado", persona_reemplazo_id: replacementPersonaId, aprobado_at: new Date().toISOString() });
      const orig: any = personasMap.get(r.persona_solicita_id);
      const nuevo: any = personasMap.get(replacementPersonaId);
      await logProgAction({
        evento_id: r.evento_id, asignacion_id: r.asignacion_id,
        action: r.persona_reemplazo_id ? "reemplazo_aprobado" : "reasignacion_auto",
        details: { persona_nombre: nuevo ? `${nuevo.nombres} ${nuevo.apellidos}` : "—", anterior: orig ? `${orig.nombres} ${orig.apellidos}` : "—", ministerio_nombre: minMap.get(r.ministerio_id)?.nombre, cargo_nombre: r.cargo_id ? cargosMap.get(r.cargo_id)?.nombre : null }
      });
      toast.success("Reemplazo aprobado y reasignado");
    } catch (e: any) { toast.error(e.message); }
  };

  const rechazar = async (r: any) => {
    try {
      await up.mutateAsync({ id: r.id, estado: "rechazado", aprobado_at: new Date().toISOString() });
      await upAsig.mutateAsync({ id: r.asignacion_id, estado: "pendiente" });
      await logProgAction({ evento_id: r.evento_id, asignacion_id: r.asignacion_id, action: "reemplazo_rechazado", details: { motivo: r.motivo } });
      toast.success("Solicitud rechazada");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Solicitudes de reemplazo</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Sin solicitudes pendientes.</p>}
        {list.map((r) => {
          const p: any = personasMap.get(r.persona_solicita_id);
          const sug: any = r.persona_reemplazo_id ? personasMap.get(r.persona_reemplazo_id) : null;
          const ev = evMap.get(r.evento_id);
          const m = minMap.get(r.ministerio_id || "");
          return (
            <div key={r.id} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <div className="text-sm">
                  <div className="font-medium">{p?.nombres} {p?.apellidos} <span className="text-muted-foreground">solicita reemplazo</span></div>
                  <div className="text-xs text-muted-foreground">{m?.nombre} · {ev?.titulo} · {ev?.fecha}{ev?.hora ? ` ${ev.hora}` : ""}</div>
                  {r.motivo && <div className="text-xs mt-1 italic">"{r.motivo}"</div>}
                  {sug && <div className="text-xs mt-1">Sugerido: <Badge variant="secondary">{sug.nombres} {sug.apellidos}</Badge></div>}
                </div>
                <span className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "Pp", { locale: es })}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => rechazar(r)}><X className="h-3.5 w-3.5 mr-1" />Rechazar</Button>
                <Button size="sm" onClick={() => aprobar(r)}><Check className="h-3.5 w-3.5 mr-1" />Aprobar y reasignar</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
