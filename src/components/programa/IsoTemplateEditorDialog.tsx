import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { IsoMinisterioTemplate } from "@/lib/isoMinisterioTemplates";
import { findIsoTemplate } from "@/lib/isoMinisterioTemplates";
import { useUpsertIsoTemplate, useDeleteIsoTemplate } from "@/hooks/useIsoTemplates";
import { useProgEventos } from "@/hooks/usePrograma";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProgMinisterio } from "@/hooks/usePrograma";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ministerio: ProgMinisterio;
  /** Plantilla efectiva actual (base + override) — usada para precargar el form. */
  template: IsoMinisterioTemplate;
}

export default function IsoTemplateEditorDialog({ open, onOpenChange, ministerio, template }: Props) {
  const upsert = useUpsertIsoTemplate();
  const remove = useDeleteIsoTemplate();
  const { data: eventos = [] } = useProgEventos();

  const [form, setForm] = useState<IsoMinisterioTemplate>(template);

  useEffect(() => { if (open) setForm(template); }, [open, template]);

  const tiposDisponibles = Array.from(new Set(eventos.map((e) => e.tipo).filter(Boolean))).sort();
  const tiposSel = form.tiposEvento ?? [];
  const toggleTipo = (t: string) => {
    const next = tiposSel.includes(t) ? tiposSel.filter((x) => x !== t) : [...tiposSel, t];
    setF("tiposEvento", next);
  };

  const setF = <K extends keyof IsoMinisterioTemplate>(k: K, v: IsoMinisterioTemplate[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setEstacion = (i: number, v: string) => {
    const arr = [...form.estaciones]; arr[i] = v; setF("estaciones", arr);
  };
  const addEstacion = () => setF("estaciones", [...form.estaciones, "Nueva estación"]);
  const delEstacion = (i: number) => setF("estaciones", form.estaciones.filter((_, j) => j !== i));
  const moveEstacion = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= form.estaciones.length) return;
    const arr = [...form.estaciones]; [arr[i], arr[j]] = [arr[j], arr[i]]; setF("estaciones", arr);
  };

  const setFirma = (k: keyof IsoMinisterioTemplate["firmas"], field: "nombre" | "cargo", v: string) =>
    setF("firmas", { ...form.firmas, [k]: { ...form.firmas[k], [field]: v } });

  const guardar = async () => {
    try {
      await upsert.mutateAsync({
        ministerio_id: ministerio.id,
        codigo: form.codigo,
        version: form.version,
        fecha_vigencia: form.fechaVigencia,
        titulo: form.titulo,
        estaciones: form.estaciones,
        importante: form.importante ?? "",
        responsabilidades: form.responsabilidades,
        firmas: form.firmas,
        tipos_evento: form.tiposEvento && form.tiposEvento.length > 0 ? form.tiposEvento : null,
      });
      toast.success("Formato ISO guardado");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const restaurar = async () => {
    if (!confirm("¿Restaurar al formato original del sistema? Se perderán los cambios personalizados.")) return;
    try {
      await remove.mutateAsync(ministerio.id);
      const base = findIsoTemplate(ministerio.nombre);
      if (base) setForm(base);
      toast.success("Formato restaurado al original");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar formato ISO — {ministerio.nombre}</DialogTitle>
          <DialogDescription>
            Personaliza el encabezado, las columnas, los textos y las firmas. Los cambios se aplican al PDF y a la vista previa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Encabezado */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Encabezado</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setF("codigo", e.target.value)} /></div>
              <div><Label>Versión</Label><Input value={form.version} onChange={(e) => setF("version", e.target.value)} /></div>
              <div><Label>Fecha vigencia</Label><Input value={form.fechaVigencia} onChange={(e) => setF("fechaVigencia", e.target.value)} placeholder="dd/mm/aaaa" /></div>
              <div className="col-span-2"><Label>Título</Label><Input value={form.titulo} onChange={(e) => setF("titulo", e.target.value)} /></div>
            </div>
          </section>

          {/* Tipos de reunión */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Reuniones donde participa el ministerio</h4>
            <p className="text-xs text-muted-foreground">
              Selecciona los tipos de reunión donde aparecerá este ministerio. Si no marcas ninguno, aparecerá en todas.
            </p>
            {tiposDisponibles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay tipos de reunión registrados aún.</p>
            ) : (
              <div className="flex flex-wrap gap-3 pt-1">
                {tiposDisponibles.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={tiposSel.includes(t)} onCheckedChange={() => toggleTipo(t)} />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </div>
            )}
          </section>


          {/* Estaciones */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Columnas / Estaciones</h4>
              <Button size="sm" variant="outline" onClick={addEstacion}><Plus className="h-3.5 w-3.5 mr-1" />Agregar</Button>
            </div>
            <div className="space-y-1.5">
              {form.estaciones.map((est, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                  <Input value={est} onChange={(e) => setEstacion(i, e.target.value)} className="flex-1" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveEstacion(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveEstacion(i, 1)} disabled={i === form.estaciones.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => delEstacion(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              {form.estaciones.length === 0 && <p className="text-xs text-muted-foreground">Sin columnas — agrega al menos una.</p>}
            </div>
          </section>

          {/* Textos */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Textos al pie</h4>
            <div><Label>Importante</Label><Textarea rows={3} value={form.importante || ""} onChange={(e) => setF("importante", e.target.value)} /></div>
            <div><Label>Responsabilidades</Label><Textarea rows={4} value={form.responsabilidades} onChange={(e) => setF("responsabilidades", e.target.value)} /></div>
          </section>

          {/* Firmas */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Firmas</h4>
            {(["elaboradoPor", "revisadoPor", "autorizadoPor"] as const).map((k) => (
              <div key={k} className="grid grid-cols-[120px_1fr_1fr] gap-2 items-center">
                <span className="text-xs font-medium capitalize">{k.replace("Por", "")}</span>
                <Input placeholder="Nombre" value={form.firmas[k].nombre} onChange={(e) => setFirma(k, "nombre", e.target.value)} />
                <Input placeholder="Cargo" value={form.firmas[k].cargo} onChange={(e) => setFirma(k, "cargo", e.target.value)} />
              </div>
            ))}
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={restaurar} disabled={remove.isPending}>
            <RotateCcw className="h-4 w-4 mr-1" />Restaurar original
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={upsert.isPending}>Guardar formato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
