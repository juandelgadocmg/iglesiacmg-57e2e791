import { useState, useMemo } from "react";
import { Search, Filter, AlertCircle, Clock, CheckCircle2, AlertTriangle, UserPlus, MessageSquare, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useInfantilAcudientes, useInfantilAtenciones, useUpdateInfantilAtencion } from "@/hooks/useInfantil";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const normalizeName = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Convierte un teléfono a formato wa.me (solo dígitos, con indicativo 57 si es un celular colombiano de 10 dígitos). */
const toWhatsAppNumber = (phone: string) => {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) digits = "57" + digits;
  return digits;
};

export default function CentroAtencionView() {
  const [activeTab, setActiveTab] = useState("pendientes");
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [acudienteTelefono, setAcudienteTelefono] = useState("");
  const [acudienteNombre, setAcudienteNombre] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: atencionesDb, isLoading } = useInfantilAtenciones();
  const updateAtencion = useUpdateInfantilAtencion();
  const { data: acudientes } = useInfantilAcudientes();

  // Consolidar solicitudes reales de la base de datos
  const solicitudes = useMemo(() => {
    return (atencionesDb || []).map((a: any) => {
      let tiempoStr = "Ahora";
      try {
        if (a.hora_creacion) {
          tiempoStr = formatDistanceToNow(new Date(a.hora_creacion), { addSuffix: true, locale: es });
        }
      } catch {}

      return {
        id: a.id,
        nino_id: a.nino_id,
        nino_nombre: a.nino ? `${a.nino.nombres} ${a.nino.apellidos}` : "Niño",
        grupo: a.grupo_nombre || "Clase Infantil",
        maestro: a.maestro ? `${a.maestro.nombres} ${a.maestro.apellidos}` : "Maestro",
        tipo: a.tipo_solicitud || "Atención",
        estado: a.estado || "Pendiente",
        hora: a.hora_creacion ? new Date(a.hora_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        tiempo_transcurrido: tiempoStr,
        prioridad: a.prioridad || "Normal",
        observacion: a.observaciones || a.sintomas || ""
      };
    });
  }, [atencionesDb]);

  const filtradasPorBusqueda = useMemo(() => {
    if (!searchTerm.trim()) return solicitudes;
    const q = searchTerm.toLowerCase().trim();
    return solicitudes.filter(s =>
      s.nino_nombre.toLowerCase().includes(q) ||
      s.maestro.toLowerCase().includes(q) ||
      s.tipo.toLowerCase().includes(q)
    );
  }, [solicitudes, searchTerm]);

  const pendientesCount = useMemo(() => solicitudes.filter(s => s.estado === 'Pendiente').length, [solicitudes]);
  const enAtencionCount = useMemo(() => solicitudes.filter(s => s.estado === 'En atención').length, [solicitudes]);
  const atendidasCount = useMemo(() => solicitudes.filter(s => s.estado === 'Atendido' || s.estado === 'Cerrada').length, [solicitudes]);

  /** Busca el acudiente (principal primero) del niño del caso para precargar su WhatsApp. */
  const openNotify = (caso: any) => {
    const nombre = normalizeName(caso?.nino_nombre);
    const rels = (acudientes || []).filter((a: any) =>
      (caso?.nino_id && a.nino_id === caso.nino_id) ||
      normalizeName(`${a.nino?.nombres ?? ""} ${a.nino?.apellidos ?? ""}`) === nombre
    );
    const rel = rels.find((a: any) => a.es_principal) || rels[0];
    setAcudienteTelefono(rel?.acudiente?.whatsapp || rel?.acudiente?.telefono || "");
    setAcudienteNombre(rel ? `${rel.acudiente?.nombres ?? ""} ${rel.acudiente?.apellidos ?? ""}`.trim() : "");
    setWhatsappMessage(`Hola. Necesitamos la presencia del acudiente de ${caso?.nino_nombre || 'el niño'} en Iglesia Infantil lo antes posible. Por favor acércate al área correspondiente.`);
    setNotifyModalOpen(true);
  };

  const sendWhatsApp = () => {
    const number = toWhatsAppNumber(acudienteTelefono);
    if (number.length < 8) {
      toast.error("Ingresa un número de WhatsApp válido del acudiente.");
      return;
    }
    if (!whatsappMessage.trim()) {
      toast.error("Escribe el mensaje a enviar.");
      return;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`, "_blank", "noopener");
    setNotifyModalOpen(false);
  };

  const handleTomarCaso = async (caso: any) => {
    try {
      await updateAtencion.mutateAsync({
        id: caso.id,
        estado: "En atención",
        hora_atencion: new Date().toISOString()
      });
      toast.success("Caso tomado en atención");
      setSelectedCase(null);
    } catch (err: any) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleCerrarCaso = async (caso: any) => {
    try {
      await updateAtencion.mutateAsync({
        id: caso.id,
        estado: "Atendido",
        hora_cierre: new Date().toISOString()
      });
      toast.success("✓ Caso marcado como atendido");
      setSelectedCase(null);
    } catch (err: any) {
      toast.error("Error al cerrar caso");
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch(tipo) {
      case 'Urgencia': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'Acudiente': return <UserPlus className="w-5 h-5 text-purple-500" />;
      case 'Baño': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    if (prioridad === 'Alta' || prioridad === 'Urgente') return 'bg-red-100 text-red-700 border-red-200';
    if (prioridad === 'Media' || prioridad === 'Prioritaria') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const renderSolicitudes = (estado: string) => {
    const filtradas = filtradasPorBusqueda.filter(s => {
      if (estado === 'Pendiente') return s.estado === 'Pendiente';
      if (estado === 'En atención') return s.estado === 'En atención';
      return s.estado === 'Atendido' || s.estado === 'Cerrada';
    });
    
    if (filtradas.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-white/50">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">No hay solicitudes en este estado.</p>
          <p className="text-xs text-slate-400 mt-1">Cuando un maestro reporte una novedad en su panel, aparecerá aquí.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map(solicitud => (
          <Card 
            key={solicitud.id} 
            className={`p-4 cursor-pointer transition-all hover:shadow-md rounded-2xl ${
              solicitud.prioridad === 'Alta' || solicitud.prioridad === 'Urgente'
                ? 'border-red-200 bg-red-50/30'
                : 'border-slate-200 bg-white'
            }`}
            onClick={() => setSelectedCase(solicitud)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                {getTipoIcon(solicitud.tipo)}
                <Badge variant="outline" className={getPrioridadColor(solicitud.prioridad)}>
                  {solicitud.tipo}
                </Badge>
              </div>
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <Clock className="w-3 h-3" />
                {solicitud.tiempo_transcurrido}
              </div>
            </div>
            
            <h3 className="font-bold text-lg leading-tight text-navy">{solicitud.nino_nombre}</h3>
            <p className="text-xs text-muted-foreground mb-3">{solicitud.grupo}</p>
            
            <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700">Maestro:</span> {solicitud.maestro}
              {solicitud.observacion && (
                <p className="mt-1 text-slate-600 italic line-clamp-2">"{solicitud.observacion}"</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centro de Atención</h2>
          <p className="text-muted-foreground">Gestiona las solicitudes de los maestros en tiempo real.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar niño o maestro..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-64 rounded-xl" 
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-200/70 p-1 rounded-xl">
          <TabsTrigger value="pendientes" className="rounded-lg font-bold text-xs">
            Pendientes ({pendientesCount})
          </TabsTrigger>
          <TabsTrigger value="en-atencion" className="rounded-lg font-bold text-xs">
            En Atención ({enAtencionCount})
          </TabsTrigger>
          <TabsTrigger value="atendido" className="rounded-lg font-bold text-xs">
            Cerradas ({atendidasCount})
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="pendientes" className="m-0">
            {renderSolicitudes('Pendiente')}
          </TabsContent>
          <TabsContent value="en-atencion" className="m-0">
            {renderSolicitudes('En atención')}
          </TabsContent>
          <TabsContent value="atendido" className="m-0">
            {renderSolicitudes('Atendido')}
          </TabsContent>
        </div>
      </Tabs>

      {/* Modal de Detalle de Caso */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCase && getTipoIcon(selectedCase.tipo)}
              Detalle de Solicitud
            </DialogTitle>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <h3 className="font-bold text-xl text-navy">{selectedCase.nino_nombre}</h3>
                  <p className="text-sm text-slate-500">{selectedCase.grupo}</p>
                </div>
                <Badge variant="outline" className={getPrioridadColor(selectedCase.prioridad)}>
                  {selectedCase.estado}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Reportado por:</span>
                  <span className="font-semibold text-slate-800">{selectedCase.maestro}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Hora de solicitud:</span>
                  <span className="font-semibold text-slate-800">{selectedCase.hora || selectedCase.tiempo_transcurrido}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Observaciones del maestro:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-sm border border-slate-100">{selectedCase.observacion || 'Ninguna observación registrada.'}</p>
              </div>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                {selectedCase.estado === 'Pendiente' && (
                  <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold" onClick={() => handleTomarCaso(selectedCase)}>
                    Tomar Caso
                  </Button>
                )}
                
                {selectedCase.estado !== 'Atendido' && selectedCase.estado !== 'Cerrada' && (
                  <>
                    <Button variant="secondary" className="w-full sm:w-auto gap-2 rounded-xl" onClick={() => openNotify(selectedCase)}>
                      <MessageSquare className="w-4 h-4" /> Notificar Acudiente
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold" onClick={() => handleCerrarCaso(selectedCase)}>
                      Marcar como Atendido
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Notificación WhatsApp */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Mensaje a Acudiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">WhatsApp del acudiente{acudienteNombre ? ` (${acudienteNombre})` : ""}:</span>
              <Input
                type="tel"
                placeholder="Ej. 300 123 4567"
                value={acudienteTelefono}
                onChange={(e) => setAcudienteTelefono(e.target.value)}
                className="rounded-xl"
              />
              {!acudienteNombre && (
                <p className="text-xs text-muted-foreground">No hay acudiente vinculado a este niño. Escribe el número manualmente o vincúlalo en "Padres y acudientes".</p>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Plantilla:</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setWhatsappMessage(`Hola. El niño/a ${selectedCase?.nino_nombre || ''} presenta un malestar. Por favor acércate al área de Iglesia Infantil.`)}>Malestar</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setWhatsappMessage(`Hola. Necesitamos la presencia del acudiente de ${selectedCase?.nino_nombre || ''} en Iglesia Infantil lo antes posible.`)}>General</Badge>
                <Badge variant="outline" className="cursor-pointer bg-red-50 text-red-700 border-red-200" onClick={() => setWhatsappMessage(`¡URGENTE! Por favor acércate INMEDIATAMENTE al área de Iglesia Infantil por ${selectedCase?.nino_nombre || ''}.`)}>Urgente</Badge>
              </div>
            </div>
            <Textarea 
              className="min-h-[120px] rounded-xl" 
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyModalOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl font-bold" onClick={sendWhatsApp}>
              <MessageSquare className="w-4 h-4" /> Abrir en WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
