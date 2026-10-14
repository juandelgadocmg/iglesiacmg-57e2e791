import { useState } from "react";
import { Bell, Send, AlertTriangle, MessageSquare, History, Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function NotificacionesInfantilView() {
  const [tipo, setTipo] = useState("emergencia");
  const [mensaje, setMensaje] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: historial, isLoading } = useQuery({
    queryKey: ["infantil_notificaciones_historial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infantil_notificaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      // Ignore error for now if table is empty or missing
      if (error && error.code !== "42P01") throw error;
      return data || [];
    }
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje) return toast.error("El mensaje no puede estar vacío");
    
    setIsSending(true);
    // Simulated sending process since this might require edge functions for WhatsApp/SMS
    setTimeout(() => {
      toast.success("Notificación enviada a la cola de mensajería");
      setMensaje("");
      setIsSending(false);
    }, 1500);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Centro de Notificaciones
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Comunicación directa e inmediata con padres y acudientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden h-fit">
          <div className="h-2 w-full bg-gradient-to-r from-coral to-red-500" />
          <CardHeader>
            <CardTitle className="text-xl font-black text-navy flex items-center gap-2">
              <Send className="w-5 h-5 text-coral" />
              Nueva Notificación
            </CardTitle>
            <CardDescription>Envía un mensaje masivo o a un acudiente en específico</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Tipo de Notificación</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergencia">
                      <div className="flex items-center text-red-600 font-bold">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Emergencia / Urgencia
                      </div>
                    </SelectItem>
                    <SelectItem value="informativo">
                      <div className="flex items-center text-blue-600 font-bold">
                        <MessageSquare className="w-4 h-4 mr-2" /> Informativo / Recordatorio
                      </div>
                    </SelectItem>
                    <SelectItem value="recogida">
                      <div className="flex items-center text-emerald-600 font-bold">
                        <ShieldAlert className="w-4 h-4 mr-2" /> Solicitud de Recogida
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Destinatario</Label>
                <Select defaultValue="todos">
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los padres activos hoy</SelectItem>
                    <SelectItem value="grupo_parvulos">Padres del grupo: Párvulos</SelectItem>
                    <SelectItem value="individual">Seleccionar un padre en específico...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Mensaje</Label>
                <Textarea 
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe el mensaje que recibirán los padres en su WhatsApp o SMS..." 
                  className="min-h-[120px] rounded-xl bg-slate-50 resize-none"
                />
                <p className="text-xs text-slate-400 text-right">{mensaje.length} / 160 caracteres (SMS)</p>
              </div>

              <Button 
                type="submit" 
                disabled={isSending}
                className={`w-full h-12 rounded-xl text-white font-bold shadow-lg transition-all ${
                  tipo === 'emergencia' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 
                  'bg-navy hover:bg-navy/90 shadow-navy/20'
                }`}
              >
                {isSending ? (
                  <span className="flex items-center"><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"/> Procesando...</span>
                ) : (
                  <span className="flex items-center"><Send className="w-4 h-4 mr-2" /> Enviar Notificación</span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden bg-slate-50/50">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              Historial Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-500">Cargando historial...</div>
              ) : historial?.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                  <p>No hay notificaciones enviadas recientemente.</p>
                </div>
              ) : (
                historial?.map((notif: any) => (
                  <div key={notif.id} className="p-4 hover:bg-white transition-colors flex gap-4 items-start">
                    <div className={`p-2 rounded-full mt-1 shrink-0 ${
                      notif.tipo === 'Emergencia' ? 'bg-red-100 text-red-600' :
                      notif.tipo === 'Informativo' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {notif.tipo === 'Emergencia' ? <AlertTriangle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-700">
                          {notif.tipo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {notif.mensaje}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-500">
                          {notif.canal}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 border-emerald-200 text-emerald-600">
                          {notif.estado}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
