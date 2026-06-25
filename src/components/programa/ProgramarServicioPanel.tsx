import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Save, Users, Briefcase, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProgMinisterios, useProgCargos, useProgServidores, useProgDisponibilidad } from "@/hooks/usePrograma";
import { usePersonas } from "@/hooks/useDatabase";

type Reunion = { id: string; nombre: string; fecha: string; hora?: string | null; lugar?: string | null };

type AsignacionDraft = { ministerio_id: string; cargo_id: string; persona_id: string | "" };

export default function ProgramarServicioPanel({ reunion, onBack }: { reunion: Reunion; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: ministerios = [] } = useProgMinisterios();
  const { data: cargos = [] } = useProgCargos();
  const { data: servidores = [] } = useProgServidores();
  const { data: personas = [] } = usePersonas();
  const { data: disponibilidad = [] } = useProgDisponibilidad();

  // Cargar ministerios ya asociados al servicio
  const { data: servMin = [], isLoading: loadingSM } = useQuery({
    queryKey: ["servicio_ministerios", reunion.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicio_ministerios" as any)
        .select("*")
        .eq("servicio_id", reunion.id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Cargar programación existente
  const { data: progExist = [] } = useQuery({
    queryKey: ["servicio_programacion", reunion.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicio_programacion" as any)
        .select("*")
        .eq("servicio_id", reunion.id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [selectedMinisterios, setSelectedMinisterios] = useState<Set<string>>(new Set());
  const [asignaciones, setAsignaciones] = useState<AsignacionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Inicializar desde DB
  useEffect(() => {
    if (servMin.length > 0) setSelectedMinisterios(new Set(servMin.map((s) => s.ministerio_id)));
  }, [servMin]);
  useEffect(() => {
    if (progExist.length > 0) {
      setAsignaciones(progExist.map((p: any) => ({ ministerio_id: p.ministerio_id, cargo_id: p.cargo_id, persona_id: p.persona_id })));
    }
  }, [progExist]);

  const personasMap = useMemo(() => new Map(personas.map((p: any) => [p.id, p])), [personas]);
  const minMap = useMemo(() => new Map(ministerios.map((m) => [m.id, m])), [ministerios]);

  const isUnavailable = (personaId: string) =>
    disponibilidad.some(
      (d) => d.persona_id === personaId && d.fecha_inicio <= reunion.fecha && d.fecha_fin >= reunion.fecha
    );

  /** Servidores disponibles para un cargo dentro de un ministerio. */
  const candidatosFor = (ministerio_id: string, cargo_id: string) => {
    return servidores
      .filter((s) => s.activo && s.ministerio_id === ministerio_id && (s.cargo_id === cargo_id || s.cargo_id === null))
      .map((s) => {
        const p: any = personasMap.get(s.persona_id);
        return p ? { persona_id: s.persona_id, label: `${p.nombres} ${p.apellidos}`, unavailable: isUnavailable(s.persona_id) } : null;
      })
      .filter(Boolean) as { persona_id: string; label: string; unavailable: boolean }[];
  };

  const toggleMinisterio = (id: string) => {
    setSelectedMinisterios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setAsignaciones((a) => a.filter((x) => x.ministerio_id !== id));
      } else next.add(id);
      return next;
    });
  };

  const setAsignacionPersona = (ministerio_id: string, cargo_id: string, persona_id: string) => {
    setAsignaciones((prev) => {
      const rest = prev.filter((a) => !(a.ministerio_id === ministerio_id && a.cargo_id === cargo_id));
      if (persona_id) rest.push({ ministerio_id, cargo_id, persona_id });
      return rest;
    });
  };

  const getAsignacion = (ministerio_id: string, cargo_id: string) =>
    asignaciones.find((a) => a.ministerio_id === ministerio_id && a.cargo_id === cargo_id);

  const guardar = async () => {
    setSaving(true);
    try {
      // 1. Sincronizar ministerios
      await supabase.from("servicio_ministerios" as any).delete().eq("servicio_id", reunion.id);
      if (selectedMinisterios.size > 0) {
        const rows = Array.from(selectedMinisterios).map((mid) => ({ servicio_id: reunion.id, ministerio_id: mid }));
        const { error } = await supabase.from("servicio_ministerios" as any).insert(rows);
        if (error) throw error;
      }
      // 2. Sincronizar programación
      await supabase.from("servicio_programacion" as any).delete().eq("servicio_id", reunion.id);
      if (asignaciones.length > 0) {
        const rows = asignaciones.map((a) => ({
          servicio_id: reunion.id,
          ministerio_id: a.ministerio_id,
          cargo_id: a.cargo_id,
          persona_id: a.persona_id,
        }));
        const { error } = await supabase.from("servicio_programacion" as any).insert(rows);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["servicio_ministerios", reunion.id] });
      qc.invalidateQueries({ queryKey: ["servicio_programacion", reunion.id] });
      toast.success("Programación guardada");
    } catch (e: any) {
      toast.error("Error al guardar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loadingSM) return <div className="p-8 text-center text-muted-foreground">Cargando…</div>;

  const ministeriosSeleccionados = ministerios.filter((m) => selectedMinisterios.has(m.id));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button onClick={guardar} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar programación"}
        </Button>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="p-5">
          <h2 className="text-xl font-bold">Programar servicio: {reunion.nombre}</h2>
          <p className="text-sm text-muted-foreground">
            {reunion.fecha} {reunion.hora ? `· ${reunion.hora}` : ""} {reunion.lugar ? `· ${reunion.lugar}` : ""}
          </p>
        </CardContent>
      </Card>

      {/* Selector de ministerios para esta reunión */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Ministerios para esta reunión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ministerios.map((m) => {
              const active = selectedMinisterios.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMinisterio(m.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted/50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: m.color || "#2563eb" }} />
                  {m.nombre}
                </button>
              );
            })}
            {ministerios.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay ministerios creados.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Por cada ministerio: cargos + selector de servidor */}
      {ministeriosSeleccionados.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Selecciona uno o más ministerios para comenzar a asignar servidores.
          </CardContent>
        </Card>
      ) : (
        ministeriosSeleccionados.map((m) => {
          const cargosMin = cargos.filter((c) => c.ministerio_id === m.id && c.activo !== false);
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full" style={{ background: m.color || "#2563eb" }} />
                  {m.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cargosMin.length === 0 ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Sin cargos definidos en este ministerio.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cargosMin.map((c) => {
                      const candidatos = candidatosFor(m.id, c.id);
                      const current = getAsignacion(m.id, c.id);
                      return (
                        <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-2 md:items-center border-b pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <Label className="text-sm font-medium">{c.nombre}</Label>
                            <p className="text-[10px] text-muted-foreground">
                              {candidatos.length} servidor(es) en este cargo
                            </p>
                          </div>
                          <Select
                            value={current?.persona_id || ""}
                            onValueChange={(v) => setAsignacionPersona(m.id, c.id, v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar servidor…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Sin asignar —</SelectItem>
                              {candidatos.map((cand) => (
                                <SelectItem
                                  key={cand.persona_id}
                                  value={cand.persona_id}
                                  disabled={cand.unavailable}
                                >
                                  {cand.label} {cand.unavailable ? "· No disponible" : ""}
                                </SelectItem>
                              ))}
                              {candidatos.length === 0 && (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                  Sin servidores asignados a este ministerio/cargo
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
