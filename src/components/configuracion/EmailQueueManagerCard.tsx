import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Send, AlertTriangle, CheckCircle2, Clock, XCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface EmailLogItem {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

export default function EmailQueueManagerCard() {
  const queryClient = useQueryClient();
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["email-send-logs"],
    queryFn: async () => {
      let list: EmailLogItem[] = [];
      const { data, error } = await supabase.rpc("get_email_send_logs" as any, { p_limit: 100 });
      if (!error && data) {
        list = data as EmailLogItem[];
      } else {
        const { data: directData } = await (supabase as any)
          .from("email_send_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        list = (directData || []) as EmailLogItem[];
      }

      // Deduplicar registros con el mismo message_id prefiriendo el estado más reciente (evita mostrar 'pending' cuando ya fue 'sent')
      const map = new Map<string, EmailLogItem>();
      const unkeyed: EmailLogItem[] = [];

      for (const item of list) {
        if (!item.message_id) {
          unkeyed.push(item);
          continue;
        }
        const existing = map.get(item.message_id);
        if (!existing) {
          map.set(item.message_id, item);
        } else if (existing.status === "pending" && item.status !== "pending") {
          map.set(item.message_id, item);
        }
      }

      const deduplicated = Array.from(map.values()).concat(unkeyed);
      return deduplicated.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    refetchInterval: 15000,
  });

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      toast.error("Ingresa una dirección de correo para la prueba");
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          action: "send_test_email",
          email: testEmailAddress.trim(),
        },
      });

      if (error) throw new Error(error.message || "Error al invocar la función de prueba");
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || `Correo de prueba encolado para ${testEmailAddress}`);
      setTestEmailAddress("");
      queryClient.invalidateQueries({ queryKey: ["email-send-logs"] });
    } catch (err: any) {
      toast.error(err?.message || "Error al enviar correo de prueba");
    } finally {
      setSendingTest(false);
    }
  };

  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-email-queue");

      if (error) {
        // Si no hay token de service_role en cliente o da 401/403, informar adecuadamente
        if (error.status === 401 || error.status === 403) {
          toast.info("La cola de correo se procesa automáticamente en segundo plano por el servidor.");
        } else {
          throw new Error(error.message);
        }
      } else {
        toast.success(
          data?.processed !== undefined
            ? `Procesados ${data.processed} correo(s) de la cola.`
            : "Procesamiento de cola activado."
        );
      }
      queryClient.invalidateQueries({ queryKey: ["email-send-logs"] });
    } catch (err: any) {
      toast.error(err?.message || "Error al procesar la cola de correo");
    } finally {
      setProcessingQueue(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Enviado</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1"><Clock className="h-3 w-3 animate-spin" /> En cola</Badge>;
      case "rate_limited":
        return <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 gap-1"><AlertTriangle className="h-3 w-3" /> Límite de Tasa</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Fallido</Badge>;
      case "dlq":
        return <Badge variant="secondary" className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 gap-1"><AlertTriangle className="h-3 w-3" /> Reintentos agotados</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLogs = (logs || []).filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.recipient_email?.toLowerCase().includes(term) ||
      item.template_name?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term) ||
      item.error_message?.toLowerCase().includes(term)
    );
  });

  const totalCount = logs?.length || 0;
  const sentCount = logs?.filter((l) => l.status === "sent").length || 0;
  const pendingCount = logs?.filter((l) => l.status === "pending").length || 0;
  const failedCount = logs?.filter((l) => l.status === "failed" || l.status === "dlq" || l.status === "rate_limited").length || 0;

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Monitoreo y Diagnóstico de Correos Electrónicos
            </CardTitle>
            <CardDescription className="text-xs">
              Historial de envíos, auditoría de entrega y pruebas en tiempo real.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 text-xs gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleProcessQueue}
              disabled={processingQueue}
              className="h-8 text-xs gap-1"
            >
              <Play className="h-3.5 w-3.5 text-primary" />
              {processingQueue ? "Procesando..." : "Procesar Cola"}
            </Button>
          </div>
        </div>

        {/* Resumen KPI */}
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t">
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <span className="text-[11px] text-muted-foreground block">Total Registrados</span>
            <span className="text-sm font-semibold">{totalCount}</span>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">Enviados</span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{sentCount}</span>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-2 text-center">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 block">En Cola</span>
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{pendingCount}</span>
          </div>
          <div className="rounded-lg bg-destructive/10 p-2 text-center">
            <span className="text-[11px] text-destructive block">Con Error / Límite</span>
            <span className="text-sm font-semibold text-destructive">{failedCount}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Herramienta de Prueba de Envío */}
        <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
          <label className="text-xs font-medium block">Probar Envío de Correo Electrónico</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Escribe un correo de prueba (ej: destinatario@ejemplo.com)"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button
              size="sm"
              onClick={handleSendTestEmail}
              disabled={sendingTest}
              className="h-8 text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {sendingTest ? "Enviando..." : "Enviar Correo de Prueba"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Genera y encola un correo de prueba con plantilla HTML para validar la entrega en la bandeja del destinatario.
          </p>
        </div>

        {/* Buscador de registros */}
        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Buscar por correo destinatario, estado o asunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs max-w-sm"
          />
          <span className="text-xs text-muted-foreground">
            Mostrando {filteredLogs.length} de {totalCount} registros
          </span>
        </div>

        {/* Tabla de Historial */}
        <div className="border rounded-md overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 sticky top-0 border-b">
                <tr>
                  <th className="py-2 px-3 text-left font-medium">Destinatario</th>
                  <th className="py-2 px-3 text-left font-medium">Tipo / Asunto</th>
                  <th className="py-2 px-3 text-center font-medium">Estado</th>
                  <th className="py-2 px-3 text-left font-medium">Detalle / Error</th>
                  <th className="py-2 px-3 text-right font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Cargando historial de correos...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      {searchTerm ? "No hay registros que coincidan con la búsqueda." : "No se han registrado envíos de correo aún."}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium truncate max-w-[180px]" title={log.recipient_email}>
                        {log.recipient_email}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        <span className="font-medium text-foreground block">{log.template_name}</span>
                        {log.metadata?.subject && (
                          <span className="text-[11px] truncate block max-w-[200px]" title={log.metadata.subject}>
                            {log.metadata.subject}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-[11px] max-w-[220px]">
                        {log.error_message ? (
                          <span className="text-destructive font-mono truncate block" title={log.error_message}>
                            {log.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground whitespace-nowrap">
                        {log.created_at ? (
                          <span title={new Date(log.created_at).toLocaleString("es-CO")}>
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
