import { useState, useMemo } from "react";
import { useUrlParam, useUrlNumber } from "@/hooks/useUrlParam";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProgramas, usePeriodos, useOfertas, useCalificacionesMatriz, useSaveCalificacion, useRecalcularNotaFinal } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Calculator, Search, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import SectionHero from "@/components/shell/SectionHero";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { logSemAudit } from "@/lib/seminarioAudit";

export default function CalificacionesSection() {
  const can = useCan();
  const canEdit = can("seminario:calificacion_edit");
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useUrlParam("cal_prog");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useUrlParam("cal_per");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const [ofertaId, setOfertaId] = useUrlParam("cal_of");
  const effOf = ofertaId || (ofertas as any[])?.[0]?.id || "";
  const { data, isLoading: loadingMatriz } = useCalificacionesMatriz(effOf);
  const save = useSaveCalificacion();
  const recalc = useRecalcularNotaFinal();
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [q, setQ] = useUrlParam("cal_q");
  const [filtroEstado, setFiltroEstado] = useUrlParam("cal_est", "_all");
  const [page, setPage] = useUrlNumber("cal_page", 1);
  const [detalle, setDetalle] = useState<any>(null);
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
      logSemAudit({
        action: "calificacion.guardada",
        oferta_id: effOf,
        details: { cambios: entries.length, estudiantes_afectados: imIdsAfectadas.size, materia: ofertaSel?.sem_materias?.codigo },
      });
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
      ) : loadingMatriz ? (
        <Card><CardContent className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
        </CardContent></Card>
      ) : !data?.estudiantes?.length ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sin estudiantes matriculados en esta oferta.</CardContent></Card>
      ) : !data.evaluaciones.length ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Crea evaluaciones primero en la pestaña Evaluaciones.</CardContent></Card>
      ) : (() => {
        const term = q.trim().toLowerCase();
        const filtrados = (data.estudiantes as any[]).filter((im: any) => {
          const p = im.sem_inscripciones?.personas;
          const full = `${p?.nombres || ""} ${p?.apellidos || ""} ${p?.documento || ""}`.toLowerCase();
          if (term && !full.includes(term)) return false;
          if (filtroEstado !== "_all") {
            const def = calcDefinitiva(im.id);
            if (filtroEstado === "aprobada" && !(def != null && def >= 3.0)) return false;
            if (filtroEstado === "reprobada" && !(def != null && def < 3.0)) return false;
            if (filtroEstado === "sin_nota" && def != null) return false;
          }
          return true;
        });
        const tp = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
        const safePage = Math.min(page, tp);
        const rows = filtrados.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
        return (
          <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar estudiante por nombre o documento…" className="pl-8 h-9" />
            </div>
            <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); setPage(1); }}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                <SelectItem value="aprobada">Aprobados</SelectItem>
                <SelectItem value="reprobada">Reprobados</SelectItem>
                <SelectItem value="sin_nota">Sin nota completa</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{filtrados.length} de {data.estudiantes.length}</span>
          </div>
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
                  {rows.map((im: any) => {
                    const p = im.sem_inscripciones?.personas;
                    const def = calcDefinitiva(im.id);
                    return (
                      <tr key={im.id} className="border-b hover:bg-muted/20">
                        <td className="p-2 sticky left-0 bg-card font-medium cursor-pointer hover:underline" onClick={() => setDetalle({ im, persona: p, def: calcDefinitiva(im.id) })}>
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
                  {rows.length === 0 && (
                    <tr><td colSpan={data.evaluaciones.length + 2} className="p-6 text-center text-muted-foreground text-xs">Sin resultados.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {tp > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <span className="text-xs">Página {safePage} de {tp}</span>
              <Button size="sm" variant="outline" onClick={() => setPage(Math.min(tp, safePage + 1))} disabled={safePage === tp}><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          )}
          </>
        );
      })()}

      {Object.keys(dirty).length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calculator className="h-3 w-3" />Tienes {Object.keys(dirty).length} cambios sin guardar
        </p>
      )}

      <Dialog open={!!detalle} onOpenChange={(v) => !v && setDetalle(null)}>
        {detalle && (
          <DialogContent>
            <DialogHeader><DialogTitle>Calificaciones de {detalle.persona?.nombres} {detalle.persona?.apellidos}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Documento:</span> {detalle.persona?.documento || "—"}</div>
                <div><span className="text-muted-foreground">Materia:</span> {ofertaSel?.sem_materias?.nombre}</div>
              </div>
              <div className="border rounded divide-y">
                {(data?.evaluaciones || []).map((e: any) => {
                  const v = getNotaActual(detalle.im.id, e.id);
                  const num = v === "" ? null : Number(v);
                  return (
                    <div key={e.id} className="p-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium">{e.nombre}</div>
                        <div className="text-[10px] text-muted-foreground">{e.tipo} · {e.peso}% · {e.fecha || "sin fecha"}</div>
                      </div>
                      <Badge variant={num != null && num >= 3 ? "default" : num != null ? "destructive" : "outline"}>
                        {num != null ? num.toFixed(2) : "—"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">Nota definitiva</span>
                {detalle.def != null
                  ? <Badge variant={detalle.def >= 3 ? "default" : "destructive"} className="text-base">{detalle.def.toFixed(2)}</Badge>
                  : <span className="text-xs text-muted-foreground">Incompleta</span>}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
