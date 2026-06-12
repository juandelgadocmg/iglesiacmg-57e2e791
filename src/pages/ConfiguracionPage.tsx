import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useConfiguracion, useUpdateConfiguracion } from "@/hooks/useConfiguracion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Church, Globe, Clock, Save, BookOpen, ImageIcon, Video, Radio, DollarSign, Bell } from "lucide-react";
import { toast } from "sonner";

// Lazy-load sub-pages as tab content
import BannersPage from "@/pages/BannersPage";
import VideosPage from "@/pages/VideosPage";
import SenalEnVivoPage from "@/pages/SenalEnVivoPage";
import NotificacionesPreferencias from "@/components/configuracion/NotificacionesPreferencias";

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
        descripcion: config.descripcion || "",
        horario_servicios: config.horario_servicios || "",
        moneda: config.moneda || "USD",
        zona_horaria: config.zona_horaria || "America/Bogota",
        color_primario: config.color_primario || "#6366f1",
        tema_semana_titulo: config.tema_semana_titulo || "",
        tema_semana_descripcion: config.tema_semana_descripcion || "",
        tema_semana_url: config.tema_semana_url || "",
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

  const handleSave = async () => {
    try {
      // Convertir campos numéricos
      const payload: Record<string, any> = { ...form };
      payload.tesoreria_cdp_tolerancia_pct = Number(form.tesoreria_cdp_tolerancia_pct) || 0;
      payload.tesoreria_cdp_tolerancia_abs = Number(form.tesoreria_cdp_tolerancia_abs) || 0;
      payload.tesoreria_cdp_dias_mora = parseInt(form.tesoreria_cdp_dias_mora) || 7;
      await updateConfig.mutateAsync(payload);
      toast.success("Configuración guardada correctamente");
    } catch {
      toast.error("Error al guardar la configuración");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Configuración" description="Datos generales, contenido multimedia y ajustes del sistema" />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-1.5"><Church className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="banners" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Banners</TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Videos</TabsTrigger>
          <TabsTrigger value="senal" className="gap-1.5"><Radio className="h-3.5 w-3.5" /> Señal en Vivo</TabsTrigger>
          <TabsTrigger value="notificaciones" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notificaciones</TabsTrigger>
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

            {/* Tema de la Semana */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Tema de la Semana</CardTitle>
                <CardDescription>Configura el tema semanal que se muestra en el dashboard</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Título del Tema</Label>
                  <Input value={form.tema_semana_titulo || ""} onChange={e => set("tema_semana_titulo", e.target.value)} placeholder="Ej: Tema de la semana" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción</Label>
                  <Input value={form.tema_semana_descripcion || ""} onChange={e => set("tema_semana_descripcion", e.target.value)} placeholder="Ej: LA COMUNIÓN CON EL ESPÍRITU SANTO" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>URL del enlace (opcional)</Label>
                  <Input value={form.tema_semana_url || ""} onChange={e => set("tema_semana_url", e.target.value)} placeholder="https://..." />
                </div>
              </CardContent>
            </Card>
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
      </Tabs>
    </div>
  );
}
