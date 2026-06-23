import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Lock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useProgAsignaciones, useProgMinisterios, useProgCargos, useUpsertAsignacion, isEventoBloqueado, logProgAction, type ProgEvento } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";

export default function CheckInPanel({ evento }: { evento: ProgEvento }) {
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const { data: personas = [] } = usePersonas();
  const up = useUpsertAsignacion();

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);
  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c])), [cargos]);

  const list = asignaciones.filter((a) => a.evento_id === evento.id);
  const bloqueado = isEventoBloqueado(evento);

  const stats = {
    presente: list.filter((a) => a.asistencia === "presente").length,
    tarde: list.filter((a) => a.asistencia === "tarde").length,
    ausente: list.filter((a) => a.asistencia === "ausente").length,
    pendiente: list.filter((a) => !a.asistencia).length,
  };

  const setAsist = async (a: any, v: string) => {
    if (bloqueado) return toast.error("El evento está bloqueado para modificaciones");
    try {
      await up.mutateAsync({ id: a.id, asistencia: v, asistencia_at: new Date().toISOString() });
      const p: any = personasMap.get(a.persona_id);
      await logProgAction({ evento_id: evento.id, asignacion_id: a.id, action: "asistencia", details: { persona_nombre: p ? `${p.nombres} ${p.apellidos}` : "—", asistencia: v } });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Check-in rápido
          {bloqueado && <Badge variant="secondary" className="ml-2"><Lock className="h-3 w-3 mr-1" />Bloqueado</Badge>}
        </CardTitle>
        <div className="flex gap-1.5 text-xs">
          <Badge className="bg-green-100 text-green-700 border-0">{stats.presente} ✓</Badge>
          <Badge className="bg-amber-100 text-amber-700 border-0">{stats.tarde} ⏱</Badge>
          <Badge className="bg-red-100 text-red-700 border-0">{stats.ausente} ✗</Badge>
          <Badge variant="outline">{stats.pendiente} pend.</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {bloqueado && (
          <div className="text-xs text-muted-foreground mb-2 p-2 rounded-md bg-muted">
            Las modificaciones de asistencia fueron bloqueadas {evento.bloqueo_at ? `el ${new Date(evento.bloqueo_at).toLocaleString("es")}` : "por límite automático (2h después del inicio)"}.
          </div>
        )}
        {list.length === 0 ? <p className="text-sm text-muted-foreground">Sin servidores asignados.</p> : (
          <div className="space-y-1.5">
            {list.map((a) => {
              const p: any = personasMap.get(a.persona_id);
              const m = minMap.get(a.ministerio_id);
              const c = a.cargo_id ? cargosMap.get(a.cargo_id) : null;
              if (!p) return null;
              return (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md border gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{p.nombres?.[0]}{p.apellidos?.[0]}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.nombres} {p.apellidos}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{m?.nombre}{c ? ` · ${c.nombre}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant={a.asistencia === "presente" ? "default" : "outline"} className="h-8 px-2" disabled={bloqueado} onClick={() => setAsist(a, "presente")}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant={a.asistencia === "tarde" ? "default" : "outline"} className="h-8 px-2" disabled={bloqueado} onClick={() => setAsist(a, "tarde")}><Clock className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant={a.asistencia === "ausente" ? "destructive" : "outline"} className="h-8 px-2" disabled={bloqueado} onClick={() => setAsist(a, "ausente")}><XCircle className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
