import { useState } from "react";
import { Bug, Camera, Terminal, Loader2, Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getConsoleLogText } from "@/lib/consoleCapture";

type Severity = "baja" | "media" | "alta" | "critica";
type Frequency = "una_vez" | "a_veces" | "frecuente" | "siempre";

const SEVERITY_OPTIONS: { value: Severity; label: string; hint: string }[] = [
  { value: "baja", label: "Baja", hint: "Molesto pero puedo continuar" },
  { value: "media", label: "Media", hint: "Afecta parte de mi trabajo" },
  { value: "alta", label: "Alta", hint: "Bloquea funciones importantes" },
  { value: "critica", label: "Crítica", hint: "No puedo usar la app" },
];

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "una_vez", label: "Ocurrió una sola vez" },
  { value: "a_veces", label: "A veces (intermitente)" },
  { value: "frecuente", label: "Frecuente (varias veces al día)" },
  { value: "siempre", label: "Siempre que intento hacerlo" },
];

function collectDiagnostics() {
  const ua = navigator.userAgent || "";
  const vp = `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`;
  const scr = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  const plat = (navigator as any).userAgentData?.platform || navigator.platform || "unknown";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  return {
    user_agent: ua,
    viewport: vp,
    screen: scr,
    platform: plat,
    extra: {
      lang: navigator.language,
      online: navigator.onLine,
      isIOS,
      isAndroid,
      isStandalone,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString(),
    },
  };
}

async function captureScreenshot(): Promise<string | null> {
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(document.body, {
      scale: Math.min(0.6, window.devicePixelRatio || 1),
      backgroundColor: null,
      logging: false,
      useCORS: true,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
    return canvas.toDataURL("image/jpeg", 0.55);
  } catch (e) {
    console.warn("Screenshot capture failed", e);
    return null;
  }
}

export default function ReportProblemButton({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [severity, setSeverity] = useState<Severity>("media");
  const [frequency, setFrequency] = useState<Frequency>("una_vez");
  const [steps, setSteps] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [includeConsole, setIncludeConsole] = useState(true);
  const diag = open ? collectDiagnostics() : null;

  const updateStep = (i: number, v: string) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? v : s)));
  const addStep = () => setSteps((prev) => [...prev, ""]);
  const removeStep = (i: number) =>
    setSteps((prev) => (prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== i)));
  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const submit = async () => {
    if (!descripcion.trim()) {
      toast.error("Describe el problema antes de enviar");
      return;
    }
    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }
    setSubmitting(true);
    try {
      const d = collectDiagnostics();
      let screenshot: string | null = null;
      if (includeScreenshot) screenshot = await captureScreenshot();
      const consoleLog = includeConsole ? getConsoleLogText().slice(-15000) : null;

      const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
      const extra: any = {
        ...d.extra,
        severity,
        frequency,
        reproduction_steps: cleanSteps,
      };
      if (screenshot) extra.screenshot_data_url = screenshot;
      if (consoleLog) extra.console_log = consoleLog;

      const stepsText = cleanSteps.length
        ? `\n\nPasos para reproducir:\n${cleanSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
        : "";
      const meta = `\n\n[Gravedad: ${severity} · Frecuencia: ${frequency}]`;

      const { error } = await supabase.from("bug_reports").insert({
        user_id: user.id,
        descripcion: descripcion.trim() + stepsText + meta,
        ruta: window.location.pathname + window.location.search,
        user_agent: d.user_agent,
        viewport: d.viewport,
        screen: d.screen,
        platform: d.platform,
        extra,
      });
      if (error) throw error;
      toast.success("Reporte enviado. ¡Gracias!");
      setDescripcion("");
      setSteps([""]);
      setSeverity("media");
      setFrequency("una_vez");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar el reporte");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-9 min-w-9 gap-1.5 px-2.5"
          title="Reportar un problema"
          aria-label="Reportar un problema"
        >
          <Bug className="h-4 w-4" />
          {!compact && <span className="hidden sm:inline">Reportar</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reportar un problema</DialogTitle>
          <DialogDescription>
            Describe qué falló. Adjuntaremos automáticamente datos de tu dispositivo para diagnosticar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="bug-desc" className="text-xs">¿Qué ocurrió?</Label>
            <Textarea
              id="bug-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: La tabla se corta en mi iPhone, no puedo instalar la app…"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Gravedad</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex flex-col">
                        <span>{o.label}</span>
                        <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Frecuencia</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pasos para reproducir (en orden)</Label>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={addStep}>
                <Plus className="h-3 w-3 mr-1" />Agregar
              </Button>
            </div>
            <div className="mt-1 space-y-1.5">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <div className="flex flex-col items-center pt-1.5">
                    <button
                      type="button"
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="text-muted-foreground disabled:opacity-30"
                      aria-label="Subir paso"
                    ><GripVertical className="h-3 w-3" /></button>
                  </div>
                  <span className="text-xs font-semibold text-primary pt-2 w-4">{i + 1}.</span>
                  <Input
                    value={s}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={i === 0 ? "Ej: Abro la app en iPhone en Safari" : "Siguiente paso…"}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeStep(i)}
                    aria-label="Quitar paso"
                  ><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-2.5">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={includeScreenshot}
                onCheckedChange={(v) => setIncludeScreenshot(!!v)}
              />
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Incluir captura de pantalla actual</span>
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={includeConsole}
                onCheckedChange={(v) => setIncludeConsole(!!v)}
              />
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Incluir log del navegador (últimos eventos)</span>
            </label>
          </div>

          {diag && (
            <div className="rounded-md border bg-muted/40 p-2 text-[11px] font-mono space-y-0.5 overflow-x-auto">
              <div><b>Ruta:</b> {window.location.pathname}</div>
              <div><b>Pantalla:</b> {diag.viewport}</div>
              <div><b>Plataforma:</b> {diag.platform}</div>
              <div className="truncate"><b>Navegador:</b> {diag.user_agent}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || !descripcion.trim()}>
            {submitting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Enviando…</>
            ) : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
