import { useProgAuditByEvento } from "@/hooks/usePrograma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const LABELS: Record<string, { label: string; color: string }> = {
  publicar: { label: "Publicó programación", color: "bg-emerald-100 text-emerald-700" },
  asignar: { label: "Asignó servidor", color: "bg-blue-100 text-blue-700" },
  desasignar: { label: "Eliminó asignación", color: "bg-red-100 text-red-700" },
  confirmar: { label: "Confirmó asistencia", color: "bg-green-100 text-green-700" },
  no_disponible: { label: "Marcó no disponible", color: "bg-slate-100 text-slate-700" },
  reemplazo_solicitado: { label: "Solicitó reemplazo", color: "bg-amber-100 text-amber-800" },
  reemplazo_aprobado: { label: "Reemplazo aprobado", color: "bg-emerald-100 text-emerald-700" },
  reemplazo_rechazado: { label: "Reemplazo rechazado", color: "bg-red-100 text-red-700" },
  reasignacion_auto: { label: "Reasignación automática", color: "bg-violet-100 text-violet-700" },
  asistencia: { label: "Registró asistencia", color: "bg-cyan-100 text-cyan-700" },
  bloqueo: { label: "Bloqueó modificaciones", color: "bg-slate-200 text-slate-800" },
};

export default function HistorialPanel({ eventoId }: { eventoId: string }) {
  const { data = [], isLoading } = useProgAuditByEvento(eventoId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Historial del evento</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> :
         data.length === 0 ? <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p> :
         <ol className="relative border-l border-border ml-2 space-y-3">
          {data.map((e) => {
            const meta = LABELS[e.action] || { label: e.action, color: "bg-muted text-foreground" };
            return (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(e.created_at), "Pp", { locale: es })}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  por <strong>{e.actor_nombre || "Sistema"}</strong>
                  {e.details?.persona_nombre && <> · {e.details.persona_nombre}</>}
                  {e.details?.ministerio_nombre && <> · {e.details.ministerio_nombre}</>}
                  {e.details?.cargo_nombre && <> · {e.details.cargo_nombre}</>}
                  {e.details?.motivo && <> · "{e.details.motivo}"</>}
                </div>
              </li>
            );
          })}
        </ol>}
      </CardContent>
    </Card>
  );
}
