import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { useUpdatePeticion } from "@/hooks/usePeticiones";
import { toast } from "sonner";
import { format } from "date-fns";

interface WhatsAppPeticionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  peticion: any | null;
}

export default function WhatsAppPeticionDialog({ open, onOpenChange, peticion }: WhatsAppPeticionDialogProps) {
  const { data: config } = useConfiguracion();
  const updatePeticion = useUpdatePeticion();
  const [mensaje, setMensaje] = useState("");

  const persona = peticion?.personas;
  const nombre = persona ? `${persona.nombres}`.trim() : "";
  const numero = persona?.whatsapp || persona?.telefono || null;
  const iglesia = config?.nombre_iglesia || "nuestra iglesia";

  useEffect(() => {
    if (peticion) {
      const plantilla = `Hola ${nombre || ""}, desde ${iglesia} estamos orando por tu petición: "${peticion.titulo}". Queremos saber cómo te encuentras y acompañarte en oración. Bendiciones.`;
      setMensaje(plantilla);
    }
  }, [peticion, nombre, iglesia]);

  const handleSend = async () => {
    if (!peticion || !numero) return;
    const url = buildWhatsAppUrl(numero, mensaje);
    if (!url) {
      toast.error("Número de WhatsApp inválido");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");

    // Registrar trazabilidad
    const fecha = format(new Date(), "dd/MM/yyyy");
    const nuevaNota = `[${fecha}] Contactado por WhatsApp`;
    const notas = peticion.notas_seguimiento ? `${peticion.notas_seguimiento}\n${nuevaNota}` : nuevaNota;
    const updates: any = { notas_seguimiento: notas };
    if (peticion.estado === "Pendiente") updates.estado = "En oración";

    try {
      await updatePeticion.mutateAsync({ id: peticion.id, ...updates });
      toast.success("WhatsApp abierto y seguimiento registrado");
    } catch (e) {
      // El usuario ya abrió WA; solo informar del registro
      toast.error("WhatsApp abierto, pero no se pudo registrar el seguimiento");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" /> Responder por WhatsApp
          </DialogTitle>
          <DialogDescription>
            {numero
              ? <>Se abrirá WhatsApp Web con el mensaje hacia <strong>{nombre || "la persona"}</strong> ({numero}).</>
              : <span className="text-destructive">La persona no tiene número de WhatsApp ni teléfono registrado.</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mensaje</label>
          <Textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={6}
            placeholder="Escribe el mensaje a enviar..."
          />
          <p className="text-xs text-muted-foreground">
            Puedes editar el mensaje antes de enviarlo. Se abrirá WhatsApp Web (o la app de WhatsApp) en una nueva pestaña.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={!numero || !mensaje.trim()}
            className="bg-success text-success-foreground hover:bg-success/90 gap-2"
          >
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
