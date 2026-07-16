import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Video, ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCw, Save, ExternalLink, KeyRound, Info, Settings2 } from "lucide-react";
import SectionHero from "@/components/shell/SectionHero";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";

type ZoomConfig = {
  id: string;
  mode: "api" | "manual";
  host_email: string | null;
  default_duration_minutes: number;
  account_id_masked: string | null;
  last_validation_status: "ok" | "error" | "unknown" | null;
  last_validation_at: string | null;
  last_validation_message: string | null;
};

export default function ZoomConfigSection() {
  const can = useCan();
  const canEdit = can("seminario:zoom");
  const [cfg, setCfg] = useState<ZoomConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("sem_zoom_config").select("*").eq("singleton", true).maybeSingle();
    if (error) toast.error(error.message);
    setCfg(data || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<ZoomConfig>) => {
    if (!cfg) return;
    setSaving(true);
    const { error } = await (supabase as any).from("sem_zoom_config").update(patch).eq("id", cfg.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCfg({ ...cfg, ...patch });
    toast.success("Configuración guardada");
  };

  const validar = async () => {
    setValidating(true);
    setLastValidation(null);
    try {
      const { data, error } = await supabase.functions.invoke("zoom-validate", { body: {} });
      if (error) throw error;
      setLastValidation(data);
      if (data?.ok) toast.success("Credenciales Zoom válidas");
      else toast.error(`Validación fallida: ${data?.message || data?.error}`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Error invocando validador");
    } finally {
      setValidating(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!cfg) return <Card><CardContent className="p-6 text-sm">No se pudo cargar la configuración.</CardContent></Card>;

  const status = cfg.last_validation_status || "unknown";
  const statusBadge =
    status === "ok" ? <Badge className="bg-emerald-600 hover:bg-emerald-600"><ShieldCheck className="h-3 w-3 mr-1" />Validado</Badge> :
    status === "error" ? <Badge variant="destructive"><ShieldAlert className="h-3 w-3 mr-1" />Error</Badge> :
    <Badge variant="outline"><ShieldQuestion className="h-3 w-3 mr-1" />Sin validar</Badge>;

  return (
    <div className="space-y-4 max-w-3xl">
      <SectionHero
        icon={Settings2}
        eyebrow="Integrations · Video"
        title="Configuración Zoom"
        description="Elige cómo se generan los enlaces de las clases virtuales del seminario."
        gradient="from-sky-600 via-blue-600 to-indigo-700"
      />

      {/* Modo activo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Modo de operación</span>
            <Badge variant={cfg.mode === "api" ? "default" : "secondary"}>
              {cfg.mode === "api" ? "API Zoom" : "Link manual"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Switch
              checked={cfg.mode === "api"}
              disabled={!canEdit || saving}
              onCheckedChange={(v) => {
                if (v && status !== "ok") {
                  toast.warning("Valida las credenciales antes de activar el modo API");
                  return;
                }
                save({ mode: v ? "api" : "manual" });
              }}
            />
            <div className="text-sm">
              <p className="font-medium">Activar modo API Zoom</p>
              <p className="text-xs text-muted-foreground">
                Si está activado, al crear/editar una oferta virtual se crea automáticamente la reunión en Zoom.
                Si está apagado, debes pegar el link manualmente por materia.
              </p>
            </div>
          </div>

          {cfg.mode === "api" && status !== "ok" && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Credenciales no validadas</AlertTitle>
              <AlertDescription>
                El modo API está activo pero la última validación no fue exitosa. Valida las credenciales abajo o cambia a modo manual.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Credenciales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Credenciales Zoom (Server-to-Server OAuth)</span>
            {statusBadge}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>¿Dónde se guardan?</AlertTitle>
            <AlertDescription className="text-xs space-y-2">
              <p>
                Por seguridad, los secretos de Zoom <strong>no se guardan en la base de datos ni en este formulario</strong>: se almacenan
                cifrados como secretos de Lovable Cloud y solo los lee el servidor al crear reuniones.
              </p>
              <p>
                Para registrarlos o cambiarlos: <strong>Cloud → Secrets</strong> y crea/edita:
                <code className="mx-1 px-1 rounded bg-muted">ZOOM_ACCOUNT_ID</code>,
                <code className="mx-1 px-1 rounded bg-muted">ZOOM_CLIENT_ID</code>,
                <code className="mx-1 px-1 rounded bg-muted">ZOOM_CLIENT_SECRET</code>.
              </p>
              <p>
                Las consigues creando una app <strong>Server-to-Server OAuth</strong> en{" "}
                <a className="text-primary inline-flex items-center gap-1 underline" href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noreferrer">
                  Zoom Marketplace <ExternalLink className="h-3 w-3" />
                </a>{" "}
                con scopes <code>meeting:write:admin</code>, <code>meeting:read:admin</code>, <code>user:read:admin</code>.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs">Account ID detectado</Label>
              <Input readOnly value={cfg.account_id_masked || "—"} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">Última validación</Label>
              <Input readOnly value={cfg.last_validation_at ? new Date(cfg.last_validation_at).toLocaleString() : "—"} className="text-xs" />
            </div>
          </div>

          {cfg.last_validation_message && (
            <div className="text-xs rounded-md border p-2 bg-muted/30">
              <span className="font-medium">Mensaje: </span>{cfg.last_validation_message}
            </div>
          )}

          {lastValidation?.ok && (
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border p-2"><span className="text-muted-foreground">Host: </span><span className="font-medium">{lastValidation.host_email || "—"}</span></div>
              <div className="rounded-md border p-2"><span className="text-muted-foreground">Scopes: </span><span className="font-mono">{(lastValidation.scopes || []).length} otorgados</span></div>
            </div>
          )}

          <Button onClick={validar} disabled={!canEdit || validating} className="w-full sm:w-auto">
            {validating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {validating ? "Validando con Zoom…" : "Validar credenciales ahora"}
          </Button>
        </CardContent>
      </Card>

      {/* Opciones por defecto */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Valores por defecto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email del host (opcional)</Label>
              <Input
                type="email"
                placeholder="seminario@cmg.org"
                value={cfg.host_email || ""}
                disabled={!canEdit}
                onChange={(e) => setCfg({ ...cfg, host_email: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Si se deja vacío se usa el usuario "me" de la cuenta Zoom.</p>
            </div>
            <div>
              <Label className="text-xs">Duración por defecto (min)</Label>
              <Input
                type="number" min={15} max={480}
                value={cfg.default_duration_minutes}
                disabled={!canEdit}
                onChange={(e) => setCfg({ ...cfg, default_duration_minutes: Number(e.target.value) || 90 })}
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={!canEdit || saving}
            onClick={() => save({ host_email: cfg.host_email, default_duration_minutes: cfg.default_duration_minutes })}
          >
            <Save className="h-4 w-4 mr-2" />{saving ? "Guardando…" : "Guardar valores"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
