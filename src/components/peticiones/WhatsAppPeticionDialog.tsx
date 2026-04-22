import { useState, useEffect } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, ExternalLink } from "lucide-react";
import { buildWhatsAppUrl, normalizePhone } from "@/lib/whatsapp";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const persona = peticion?.personas;
  const nombre = persona ? `${persona.nombres}`.trim() : "";
  const numero = persona?.whatsapp || persona?.telefono || null;
  const numeroFormateado = normalizePhone(numero);
  const iglesia = config?.nombre_iglesia || "nuestra iglesia";

  useEffect(() => {
    if (peticion) {
      const plantilla = `Hola ${nombre || ""}, desde ${iglesia} estamos orando por tu petición: "${peticion.titulo}". Queremos saber cómo te encuentras y acompañarte en oración. Bendiciones.`;
      setMensaje(plantilla);
    }
  }, [peticion, nombre, iglesia]);

  const proceedSend = async () => {
    if (!peticion || !numero) return;
    const url = buildWhatsAppUrl(numero, mensaje);
    if (!url) {
      toast.error("Número de WhatsApp inválido");
      return;
    }

    // Abrir WhatsApp en nueva pestaña
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      toast.error("Tu navegador bloqueó la ventana emergente. Habilítalas para wa.me e inténtalo de nuevo.");
      return;
    }

    // Registrar trazabilidad SOLO cuando el usuario confirma
    const fecha = format(new Date(), "dd/MM/yyyy");
    const nuevaNota = `[${fecha}] Contactado por WhatsApp`;
    const notas = peticion.notas_seguimiento ? `${peticion.notas_seguimiento}\n${nuevaNota}` : nuevaNota;
    const updates: any = { notas_seguimiento: notas };
    if (peticion.estado === "Pendiente") updates.estado = "En oración";

    try {
      await updatePeticion.mutateAsync({ id: peticion.id, ...updates });
      toast.success("WhatsApp abierto y seguimiento registrado");
    } catch (e) {
      toast.error("WhatsApp abierto, pero no se pudo registrar el seguimiento");
    }
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" /> Responder por WhatsApp
            </DialogTitle>
            <DialogDescription>
              {numero
                ? <>Se abrirá WhatsApp Web con el mensaje hacia <strong>{nombre || "la persona"}</strong> (+{numeroFormateado}).</>
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
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!numero || !mensaje.trim()}
              className="bg-success text-success-foreground hover:bg-success/90 gap-2"
            >
              <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-success" /> Confirmar envío por WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Estás a punto de abrir <strong>WhatsApp Web</strong> con el mensaje hacia{" "}
                  <strong>{nombre || "la persona"}</strong> (+{numeroFormateado}).
                </p>
                <p>
                  Al continuar, se registrará automáticamente el contacto en el seguimiento de la petición y, si está
                  "Pendiente", pasará a "En oración".
                </p>
                <div className="bg-muted/50 border rounded-md p-2 text-xs whitespace-pre-line max-h-32 overflow-auto">
                  {mensaje}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={proceedSend}
              className="bg-success text-success-foreground hover:bg-success/90 gap-2"
            >
              <MessageCircle className="h-4 w-4" /> Sí, abrir WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
