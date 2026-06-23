import { useBulkSendLog } from "@/hooks/useMensajes";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MensajeAuditPanel() {
  const { data = [], isLoading } = useBulkSendLog();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Auditoría de envíos masivos</h3>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> :
         data.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Sin envíos masivos registrados</div> :
         data.map((r: any) => (
          <div key={r.id} className="p-3 border-b text-sm">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{r.scope_type}</Badge>
              <span className="font-medium truncate">{r.subject || "(sin asunto)"}</span>
              <span className="ml-auto text-xs text-muted-foreground">{format(new Date(r.created_at), "Pp", { locale: es })}</span>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
              <span>Remitente: <strong>{r.sender_display || "—"}</strong></span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.recipients_count} destinatarios</span>
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {r.threads_created} hilo(s)</span>
              {r.threads_failed > 0 && <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {r.threads_failed} fallido(s)</span>}
            </div>
            {r.body_preview && <div className="text-xs text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">{r.body_preview}</div>}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
