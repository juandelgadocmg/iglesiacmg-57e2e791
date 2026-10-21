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
import { useCreateInfantilAtencion, useInfantilAcudientes } from "@/hooks/useInfantil";
import { toast } from "sonner";
import { Phone, MessageCircle } from "lucide-react";

export default function PanelMaestroView() {
  const { ninos, isLoading } = useNinos();
  const createAtencion = useCreateInfantilAtencion();
  const { data: acudientes } = useInfantilAcudientes();

  const [selectedNino, setSelectedNino] = useState<Nino | null>(null);
  const [requestType, setRequestType] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [temperatura, setTemperatura] = useState("");

  const handleAction = (tipo: string) => {
    setRequestType(tipo);
  };

  // Buscar el acudiente asociado al niño seleccionado
  const acudienteInfo = selectedNino ? (() => {
    const rels = ((acudientes || []) as any[]).filter((a: any) => a.nino_id === selectedNino.id);
    const rel = rels.find((a: any) => a.es_principal) || rels[0];
    const rawPhone = rel?.acudiente?.whatsapp || rel?.acudiente?.telefono || selectedNino.detalles?.contacto_emergencia || selectedNino.telefono || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const waPhone = cleanPhone.length === 10 && cleanPhone.startsWith("3") ? `57${cleanPhone}` : cleanPhone;
    return {
      nombre: rel?.acudiente ? `${rel.acudiente.nombres} ${rel.acudiente.apellidos}`.trim() : (selectedNino.detalles?.contacto_emergencia ? "Contacto registrado" : "Acudiente"),
      relacion: rel?.relacion || "Acudiente",
      telefono: rawPhone,
      waPhone: waPhone
    };
  })() : null;

  const handleNotifyWhatsApp = () => {
    if (!acudienteInfo?.waPhone) {
      toast.error("No hay un número de teléfono o WhatsApp registrado para este niño");
      return;
    }
    const msg = `Hola ${acudienteInfo.nombre}. Te escribimos desde la Iglesia Infantil respecto a ${selectedNino?.nombres}: ${requestType || "Atención requerida"}${observacion ? ` (${observacion})` : ""}. Por favor acércate al salón de clases infantil o comunícate con nosotros. Bendiciones.`;
    window.open(`https://wa.me/${acudienteInfo.waPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const submitRequest = async () => {
    if (!selectedNino || !requestType) return;

    try {
      await createAtencion.mutateAsync({
        nino_id: selectedNino.id,
        tipo_solicitud: requestType,
        prioridad: requestType === "Urgencia" ? "Urgente" : "Normal",
        observaciones: observacion || undefined,
        temperatura: temperatura ? parseFloat(temperatura) : null,
        necesita_acudiente: requestType === "Acudiente" || requestType === "Urgencia",
        nino_info: { nombres: selectedNino.nombres, apellidos: selectedNino.apellidos }
      });

      toast.success("Solicitud enviada al Centro de Atención", {
        description: `Se registró la alerta de ${selectedNino.nombres}.`
      });

      // Si requiere acudiente y tiene teléfono, ofrecer abrir WhatsApp
      if ((requestType === "Acudiente" || requestType === "Urgencia" || requestType === "Malestar") && acudienteInfo?.waPhone) {
        handleNotifyWhatsApp();
      }

      setSelectedNino(null);
      setRequestType(null);
      setObservacion("");
      setTemperatura("");
    } catch (err: any) {
      toast.error("Atención registrada en panel local: " + (err.message || "Guardado"));
      setSelectedNino(null);
      setRequestType(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mi Panel de Clase</h2>
        <p className="text-muted-foreground">Supervisa a los niños asignados y solicita asistencia rápida.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Cargando niños de la clase...</p>
      ) : (ninos || []).length === 0 ? (
        <div className="p-8 text-center text-slate-400 border-2 border-dashed rounded-2xl">
          <p>No hay niños registrados en el sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ninos?.map((nino) => (
            <Card key={nino.id} className="p-4 flex items-center justify-between border-l-4 border-l-blue-500 rounded-2xl shadow-sm">
              <div className="flex gap-3 items-center min-w-0 pr-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  {nino.foto_url ? (
                    <img src={nino.foto_url} alt="Foto" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    nino.nombres?.[0] || <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{nino.nombres} {nino.apellidos}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-200">
                      En Clase
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="default" 
                size="sm" 
                className="gap-2 shrink-0 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
                onClick={() => setSelectedNino(nino)}
              >
                <BellRing className="w-4 h-4" />
                Atención
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DE ATENCIÓN */}
      <Dialog open={!!selectedNino} onOpenChange={(open) => !open && setSelectedNino(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">¿Qué necesita {selectedNino?.nombres}?</DialogTitle>
          </DialogHeader>
          
          {!requestType ? (
            <div className="grid grid-cols-2 gap-3 py-4">
              <Button variant="outline" className="h-24 flex-col gap-2 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all rounded-xl" onClick={() => handleAction('Baño')}>
                <Bath className="w-8 h-8 text-blue-600" />
                <span className="whitespace-normal text-center leading-tight font-medium">Ir al baño</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all rounded-xl" onClick={() => handleAction('Acudiente')}>
                <UserPlus className="w-8 h-8 text-purple-600" />
                <span className="whitespace-normal text-center leading-tight font-medium">Necesita acudiente</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 transition-all rounded-xl" onClick={() => handleAction('Malestar')}>
                <Frown className="w-8 h-8 text-orange-600" />
                <span className="whitespace-normal text-center leading-tight font-medium">Se siente mal</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all rounded-xl" onClick={() => handleAction('Comportamiento')}>
                <Flame className="w-8 h-8 text-amber-600" />
                <span className="whitespace-normal text-center leading-tight font-medium">Comportamiento</span>
              </Button>

              <Button variant="outline" className="h-24 flex-col gap-2 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all border-red-200 rounded-xl" onClick={() => handleAction('Urgencia')}>
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <span className="whitespace-normal text-center leading-tight font-bold text-red-700">Urgencia</span>
              </Button>
              
              <Button variant="outline" className="h-24 flex-col gap-2 bg-gray-50 hover:bg-gray-100 transition-all rounded-xl" onClick={() => handleAction('Otro')}>
                <MessageSquare className="w-8 h-8 text-gray-600" />
                <span className="whitespace-normal text-center leading-tight font-medium">Otro</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setRequestType(null)}>← Volver</Button>
                  <span className="font-bold text-navy">{requestType}</span>
                </div>
                {acudienteInfo?.waPhone && (
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleNotifyWhatsApp}
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </Button>
                )}
              </div>

              {/* Tarjeta de Acudiente si existe */}
              {acudienteInfo && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-900 block">{acudienteInfo.nombre} ({acudienteInfo.relacion})</span>
                    <span className="text-slate-500 font-mono">{acudienteInfo.telefono || "Sin teléfono registrado"}</span>
                  </div>
                  {acudienteInfo.telefono && (
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                        onClick={() => window.location.href = `tel:${acudienteInfo.telefono.replace(/\D/g, "")}`}
                      >
                        <Phone className="w-3.5 h-3.5 mr-1" />
                        Llamar
                      </Button>
                      {acudienteInfo.waPhone && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleNotifyWhatsApp}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          Chat
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Observación rápida (Opcional)</Label>
                <Textarea 
                  placeholder="Detalles adicionales sobre la situación..." 
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="resize-none rounded-xl"
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
                    className="rounded-xl"
                  />
                </div>
              )}

              <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => { setSelectedNino(null); setRequestType(null); }} className="rounded-xl">Cancelar</Button>
                <Button 
                  onClick={submitRequest} 
                  disabled={createAtencion.isPending}
                  className={`rounded-xl font-bold ${requestType === 'Urgencia' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {createAtencion.isPending ? "Enviando..." : "Enviar Solicitud"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
