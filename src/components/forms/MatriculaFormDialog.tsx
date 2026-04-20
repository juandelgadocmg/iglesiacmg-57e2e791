import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, X, Check } from "lucide-react";
import { usePersonas } from "@/hooks/useDatabase";
import { useCreateMatricula, useEscuelas, useAllPeriodos, useMaterias, useAulas } from "@/hooks/useAcademia";
import { useConceptosPago, useCreatePagosForMatricula } from "@/hooks/useAcademiaExtras";
import { toast } from "sonner";

const schema = z.object({
  persona_id: z.string().min(1, "Selecciona una persona"),
  curso_id: z.string().min(1, "Selecciona una escuela"),
  periodo_id: z.string().min(1, "Selecciona un período"),
  materia_id: z.string().optional(),
  sede: z.string().optional(),
});

interface Props {
  cursoId?: string;
  periodoId?: string;
  materiaId?: string;
}

// ── Searchable person picker ──────────────────────────────────────────────────
function PersonaSearchPicker({
  personas,
  value,
  onChange,
}: {
  personas: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = personas.find(p => p.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return personas.slice(0, 50); // show first 50 when no query
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return personas.filter(p => {
      const full = `${p.nombres} ${p.apellidos}`.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const doc = (p.documento || "").toLowerCase();
      return full.includes(q) || doc.includes(q);
    }).slice(0, 50);
  }, [personas, query]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (persona: any) => {
    onChange(persona.id);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected display or search input */}
      {selected && !open ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-background text-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {selected.nombres[0]}{selected.apellidos[0]}
            </div>
            <span className="font-medium">{selected.nombres} {selected.apellidos}</span>
            {selected.documento && (
              <span className="text-xs text-muted-foreground">· {selected.documento}</span>
            )}
          </div>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, apellido o documento..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="pl-9"
            autoComplete="off"
          />
        </div>
      )}

      {/* Dropdown results */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-center text-muted-foreground">
              No se encontraron personas
            </div>
          ) : (
            <>
              {!query && (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b bg-muted/30">
                  Escribe para filtrar · Mostrando {filtered.length} de {personas.length}
                </div>
              )}
              {filtered.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors ${
                    p.id === value ? "bg-primary/5" : ""
                  }`}
                  onMouseDown={() => handleSelect(p)}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {p.nombres[0]}{p.apellidos[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nombres} {p.apellidos}</p>
                    {(p.documento || p.tipo_persona) && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[p.documento, p.tipo_persona].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {p.id === value && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function MatriculaFormDialog({ cursoId, periodoId, materiaId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: personas } = usePersonas();
  const { data: escuelas } = useEscuelas();
  const { data: allPeriodos } = useAllPeriodos();
  const { data: aulas } = useAulas();
  const createMatricula = useCreateMatricula();
  const createPagos = useCreatePagosForMatricula();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      persona_id: "",
      curso_id: cursoId || "",
      periodo_id: periodoId || "",
      materia_id: materiaId || "",
      sede: "",
    },
  });

  const watchCursoId = form.watch("curso_id");
  const watchPeriodoId = form.watch("periodo_id");

  const periodosFiltered = useMemo(() => {
    if (!watchCursoId) return [];
    return (allPeriodos || []).filter((p: any) => p.escuela_id === watchCursoId);
  }, [allPeriodos, watchCursoId]);

  const selectedPeriodo = useMemo(
    () => periodosFiltered.find((p: any) => p.id === watchPeriodoId),
    [periodosFiltered, watchPeriodoId]
  );
  const isPeriodoCerrado = selectedPeriodo?.estado === "Cerrado";

  const { data: materias } = useMaterias(watchPeriodoId || null);
  const { data: conceptos } = useConceptosPago(watchCursoId || null);

  const sedes = useMemo(() => {
    const set = new Set<string>();
    (aulas || []).forEach((a: any) => { if (a.sede) set.add(a.sede); });
    return Array.from(set);
  }, [aulas]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      // Validar que el período no esté cerrado
      const periodo = (allPeriodos || []).find((p: any) => p.id === values.periodo_id);
      if (periodo?.estado === "Cerrado") {
        toast.error("Este período está cerrado, no admite nuevas matrículas");
        return;
      }
      const selectedMateriaId = values.materia_id || materiaId;
      if (!selectedMateriaId && materias && materias.length > 0) {
        toast.error("Debe seleccionar una materia");
        return;
      }
      const result = await createMatricula.mutateAsync({
        curso_id: values.curso_id,
        persona_id: values.persona_id,
        periodo_id: values.periodo_id || undefined,
        materia_id: selectedMateriaId || undefined,
      });
      if (conceptos?.length) {
        await createPagos.mutateAsync({
          matriculaId: result.id,
          conceptoIds: conceptos.map((c: any) => c.id),
        });
      }
      toast.success("Alumno matriculado");
      form.reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(
        err.message?.includes("duplicate")
          ? "Esta persona ya está matriculada en esta materia"
          : err.message || "Error"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Matricular</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Matricular alumno</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Persona — searchable picker */}
            <FormField control={form.control} name="persona_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Persona</FormLabel>
                <PersonaSearchPicker
                  personas={personas || []}
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )} />

            {!cursoId && (
              <FormField control={form.control} name="curso_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Escuela</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("periodo_id", ""); form.setValue("materia_id", ""); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar escuela" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(escuelas || []).map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {sedes.length > 0 && (
              <FormField control={form.control} name="sede" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar sede (opcional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {sedes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            {!periodoId && (
              <FormField control={form.control} name="periodo_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Período</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.setValue("materia_id", ""); }} value={field.value} disabled={!watchCursoId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar período" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {periodosFiltered.map((p: any) => (
                        <SelectItem key={p.id} value={p.id} disabled={p.estado === "Cerrado"}>
                          <span className="flex items-center gap-2">
                            {p.nombre}
                            {p.estado === "Cerrado" && (
                              <span className="text-[10px] text-muted-foreground">(Cerrado)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isPeriodoCerrado && (
                    <p className="text-xs text-destructive">Este período está cerrado, no admite nuevas matrículas.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {!materiaId && materias && materias.length > 0 && (
              <FormField control={form.control} name="materia_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Materia <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!watchPeriodoId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(materias || []).map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            )}

            {conceptos && conceptos.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Conceptos de pago que se crearán:</p>
                <div className="space-y-1">
                  {conceptos.map((c: any) => (
                    <div key={c.id} className="flex justify-between text-xs">
                      <span>{c.nombre}</span>
                      <span className="font-medium">${c.monto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMatricula.isPending}>
                {createMatricula.isPending ? "Guardando..." : "Matricular"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
