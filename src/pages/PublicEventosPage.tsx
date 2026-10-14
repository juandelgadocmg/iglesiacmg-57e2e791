import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import doxaWordmarkNavy from "@/assets/doxa-wordmark-navy.png";
import { usePublicEventos, useRegisterPublicEvent } from "@/hooks/usePublicEventos";
import { MapPin, Calendar, Clock, Ticket, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PublicEventosPage() {
  const { data: eventos, isLoading } = usePublicEventos();
  const registerEvent = useRegisterPublicEvent();
  
  const [selectedEvento, setSelectedEvento] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    documento: "",
  });

  const handleOpenModal = (evento: any) => {
    setSelectedEvento(evento);
    setIsSuccess(false);
    setFormData({ nombre: "", apellidos: "", email: "", telefono: "", documento: "" });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.apellidos || !formData.telefono) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    try {
      await registerEvent.mutateAsync({
        evento_id: selectedEvento.id,
        ...formData
      });
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Error al procesar tu inscripción");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <Link to="/" className="flex items-center gap-2">
            <img src={doxaWordmarkNavy} alt="DOXA" className="h-6" />
            <span className="text-xl font-bold text-navy hidden sm:inline-block">· Portal de Eventos</span>
          </Link>
          <div className="flex gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-navy hidden sm:inline-block pt-2">
              Soy miembro
            </Link>
            <Button variant="outline" size="sm" asChild className="rounded-full">
              <Link to="/">Volver al Inicio</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-navy py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <Badge className="bg-coral/20 text-coral hover:bg-coral/30 mb-4 border-coral/30 px-3 py-1">
            Agenda Pública
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Próximos Eventos
          </h1>
          <p className="text-lg text-slate-300">
            Descubre y regístrate en las actividades abiertas de nuestra comunidad. ¡Te esperamos!
          </p>
        </div>
      </section>

      {/* EVENT LIST */}
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-navy/50" />
          </div>
        ) : !eventos || eventos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border shadow-sm">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">No hay eventos próximos</h3>
            <p className="text-slate-500 mt-2">Mantente atento a nuestras redes sociales para nuevas fechas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                <div className="h-2 w-full bg-gradient-to-r from-navy to-coral" />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                      {e.estado}
                    </Badge>
                    {e.cupos && (
                      <Badge variant="outline" className="text-xs">
                        Cupo limitado
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-2 line-clamp-2 group-hover:text-coral transition-colors">
                    {e.nombre}
                  </h3>
                  
                  {e.descripcion && (
                    <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1">
                      {e.descripcion}
                    </p>
                  )}

                  <div className="space-y-3 mt-auto pt-4 border-t border-slate-100 text-sm text-slate-600">
                    {e.fecha_inicio && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <span>{format(new Date(e.fecha_inicio), "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
                      </div>
                    )}
                    {e.fecha_inicio && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{format(new Date(e.fecha_inicio), "h:mm a")}</span>
                      </div>
                    )}
                    {e.lugar && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{e.lugar}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full mt-6 bg-navy hover:bg-navy/90 text-white rounded-xl"
                    onClick={() => handleOpenModal(e)}
                  >
                    Inscribirme ahora <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* REGISTRATION MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden bg-white shadow-2xl rounded-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-navy to-coral" />
          <div className="p-6">
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Ticket className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-navy mb-2">¡Inscripción Exitosa!</h3>
                <p className="text-slate-600 mb-8">
                  Te has registrado correctamente en <strong>{selectedEvento?.nombre}</strong>. 
                  Te esperamos.
                </p>
                <Button className="w-full rounded-xl bg-navy" onClick={() => setIsModalOpen(false)}>
                  Cerrar
                </Button>
              </div>
            ) : (
              <>
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold text-navy">Inscripción</DialogTitle>
                  <DialogDescription className="text-base text-slate-500">
                    Completa tus datos para registrarte en <span className="font-semibold text-slate-800">{selectedEvento?.nombre}</span>
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombres *</Label>
                      <Input 
                        id="nombre" 
                        required 
                        value={formData.nombre} 
                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                        className="rounded-xl border-slate-200 focus-visible:ring-navy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellidos">Apellidos *</Label>
                      <Input 
                        id="apellidos" 
                        required 
                        value={formData.apellidos} 
                        onChange={e => setFormData({...formData, apellidos: e.target.value})}
                        className="rounded-xl border-slate-200 focus-visible:ring-navy"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">WhatsApp / Teléfono *</Label>
                    <Input 
                      id="telefono" 
                      type="tel"
                      required 
                      value={formData.telefono} 
                      onChange={e => setFormData({...formData, telefono: e.target.value})}
                      className="rounded-xl border-slate-200 focus-visible:ring-navy"
                      placeholder="+57 300 000 0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico (Opcional)</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="rounded-xl border-slate-200 focus-visible:ring-navy"
                      placeholder="tucorreo@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documento">Documento de Identidad (Opcional)</Label>
                    <Input 
                      id="documento" 
                      value={formData.documento} 
                      onChange={e => setFormData({...formData, documento: e.target.value})}
                      className="rounded-xl border-slate-200 focus-visible:ring-navy"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-coral hover:bg-coral/90 text-white rounded-xl h-12 text-base font-semibold"
                      disabled={registerEvent.isPending}
                    >
                      {registerEvent.isPending ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
                      ) : (
                        "Confirmar Inscripción"
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
