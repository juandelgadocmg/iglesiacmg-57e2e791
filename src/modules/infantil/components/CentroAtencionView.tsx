import { useState } from "react";
import { Search, Filter, AlertCircle, Clock, CheckCircle2, AlertTriangle, UserPlus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Mock data para la interfaz
const MOCK_SOLICITUDES = [
  {
    id: "1",
    nino_nombre: "Juan Pérez",
    grupo: "Párvulos (2-3 años)",
    maestro: "Ana Gómez",
    tipo: "Urgencia",
    estado: "Pendiente",
    hora: "10:45 AM",
    tiempo_transcurrido: "2 min",
    prioridad: "Alta",
    observacion: "Se golpeó la cabeza, necesita revisión inmediata."
  },
  {
    id: "2",
    nino_nombre: "María López",
    grupo: "Exploradores (4-5 años)",
    maestro: "Carlos Ruiz",
    tipo: "Acudiente",
    estado: "En atención",
    hora: "10:30 AM",
    tiempo_transcurrido: "17 min",
    prioridad: "Media",
    observacion: "Llora mucho y pregunta por su mamá."
  },
  {
    id: "3",
    nino_nombre: "Samuel Díaz",
    grupo: "Valientes (6-8 años)",
    maestro: "Laura Torres",
    tipo: "Baño",
    estado: "Atendido",
    hora: "09:15 AM",
    tiempo_transcurrido: "Cerrado",
    prioridad: "Baja",
    observacion: ""
  }
];

export default function CentroAtencionView() {
  const [activeTab, setActiveTab] = useState("pendientes");
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

  const getTipoIcon = (tipo: string) => {
    switch(tipo) {
      case 'Urgencia': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'Acudiente': return <UserPlus className="w-5 h-5 text-purple-500" />;
      case 'Baño': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    if (prioridad === 'Alta') return 'bg-red-100 text-red-700 border-red-200';
    if (prioridad === 'Media') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const renderSolicitudes = (estado: string) => {
    const filtradas = MOCK_SOLICITUDES.filter(s => s.estado.toLowerCase() === estado.toLowerCase());
    
    if (filtradas.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No hay solicitudes en este estado.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map(solicitud => (
          <Card 
            key={solicitud.id} 
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${solicitud.prioridad === 'Alta' ? 'border-red-200 bg-red-50/30' : ''}`}
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
            
            <h3 className="font-bold text-lg leading-tight">{solicitud.nino_nombre}</h3>
            <p className="text-sm text-muted-foreground mb-3">{solicitud.grupo}</p>
            
            <div className="text-xs bg-muted/50 p-2 rounded-md">
              <span className="font-semibold">Maestro:</span> {solicitud.maestro}
              {solicitud.observacion && (
                <p className="mt-1 text-muted-foreground italic line-clamp-2">"{solicitud.observacion}"</p>
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
            <Input placeholder="Buscar niño o maestro..." className="pl-9 w-full sm:w-64" />
          </div>
          <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pendientes">Pendientes (1)</TabsTrigger>
          <TabsTrigger value="en-atencion">En Atención (1)</TabsTrigger>
          <TabsTrigger value="atendido">Cerradas (1)</TabsTrigger>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCase && getTipoIcon(selectedCase.tipo)}
              Detalle de Solicitud
            </DialogTitle>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-start bg-muted/30 p-4 rounded-lg">
                <div>
                  <h3 className="font-bold text-xl">{selectedCase.nino_nombre}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.grupo}</p>
                </div>
                <Badge variant="outline" className={getPrioridadColor(selectedCase.prioridad)}>
                  {selectedCase.estado}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Reportado por:</span>
                  <span className="font-medium">{selectedCase.maestro}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Hora de solicitud:</span>
                  <span className="font-medium">{selectedCase.hora} ({selectedCase.tiempo_transcurrido})</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Observaciones del maestro:</span>
                <p className="p-3 bg-muted rounded-md text-sm">{selectedCase.observacion || 'Ninguna observación registrada.'}</p>
              </div>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                {selectedCase.estado === 'Pendiente' && (
                  <Button className="w-full sm:w-auto" onClick={() => setSelectedCase({...selectedCase, estado: 'En atención'})}>
                    Tomar Caso
                  </Button>
                )}
                
                {selectedCase.estado !== 'Atendido' && (
                  <>
                    <Button variant="secondary" className="w-full sm:w-auto gap-2" onClick={() => setNotifyModalOpen(true)}>
                      <MessageSquare className="w-4 h-4" /> Notificar Acudiente
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto border-green-200 text-green-700 hover:bg-green-50" onClick={() => setSelectedCase(null)}>
                      Marcar como Atendido
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Notificación */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensaje a Acudiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Plantilla:</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">Malestar</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">General</Badge>
                <Badge variant="outline" className="cursor-pointer bg-red-50 text-red-700 border-red-200">Urgente</Badge>
              </div>
            </div>
            <Textarea 
              className="min-h-[120px]" 
              defaultValue={`Hola. Necesitamos la presencia del acudiente de ${selectedCase?.nino_nombre || 'el niño'} en Iglesia Infantil lo antes posible. Por favor acércate al área correspondiente.`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setNotifyModalOpen(false)}>Enviar Notificación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
