import { useState, useEffect, useRef } from "react";
import PageHeader from "@/components/shared/PageHeader";
import ModuleHero from "@/components/shell/ModuleHero";
import { useConfiguracion, useUpdateConfiguracion } from "@/hooks/useConfiguracion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Church, Globe, Clock, Save, BookOpen, ImageIcon, Video, Radio, DollarSign, Bell, Upload, X, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Lazy-load sub-pages as tab content
import BannersPage from "@/pages/BannersPage";
import VideosPage from "@/pages/VideosPage";
import SenalEnVivoPage from "@/pages/SenalEnVivoPage";
import NotificacionesPreferencias from "@/components/configuracion/NotificacionesPreferencias";
import PermisosMatriz from "@/components/configuracion/PermisosMatriz";

const MONEDAS = [
  { value: "USD", label: "USD - Dólar estadounidense" },
  { value: "COP", label: "COP - Peso colombiano" },
  { value: "MXN", label: "MXN - Peso mexicano" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "PEN", label: "PEN - Sol peruano" },
  { value: "ARS", label: "ARS - Peso argentino" },
  { value: "CLP", label: "CLP - Peso chileno" },
  { value: "GTQ", label: "GTQ - Quetzal guatemalteco" },
];

const ZONAS = [
  "America/Bogota", "America/Mexico_City", "America/Lima", "America/Buenos_Aires",
  "America/Santiago", "America/Guatemala", "America/New_York", "America/Los_Angeles",
  "Europe/Madrid",
];

export default function ConfiguracionPage() {
  const { data: config, isLoading } = useConfiguracion();
  const updateConfig = useUpdateConfiguracion();
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [uploadingTemaPdf, setUploadingTemaPdf] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const temaPdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setForm({
        nombre_iglesia: config.nombre_iglesia || "",
        pastor_principal: config.pastor_principal || "",
        telefono: config.telefono || "",
        email: config.email || "",
        direccion: config.direccion || "",
        ciudad: config.ciudad || "",
        pais: config.pais || "",
        sitio_web: config.sitio_web || "",
        discipulando_url: (config as any).discipulando_url || "",
        discipulando_logo_url: (config as any).discipulando_logo_url || "",
        descripcion: config.descripcion || "",
        horario_servicios: config.horario_servicios || "",
        moneda: config.moneda || "USD",
        zona_horaria: config.zona_horaria || "America/Bogota",
        color_primario: config.color_primario || "#6366f1",
        tema_semana_titulo: config.tema_semana_titulo || "",
        tema_semana_descripcion: config.tema_semana_descripcion || "",
        tema_semana_url: config.tema_semana_url || "",
        tema_semana_pdf_url: (config as any).tema_semana_pdf_url || "",
        tesoreria_cdp_tolerancia_pct: String((config as any).tesoreria_cdp_tolerancia_pct ?? 0),
        tesoreria_cdp_tolerancia_abs: String((config as any).tesoreria_cdp_tolerancia_abs ?? 0),
        tesoreria_cdp_dias_mora: String((config as any).tesoreria_cdp_dias_mora ?? 7),
      });
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const isValidUrl = (v: string) => {
    if (!v) return true;
    try { new URL(v); return true; } catch { return false; }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen (PNG, JPG, SVG, WebP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar 2 MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `discipulando/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, {
        cacheControl: "31536000", upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
      set("discipulando_logo_url", urlData.publicUrl);
      setLogoPreviewError(false);
      toast.success("Logo subido. Recuerda guardar los cambios.");
    } catch (e: any) {
      toast.error(e?.message || "Error al subir el logo");
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const handleTemaPdfUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("El archivo debe ser un PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El PDF no debe superar 10 MB");
      return;
    }
    setUploadingTemaPdf(true);
    try {
      const path = `tema-semana/tema-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("banners").upload(path, file, {
        cacheControl: "31536000", upsert: false, contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
      set("tema_semana_pdf_url", urlData.publicUrl);
      toast.success("PDF subido. Recuerda guardar los cambios.");
    } catch (e: any) {
      toast.error(e?.message || "Error al subir el PDF");
    } finally {
      setUploadingTemaPdf(false);
      if (temaPdfRef.current) temaPdfRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (form.discipulando_url && !isValidUrl(form.discipulando_url)) {
      toast.error("La URL de Discipulando Naciones no es válida");
      return;
    }
    if (form.discipulando_logo_url && !isValidUrl(form.discipulando_logo_url)) {
      toast.error("La URL del logo no es válida");
      return;
    }
    try {
      // Convertir campos numéricos
      const payload: Record<string, any> = { ...form };
      payload.tesoreria_cdp_tolerancia_pct = Number(form.tesoreria_cdp_tolerancia_pct) || 0;
      payload.tesoreria_cdp_tolerancia_abs = Number(form.tesoreria_cdp_tolerancia_abs) || 0;
      payload.tesoreria_cdp_dias_mora = parseInt(form.tesoreria_cdp_dias_mora) || 7;
      payload.tesoreria_cdp_dias_mora = parseInt(form.tesoreria_cdp_dias_mora) || 7;
      await updateConfig.mutateAsync(payload);
      toast.success("Configuración guardada correctamente");
    } catch {
      toast.error("Error al guardar la configuración");
    }
  };

  return (
    <div className="animate-fade-in">
      <ModuleHero
        variant="configuracion"
        title="Configuración"
        eyebrow="Platform Settings"
        description="Datos institucionales, contenido multimedia y ajustes del sistema — cambios auditados y versionados."
        status={{ label: "Sincronizado", tone: "ok" }}
        kpis={[
          { label: "Iglesia", value: (config?.nombre_iglesia || "—").slice(0, 24), hint: "Identidad principal", tone: "info" },
          { label: "Pastor principal", value: config?.pastor_principal || "—", hint: "Responsable pastoral" },
          { label: "Zona horaria", value: (config as any)?.timezone || "America/Bogota", hint: "Región configurada" },
          { label: "Moneda", value: (config as any)?.moneda || "COP", hint: "Formato regional" },
        ]}
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-1.5"><Church className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="banners" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Banners</TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Videos</TabsTrigger>
          <TabsTrigger value="senal" className="gap-1.5"><Radio className="h-3.5 w-3.5" /> Señal en Vivo</TabsTrigger>
          <TabsTrigger value="notificaciones" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notificaciones</TabsTrigger>
          <TabsTrigger value="permisos" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="flex justify-end mb-4">
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateConfig.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>

          <div className="grid gap-6">
            {/* Church Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Church className="h-4 w-4" /> Datos de la Iglesia</CardTitle>
                <CardDescription>Información general de la congregación</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nombre de la Iglesia</Label>
                  <Input value={form.nombre_iglesia || ""} onChange={e => set("nombre_iglesia", e.target.value)} placeholder="Nombre de la iglesia" />
                </div>
                <div className="space-y-2">
                  <Label>Pastor Principal</Label>
                  <Input value={form.pastor_principal || ""} onChange={e => set("pastor_principal", e.target.value)} placeholder="Nombre del pastor" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={form.telefono || ""} onChange={e => set("telefono", e.target.value)} placeholder="+57 300 000 0000" />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} placeholder="contacto@iglesia.com" />
                </div>
                <div className="space-y-2">
                  <Label>Sitio web</Label>
                  <Input value={form.sitio_web || ""} onChange={e => set("sitio_web", e.target.value)} placeholder="https://www.iglesia.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>URL de Discipulando Naciones (logo del encabezado)</Label>
                  <Input
                    type="url"
                    value={form.discipulando_url || ""}
                    onChange={e => set("discipulando_url", e.target.value)}
                    placeholder="https://discipulandonaciones.lovable.app"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enlace al que dirige el logo de Discipulando Naciones ubicado en el encabezado, junto al ícono de mensajes.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Logo de Discipulando Naciones</Label>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-3 border rounded-md bg-muted/30">
                    <div className="shrink-0 h-16 w-32 flex items-center justify-center bg-background border rounded-md overflow-hidden">
                      {form.discipulando_logo_url && !logoPreviewError ? (
                        <img
                          src={form.discipulando_logo_url}
                          alt="Vista previa del logo"
                          className="max-h-full max-w-full object-contain"
                          onError={() => setLogoPreviewError(true)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {logoPreviewError ? <AlertCircle className="h-3.5 w-3.5 text-destructive" /> : <ImageIcon className="h-3.5 w-3.5" />}
                          {logoPreviewError ? "No accesible" : "Logo por defecto"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={logoFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                        />
                        <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => logoFileRef.current?.click()}>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {uploadingLogo ? "Subiendo..." : "Subir logo"}
                        </Button>
                        {form.discipulando_logo_url && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => { set("discipulando_logo_url", ""); setLogoPreviewError(false); }}>
                            <X className="h-3.5 w-3.5 mr-1.5" /> Quitar
                          </Button>
                        )}
                      </div>
                      <Input
                        type="url"
                        value={form.discipulando_logo_url || ""}
                        onChange={e => { set("discipulando_logo_url", e.target.value); setLogoPreviewError(false); }}
                        placeholder="O pega la URL de una imagen (https://...)"
                        aria-invalid={!!form.discipulando_logo_url && !isValidUrl(form.discipulando_logo_url)}
                      />
                      {form.discipulando_logo_url && !isValidUrl(form.discipulando_logo_url) && (
                        <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> URL inválida</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, SVG o WebP · máximo 2 MB. Si no se define, se usará el logo por defecto.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Dirección</Label>
                  <Input value={form.direccion || ""} onChange={e => set("direccion", e.target.value)} placeholder="Dirección completa" />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input value={form.ciudad || ""} onChange={e => set("ciudad", e.target.value)} placeholder="Ciudad" />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input value={form.pais || ""} onChange={e => set("pais", e.target.value)} placeholder="País" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea value={form.descripcion || ""} onChange={e => set("descripcion", e.target.value)} placeholder="Breve descripción de la iglesia" rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Horarios</CardTitle>
                <CardDescription>Horarios de servicios y actividades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Horario de Servicios</Label>
                  <Textarea value={form.horario_servicios || ""} onChange={e => set("horario_servicios", e.target.value)} placeholder={"Domingos: 9:00 AM y 11:00 AM\nMiércoles: 7:00 PM"} rows={4} />
                </div>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Ajustes del Sistema</CardTitle>
                <CardDescription>Preferencias regionales y de visualización</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={form.moneda || "USD"} onValueChange={v => set("moneda", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONEDAS.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select value={form.zona_horaria || "America/Bogota"} onValueChange={v => set("zona_horaria", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ZONAS.map(z => (<SelectItem key={z} value={z}>{z.replace("_", " ")}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color primario</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.color_primario || "#6366f1"} onChange={e => set("color_primario", e.target.value)} className="h-10 w-14 rounded-md border border-input cursor-pointer" />
                    <Input value={form.color_primario || ""} onChange={e => set("color_primario", e.target.value)} className="flex-1" placeholder="#6366f1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tesorería CDP */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Tesorería · Casas de Paz</CardTitle>
                <CardDescription>Umbrales de tolerancia y plazos para el control de ofrendas</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tolerancia porcentual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.tesoreria_cdp_tolerancia_pct || "0"}
                    onChange={e => set("tesoreria_cdp_tolerancia_pct", e.target.value)}
                    placeholder="Ej: 2"
                  />
                  <p className="text-xs text-muted-foreground">% máximo de diferencia permitida entre lo entregado y lo consignado.</p>
                </div>
                <div className="space-y-2">
                  <Label>Tolerancia absoluta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.tesoreria_cdp_tolerancia_abs || "0"}
                    onChange={e => set("tesoreria_cdp_tolerancia_abs", e.target.value)}
                    placeholder="Ej: 5000"
                  />
                  <p className="text-xs text-muted-foreground">Monto máximo (en moneda) de diferencia permitida.</p>
                </div>
                <div className="space-y-2">
                  <Label>Días para considerar mora</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.tesoreria_cdp_dias_mora || "7"}
                    onChange={e => set("tesoreria_cdp_dias_mora", e.target.value)}
                    placeholder="7"
                  />
                  <p className="text-xs text-muted-foreground">Días después de cierre de semana para marcar una CDP en mora.</p>
                </div>
              </CardContent>
            </Card>

            {/* Tema de la Semana — historial y versión */}
            <TemaSemanaManager />

          </div>
        </TabsContent>

        <TabsContent value="banners">
          <BannersPage />
        </TabsContent>

        <TabsContent value="videos">
          <VideosPage />
        </TabsContent>

        <TabsContent value="senal">
          <SenalEnVivoPage />
        </TabsContent>

        <TabsContent value="notificaciones">
          <NotificacionesPreferencias />
        </TabsContent>

        <TabsContent value="permisos">
          <PermisosMatriz />
        </TabsContent>
      </Tabs>
    </div>
  );
}
