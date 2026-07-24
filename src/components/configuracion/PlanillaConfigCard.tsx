import { useEffect, useState } from "react";
import { useConfiguracion, useUpdateConfiguracion } from "@/hooks/useConfiguracion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, ClipboardList } from "lucide-react";

const COLUMNAS_DISPONIBLES = [
  { key: "nombre", label: "Nombre" },
  { key: "hora", label: "Hora de check-in" },
  { key: "puntualidad", label: "Puntualidad" },
  { key: "metodo", label: "Método (QR/manual)" },
  { key: "firma", label: "Firma" },
];

export default function PlanillaConfigCard() {
  const { data: config, isLoading } = useConfiguracion();
  const update = useUpdateConfiguracion();
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [pie, setPie] = useState("");
  const [color, setColor] = useState("#111111");
  const [mostrarLogo, setMostrarLogo] = useState(true);
  const [columnas, setColumnas] = useState<string[]>([]);

  useEffect(() => {
    if (!config) return;
    const c = config as any;
    setTitulo(c.planilla_titulo || "Planilla de Asistencia");
    setSubtitulo(c.planilla_subtitulo || "");
    setPie(c.planilla_pie || "DOXA · CMG Admin");
    setColor(c.planilla_color_encabezado || "#111111");
    setMostrarLogo(c.planilla_mostrar_logo ?? true);
    setColumnas(Array.isArray(c.planilla_columnas) ? c.planilla_columnas : ["nombre","hora","puntualidad","metodo","firma"]);
  }, [config]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const toggleCol = (key: string) => {
    setColumnas(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        planilla_titulo: titulo,
        planilla_subtitulo: subtitulo,
        planilla_pie: pie,
        planilla_color_encabezado: color,
        planilla_mostrar_logo: mostrarLogo,
        planilla_columnas: columnas,
      });
      toast.success("Configuración de planilla guardada");
    } catch (e: any) {
      toast.error("Error al guardar", { description: e.message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Planilla de Control (Asistencia)
        </CardTitle>
        <CardDescription>
          Personaliza el encabezado, colores y columnas de la planilla que se imprime en cada reunión.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Título</Label>
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Planilla de Asistencia" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Subtítulo (opcional)</Label>
          <Input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} placeholder="Iglesia Cristiana CMG · Sede Central" />
        </div>
        <div className="space-y-2">
          <Label>Color del encabezado</Label>
          <div className="flex gap-2">
            <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-16 p-1" />
            <Input value={color} onChange={e => setColor(e.target.value)} placeholder="#111111" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Pie de página</Label>
          <Input value={pie} onChange={e => setPie(e.target.value)} placeholder="DOXA · CMG Admin" />
        </div>
        <div className="space-y-2 sm:col-span-2 flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-sm">Mostrar logo de la iglesia</Label>
            <p className="text-xs text-muted-foreground">Usa el logo configurado en “Datos de la Iglesia”.</p>
          </div>
          <Switch checked={mostrarLogo} onCheckedChange={setMostrarLogo} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Columnas visibles</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border p-3">
            {COLUMNAS_DISPONIBLES.map(c => (
              <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={columnas.includes(c.key)} onCheckedChange={() => toggleCol(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">La columna “#” siempre aparece.</p>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button onClick={handleSave} disabled={update.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {update.isPending ? "Guardando..." : "Guardar planilla"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
