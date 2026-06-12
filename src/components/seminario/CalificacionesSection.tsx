import { useState, useMemo } from "react";
import { useProgramas, usePeriodos, useOfertas, useCalificacionesMatriz, useSaveCalificacion, useRecalcularNotaFinal } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Calculator, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";

export default function CalificacionesSection() {
  const can = useCan();
  const canEdit = can("seminario:calificacion_edit");
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const [ofertaId, setOfertaId] = useState("");
  const effOf = ofertaId || (ofertas as any[])?.[0]?.id || "";
  const { data } = useCalificacionesMatriz(effOf);
  const save = useSaveCalificacion();
  const recalc = useRecalcularNotaFinal();
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("_all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const ofertaSel = (ofertas as any[] || []).find((o: any) => o.id === effOf);
  const totalPeso = useMemo(() => (data?.evaluaciones || []).reduce((a: number, e: any) => a + Number(e.peso || 0), 0), [data]);

  const getKey = (imId: string, evId: string) => `${imId}_${evId}`;
  const getNotaActual = (imId: string, evId: string) => {
    const key = getKey(imId, evId);
    if (dirty[key] !== undefined) return dirty[key];
    return data?.notas?.[key]?.nota?.toString() ?? "";
  };

  const calcDefinitiva = (imId: string) => {
    if (!data?.evaluaciones?.length) return null;
    let acc = 0, sumPeso = 0;
    for (const ev of data.evaluaciones) {
      const v = getNotaActual(imId, ev.id);
      if (v === "" || v === undefined || isNaN(Number(v))) return null;
      acc += Number(v) * Number(ev.peso || 0);
      sumPeso += Number(ev.peso || 0);
    }
    if (sumPeso === 0) return null;
    return Math.round((acc / sumPeso) * 100) / 100;
  };

  const handleGuardarTodo = async () => {
    const entries = Object.entries(dirty);
    if (!entries.length) { toast.info("Sin cambios"); return; }
    try {
      const imIdsAfectadas = new Set<string>();
      for (const [key, val] of entries) {
        const [imId, evId] = key.split("_");
        const existing = data?.notas?.[key];
        const nota = val === "" ? null : Number(val);
        if (nota !== null && (nota < 0 || nota > 5)) {
          toast.error("Las notas deben estar entre 0 y 5");
          return;
        }
        await save.mutateAsync({
          id: existing?.id,
          inscripcion_materia_id: imId,
          evaluacion_id: evId,
          nota,
        });
        imIdsAfectadas.add(imId);
      }
      // Recalcular nota_final de cada estudiante afectado
      for (const imId of imIdsAfectadas) {
        await recalc.mutateAsync({ inscripcion_materia_id: imId });
      }
      setDirty({});
      toast.success("Notas guardadas y recalculadas");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Calificaciones</h2>
          <p className="text-xs text-muted-foreground">Libreta del docente · escala 0–5 · aprobado ≥ 3.0</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effPer} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>{(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effOf} onValueChange={setOfertaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Materia" /></SelectTrigger>
            <SelectContent>
              {(ofertas as any[] || []).map((o: any) => (
                <SelectItem key={o.id} value={o.id}>{o.sem_materias?.codigo} · {o.sem_materias?.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button size="sm" onClick={handleGuardarTodo} disabled={save.isPending || recalc.isPending || !Object.keys(dirty).length}>
              <Save className="h-4 w-4 mr-1" />Guardar {Object.keys(dirty).length || ""}
            </Button>
          )}
        </div>
      </div>

      {ofertaSel && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between text-sm">
            <span><span className="font-medium">{ofertaSel.sem_materias?.nombre}</span> · {ofertaSel.docente_nombre || "Sin docente"}</span>
            <Badge variant={totalPeso === 100 ? "default" : "secondary"}>Peso total: {totalPeso}%</Badge>
          </CardContent>
        </Card>
      )}

      {!effOf ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona una materia.</CardContent></Card>
      ) : !data?.estudiantes?.length ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sin estudiantes matriculados en esta oferta.</CardContent></Card>
      ) : !data.evaluaciones.length ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Crea evaluaciones primero en la pestaña Evaluaciones.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-muted/50 min-w-[180px]">Estudiante</th>
                  {data.evaluaciones.map((e: any) => (
                    <th key={e.id} className="text-center p-2 min-w-[80px]">
                      <div>{e.nombre}</div>
                      <div className="text-[10px] text-muted-foreground">{e.peso}%</div>
                    </th>
                  ))}
                  <th className="text-center p-2 bg-primary/5 min-w-[90px]">Definitiva</th>
                </tr>
              </thead>
              <tbody>
                {data.estudiantes.map((im: any) => {
                  const p = im.sem_inscripciones?.personas;
                  const def = calcDefinitiva(im.id);
                  return (
                    <tr key={im.id} className="border-b hover:bg-muted/20">
                      <td className="p-2 sticky left-0 bg-card font-medium">
                        {p?.nombres} {p?.apellidos}
                        <div className="text-[10px] text-muted-foreground font-normal">{p?.documento}</div>
                      </td>
                      {data.evaluaciones.map((e: any) => {
                        const key = getKey(im.id, e.id);
                        return (
                          <td key={e.id} className="p-1 text-center">
                            <Input
                              type="number" min={0} max={5} step={0.1}
                              value={getNotaActual(im.id, e.id)}
                              disabled={!canEdit}
                              onChange={(ev) => setDirty({ ...dirty, [key]: ev.target.value })}
                              className="h-8 text-center text-xs w-16 mx-auto"
                            />
                          </td>
                        );
                      })}
                      <td className="p-2 text-center bg-primary/5">
                        {def !== null ? (
                          <Badge variant={def >= 3.0 ? "default" : "destructive"}>{def.toFixed(2)}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {Object.keys(dirty).length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calculator className="h-3 w-3" />Tienes {Object.keys(dirty).length} cambios sin guardar
        </p>
      )}
    </div>
  );
}
