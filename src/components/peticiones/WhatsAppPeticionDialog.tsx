import { useState, useEffect, useMemo } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ExternalLink, Beaker, CheckCircle2, AlertTriangle, Smartphone, Monitor, Copy } from "lucide-react";
import {
  buildWhatsAppUrl,
  buildWhatsAppWebUrl,
  buildWhatsAppApiUrl,
  normalizePhone,
  isMobileDevice,
  openWhatsApp,
  type OpenWhatsAppResult,
} from "@/lib/whatsapp";
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
  const [testMode, setTestMode] = useState(false);
  const [testResult, setTestResult] = useState<OpenWhatsAppResult | null>(null);

  const persona = peticion?.personas;
  const nombre = persona ? `${persona.nombres}`.trim() : "";
  const numero = persona?.whatsapp || persona?.telefono || null;
  const numeroFormateado = normalizePhone(numero);
  const iglesia = config?.nombre_iglesia || "nuestra iglesia";

  const isMobile = useMemo(() => isMobileDevice(), []);

  const urlWa = useMemo(() => buildWhatsAppUrl(numero, mensaje), [numero, mensaje]);
  const urlWeb = useMemo(() => buildWhatsAppWebUrl(numero, mensaje), [numero, mensaje]);
  const urlApi = useMemo(() => buildWhatsAppApiUrl(numero, mensaje), [numero, mensaje]);

  useEffect(() => {
    if (peticion) {
      const plantilla = `Hola ${nombre || ""}, desde ${iglesia} estamos orando por tu petición: "${peticion.titulo}". Queremos saber cómo te encuentras y acompañarte en oración. Bendiciones.`;
      setMensaje(plantilla);
      setTestResult(null);
    }
  }, [peticion, nombre, iglesia]);

  useEffect(() => {
    if (!open) {
      setTestResult(null);
      setConfirmOpen(false);
    }
  }, [open]);

  const runTest = (forceUrl?: string) => {
    if (!numero) {
      toast.error("Número de WhatsApp inválido");
      return;
    }
    const result = openWhatsApp(numero, mensaje, { forceUrl });
    setTestResult(result);
    if (result.ok) {
      toast.success(`Prueba OK (${result.platform === "mobile" ? "móvil" : "escritorio"} · ${result.method})`);
    } else {
      toast.error(result.message);
    }
  };

  const copyUrl = (url: string | null) => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    toast.success("URL copiada al portapapeles");
  };

  const proceedSend = async () => {
    if (!peticion || !numero) return;

    const result = openWhatsApp(numero, mensaje);
    if (!result.ok) {
      toast.error(result.message);
      setTestResult(result);
      return;
    }

    // Registrar trazabilidad SOLO cuando el usuario confirma y se abre realmente
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" /> Responder por WhatsApp
            </DialogTitle>
            <DialogDescription>
              {numero
                ? <>Se abrirá WhatsApp con el mensaje hacia <strong>{nombre || "la persona"}</strong> (+{numeroFormateado}).</>
                : <span className="text-destructive">La persona no tiene número de WhatsApp ni teléfono registrado.</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mensaje</label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              placeholder="Escribe el mensaje a enviar..."
            />
            <p className="text-xs text-muted-foreground">
              Puedes editar el mensaje antes de enviarlo.
            </p>
          </div>

          {/* MODO DE PRUEBA */}
          <div className="border rounded-md bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-info" />
                <Label htmlFor="wa-test-mode" className="text-sm font-medium cursor-pointer">
                  Modo de prueba
                </Label>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {isMobile ? <><Smartphone className="h-3 w-3" /> Móvil</> : <><Monitor className="h-3 w-3" /> Escritorio</>}
                </Badge>
              </div>
              <Switch id="wa-test-mode" checked={testMode} onCheckedChange={setTestMode} disabled={!numero} />
            </div>

            {testMode && (
              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  Verifica que la apertura no se bloquee y que el chat sea el correcto.{" "}
                  <strong>No</strong> registra seguimiento ni cambia el estado de la petición.
                </p>

                <div className="grid grid-cols-1 gap-1.5">
                  <UrlRow label="wa.me (universal)" url={urlWa} onTest={() => runTest(urlWa || undefined)} onCopy={() => copyUrl(urlWa)} />
                  <UrlRow label="web.whatsapp.com (escritorio)" url={urlWeb} onTest={() => runTest(urlWeb || undefined)} onCopy={() => copyUrl(urlWeb)} />
                  <UrlRow label="api.whatsapp.com (anti-bloqueo)" url={urlApi} onTest={() => runTest(urlApi || undefined)} onCopy={() => copyUrl(urlApi)} />
                </div>

                {testResult && (
                  <div
                    className={
                      "rounded-md border p-2 space-y-1 " +
                      (testResult.ok
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-destructive/40 bg-destructive/10 text-destructive")
                    }
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {testResult.ok
                        ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : <AlertTriangle className="h-3.5 w-3.5" />}
                      {testResult.ok ? "Apertura exitosa" : "No se pudo abrir"}
                    </div>
                    <div className="text-[11px] opacity-90">
                      Plataforma: <strong>{testResult.platform}</strong> · Método: <strong>{testResult.method}</strong>
                      {testResult.blocked && " · bloqueado por el navegador"}
                    </div>
                    <div className="text-[11px] opacity-90 break-all">{testResult.message}</div>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  Si tu navegador bloquea la ventana emergente, autoriza pop-ups para{" "}
                  <code>wa.me</code> y <code>web.whatsapp.com</code> y vuelve a probar.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!numero || !mensaje.trim() || testMode}
              className="bg-success text-success-foreground hover:bg-success/90 gap-2"
              title={testMode ? "Desactiva el modo de prueba para enviar realmente" : ""}
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
                  Estás a punto de abrir <strong>WhatsApp</strong> con el mensaje hacia{" "}
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

function UrlRow({ label, url, onTest, onCopy }: { label: string; url: string | null; onTest: () => void; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-background border rounded px-2 py-1">
      <span className="text-[11px] font-medium text-muted-foreground min-w-[140px] shrink-0">{label}</span>
      <code className="text-[10px] truncate flex-1 text-foreground/70">{url || "—"}</code>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={!url} onClick={onCopy} title="Copiar URL">
        <Copy className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 text-[10px] px-2 shrink-0"
        disabled={!url}
        onClick={onTest}
      >
        Probar
      </Button>
    </div>
  );
}
