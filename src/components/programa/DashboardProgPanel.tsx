import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Clock, Users } from "lucide-react";
import { useProgEventos, useProgAsignaciones, useProgMinisterios } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";
import ReemplazosPanel from "./ReemplazosPanel";

export default function DashboardProgPanel({ onOpenEvento }: { onOpenEvento: (id: string) => void }) {
  const { data: eventos = [] } = useProgEventos();
  const { data: asignaciones = [] } = useProgAsignaciones();
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: personas = [] } = usePersonas();

  const today = new Date().toISOString().slice(0, 10);
  const proximos = useMemo(() => eventos.filter((e) => e.fecha >= today).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5), [eventos, today]);
  const pendientes = asignaciones.filter((a) => a.estado === "pendiente");
  const reemplazos = asignaciones.filter((a) => a.estado === "reemplazo");
  const noDisp = asignaciones.filter((a) => a.estado === "no_disponible");
  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);
  const evMap = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricMini icon={<Calendar className="h-5 w-5" />} label="Próximos eventos" value={proximos.length} color="bg-primary/10 text-primary" />
        <MetricMini icon={<Clock className="h-5 w-5" />} label="Pendientes confirmar" value={pendientes.length} color="bg-amber-100 text-amber-700" />
        <MetricMini icon={<AlertCircle className="h-5 w-5" />} label="Reemplazos solicitados" value={reemplazos.length} color="bg-red-100 text-red-700" />
        <MetricMini icon={<Users className="h-5 w-5" />} label="No disponibles" value={noDisp.length} color="bg-slate-100 text-slate-700" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Próximos servicios</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {proximos.length === 0 && <p className="text-sm text-muted-foreground">No hay servicios próximos.</p>}
          {proximos.map((e) => {
            const asigs = asignaciones.filter((a) => a.evento_id === e.id);
            const conf = asigs.filter((a) => a.estado === "confirmado").length;
            return (
              <button key={e.id} onClick={() => onOpenEvento(e.id)} className="w-full text-left p-3 rounded-md border hover:bg-accent">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{e.titulo}</div>
                    <div className="text-xs text-muted-foreground">{e.fecha} · {e.hora || "—"}</div>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline">{asigs.length} asignados</Badge>
                    <Badge>{conf} confirmados</Badge>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <ReemplazosPanel />

      {(pendientes.length > 0 || reemplazos.length > 0) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Alertas</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {reemplazos.slice(0, 10).map((a) => {
              const p: any = personasMap.get(a.persona_id); const ev = evMap.get(a.evento_id); const m = minMap.get(a.ministerio_id);
              return <div key={a.id} className="flex justify-between"><span>🔄 {p?.nombres} {p?.apellidos} solicita reemplazo · {m?.nombre} · {ev?.fecha}</span></div>;
            })}
            {pendientes.slice(0, 10).map((a) => {
              const p: any = personasMap.get(a.persona_id); const ev = evMap.get(a.evento_id); const m = minMap.get(a.ministerio_id);
              return <div key={a.id} className="flex justify-between text-muted-foreground"><span>⏳ {p?.nombres} {p?.apellidos} sin confirmar · {m?.nombre} · {ev?.fecha}</span></div>;
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricMini({ icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
