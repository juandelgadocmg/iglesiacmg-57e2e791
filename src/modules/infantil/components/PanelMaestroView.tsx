import { useState } from "react";
import { User, BellRing, Bath, UserPlus, Frown, AlertTriangle, MessageSquare, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNinos, Nino } from "../hooks/useNinos";

export default function PanelMaestroView() {
  const { ninos, isLoading } = useNinos();
  const [selectedNino, setSelectedNino] = useState<Nino | null>(null);
  const [requestType, setRequestType] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [temperatura, setTemperatura] = useState("");

  const handleAction = (tipo: string) => {
    setRequestType(tipo);
  };

  const submitRequest = () => {
    // Aquí irá la llamada a supabase para insertar en infantil_atenciones
    console.log("Creando atención para", selectedNino?.nombres, "Tipo:", requestType);
    setSelectedNino(null);
    setRequestType(null);
    setObservacion("");
    setTemperatura("");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mi Panel de Clase</h2>
        <p className="text-muted-foreground">Supervisa a los niños asignados y solicita asistencia rápida.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ninos?.map((nino) => (
          <Card key={nino.id} className="p-4 flex items-center justify-between border-l-4 border-l-blue-500">
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                {nino.foto_url ? (
                  <img src={nino.foto_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{nino.nombres} {nino.apellidos}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-200">
                    Presente
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">En clase</span>
                </div>
              </div>
            </div>
            
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => setSelectedNino(nino)}
            >
              <BellRing className="w-4 h-4" />
              Atención
            </Button>
          </Card>
        ))}
      </div>

      {/* MODAL DE ATENCIÓN */}
      <Dialog open={!!selectedNino} onOpenChange={(open) => !open && setSelectedNino(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">¿Qué necesita {selectedNino?.nombres}?</DialogTitle>
          </DialogHeader>
          
          {!requestType ? (
            <div className="grid grid-cols-2 gap-3 py-4">
              <Button variant="outline" className="h-24 flex-col gap-2 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all" onClick={() => handleAction('Baño')}>
                <Bath className="w-8 h-8 text-blue-600" />
                <span className="whitespace-normal text-center leading-tight">Ir al baño</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all" onClick={() => handleAction('Acudiente')}>
                <UserPlus className="w-8 h-8 text-purple-600" />
                <span className="whitespace-normal text-center leading-tight">Necesita acudiente</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 transition-all" onClick={() => handleAction('Malestar')}>
                <Frown className="w-8 h-8 text-orange-600" />
                <span className="whitespace-normal text-center leading-tight">Se siente mal</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all" onClick={() => handleAction('Comportamiento')}>
                <Flame className="w-8 h-8 text-amber-600" />
                <span className="whitespace-normal text-center leading-tight">Comportamiento</span>
              </Button>

              <Button variant="outline" className="h-24 flex-col gap-2 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all border-red-200" onClick={() => handleAction('Urgencia')}>
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <span className="whitespace-normal text-center leading-tight font-bold text-red-700">Urgencia</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-gray-50 hover:bg-gray-100 transition-all" onClick={() => handleAction('Otro')}>
                <MessageSquare className="w-8 h-8 text-gray-600" />
                <span className="whitespace-normal text-center leading-tight">Otro</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Button variant="ghost" size="sm" onClick={() => setRequestType(null)}>← Volver</Button>
                <span className="font-semibold">{requestType}</span>
              </div>

              <div className="space-y-2">
                <Label>Observación rápida (Opcional)</Label>
                <Textarea 
                  placeholder="Detalles adicionales sobre la situación..." 
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              {requestType === 'Malestar' && (
                <div className="space-y-2">
                  <Label>Temperatura (Opcional)</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    placeholder="Ej. 37.5"
                    value={temperatura}
                    onChange={(e) => setTemperatura(e.target.value)}
                  />
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => { setSelectedNino(null); setRequestType(null); }}>Cancelar</Button>
                <Button onClick={submitRequest} className={requestType === 'Urgencia' ? 'bg-red-600 hover:bg-red-700' : ''}>
                  Enviar Solicitud
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
