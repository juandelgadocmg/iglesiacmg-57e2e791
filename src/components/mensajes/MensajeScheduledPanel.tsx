import { useScheduledMessages, useCancelScheduled } from "@/hooks/useMensajes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, X, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MensajeScheduledPanel() {
  const { data = [], isLoading } = useScheduledMessages();
  const cancel = useCancelScheduled();

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge variant="default" className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Enviado</Badge>;
    if (s === "failed") return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Fallido</Badge>;
    if (s === "cancelled") return <Badge variant="secondary">Cancelado</Badge>;
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Mensajes programados</h3>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> :
         data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No hay mensajes programados</div> :
         data.map((s: any) => (
          <div key={s.id} className="p-3 border-b text-sm">
            <div className="flex items-center gap-2 mb-1">
              {statusBadge(s.status)}
              <span className="font-medium truncate">{s.subject}</span>
              <span className="ml-auto text-xs text-muted-foreground">{format(new Date(s.scheduled_for), "PPp", { locale: es })}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Destino: <strong>{s.scope_type}</strong> {s.scope_ref ? `(${s.scope_ref.slice(0, 8)}…)` : ""} {s.semestre ? `· Semestre ${s.semestre}` : ""}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{s.body}</div>
            {s.error && <div className="text-xs text-destructive mt-1">⚠ {s.error}</div>}
            {s.status === "pending" && (
              <Button size="sm" variant="ghost" className="mt-1 h-7" onClick={() => cancel.mutate(s.id)}>
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
