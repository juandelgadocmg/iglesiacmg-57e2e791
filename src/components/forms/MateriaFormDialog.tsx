import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, X } from "lucide-react";
import { useCreateMateria, useAulas } from "@/hooks/useAcademia";
import { usePersonas } from "@/hooks/useDatabase";
import { getAcademiaMaestroTipo, isAcademiaMaestro } from "@/lib/personaRoles";
import { toast } from "sonner";

const schema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  horario: z.string().optional(),
  maestro_id: z.string().optional(),
  aula_id: z.string().optional(),
  cupos: z.string().optional(),
  hab_calificaciones: z.boolean(),
  hab_asistencia: z.boolean(),
  hab_auto_matricula: z.boolean(),
  asistencias_minimas: z.string().optional(),
  alerta_inasistencias: z.boolean(),
  cantidad_inasistencias_alerta: z.string().optional(),
});

// ── Searchable maestro picker ────────────────────────────────────────────────
function MaestroSearchPicker({
  personas, value, onChange,
}: { personas: any[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = personas.find(p => p.id === value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return personas.filter(p => {
      const full = `${p.nombres} ${p.apellidos}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return !q || full.includes(q);
    }).slice(0, 60);
  }, [personas, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected && !open) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-background text-sm">
        <div>
          <span className="font-medium">{selected.nombres} {selected.apellidos}</span>
          <span className="text-xs text-muted-foreground ml-2">({getAcademiaMaestroTipo(selected)})</span>
        </div>
        <button type="button" onClick={() => { onChange(""); setQuery(""); }}
          className="text-muted-foreground hover:text-destructive ml-2">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar maestro por nombre..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-8 text-sm"
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-center text-muted-foreground">Sin resultados</div>
          ) : filtered.map(p => (
            <div key={p.id}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/60 text-sm"
              onMouseDown={() => { onChange(p.id); setQuery(""); setOpen(false); }}>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {p.nombres[0]}{p.apellidos[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.nombres} {p.apellidos}</p>
                <p className="text-[10px] text-muted-foreground">{getAcademiaMaestroTipo(p)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MateriaFormDialog({ periodoId }: { periodoId: string }) {
  const [open, setOpen] = useState(false);
  const createMateria = useCreateMateria();
  const { data: personas } = usePersonas();
  const { data: aulas } = useAulas();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: "", codigo: "", descripcion: "", horario: "",
      maestro_id: "", aula_id: "", cupos: "",
      hab_calificaciones: true, hab_asistencia: true, hab_auto_matricula: false,
      asistencias_minimas: "0", alerta_inasistencias: false, cantidad_inasistencias_alerta: "0",
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const maestro = personas?.find(p => p.id === values.maestro_id);
      const aula = aulas?.find(a => a.id === values.aula_id);
      await createMateria.mutateAsync({
        periodo_id: periodoId,
        nombre: values.nombre,
        codigo: values.codigo || undefined,
        descripcion: values.descripcion || undefined,
        horario: values.horario || undefined,
        maestro_id: values.maestro_id || undefined,
        maestro_nombre: maestro ? `${maestro.nombres} ${maestro.apellidos}` : undefined,
        aula_id: values.aula_id || undefined,
        aula: aula?.nombre || undefined,
        cupos: values.cupos ? parseInt(values.cupos) : undefined,
        hab_calificaciones: values.hab_calificaciones,
        hab_asistencia: values.hab_asistencia,
        hab_auto_matricula: values.hab_auto_matricula,
        asistencias_minimas: parseInt(values.asistencias_minimas || "0"),
        alerta_inasistencias: values.alerta_inasistencias,
        cantidad_inasistencias_alerta: parseInt(values.cantidad_inasistencias_alerta || "0"),
      });
      toast.success("Materia creada");
      form.reset();
      setOpen(false);
    } catch {
      toast.error("Error al crear la materia");
    }
  };

  const maestros = (personas || []).filter(isAcademiaMaestro);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Nueva materia</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Materia</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl><Input placeholder="Ej: Evangelismo Sobrenatural" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="codigo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl><Input placeholder="Ej: MAT-01" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="descripcion" render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl><Textarea placeholder="Descripción de la materia..." {...field} rows={2} /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              {/* Maestro — buscador */}
              <FormField control={form.control} name="maestro_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Maestro</FormLabel>
                  <MaestroSearchPicker
                    personas={maestros}
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                  <p className="text-[10px] text-muted-foreground">Seminario, Discipulado, Mentor, etc.</p>
                </FormItem>
              )} />
              <FormField control={form.control} name="aula_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Aula</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar aula" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(aulas || []).filter(a => a.activo).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.nombre} {a.sede ? `(${a.sede})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="horario" render={({ field }) => (
                <FormItem>
                  <FormLabel>Horario</FormLabel>
                  <FormControl><Input placeholder="Ej: 7:00 pm a 9:00 pm" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="cupos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cupos</FormLabel>
                  <FormControl><Input type="number" min={0} placeholder="Sin límite" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Habilitaciones</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField control={form.control} name="hab_calificaciones" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-xs">Calificaciones</FormLabel>
                      <FormDescription className="text-[10px]">Habilitar notas</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="hab_asistencia" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-xs">Asistencia</FormLabel>
                      <FormDescription className="text-[10px]">Controlar asistencia</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="hab_auto_matricula" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-xs">Auto matrícula</FormLabel>
                      <FormDescription className="text-[10px]">Permitir auto inscripción</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Control de asistencia</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="asistencias_minimas" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Asistencias mínimas</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="cantidad_inasistencias_alerta" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Cant. inasistencias (alerta)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="alerta_inasistencias" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="text-xs !mt-0">Habilitar alerta de inasistencias</FormLabel>
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMateria.isPending}>
                {createMateria.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
