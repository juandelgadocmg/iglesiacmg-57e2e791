import { useState, useMemo } from "react";
import { useUrlParam, useUrlNumber } from "@/hooks/useUrlParam";
import { useProgramas, usePeriodos, useOfertas, useEvaluaciones, useUpsertEvaluacion, useDeleteEvaluacion } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertTriangle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useCan } from "@/hooks/useCan";
import { logSemAudit } from "@/lib/seminarioAudit";
import SearchableCombobox from "./SearchableCombobox";

const TIPOS = [
  { v: "quiz", l: "Quiz" },
  { v: "parcial", l: "Parcial" },
  { v: "final", l: "Final" },
  { v: "taller", l: "Taller" },
  { v: "asistencia", l: "Asistencia" },
];

export default function EvaluacionesSection() {
  const can = useCan();
  const canEdit = can("seminario:evaluacion_crud");
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useUrlParam("ev_prog");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useUrlParam("ev_per");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const [ofertaId, setOfertaId] = useUrlParam("ev_of");
  const effOf = ofertaId || (ofertas as any[])?.[0]?.id || "";
  const { data: evaluaciones, isLoading: loadingEvals } = useEvaluaciones(effOf);
  const upsert = useUpsertEvaluacion();
  const del = useDeleteEvaluacion();
  const [editing, setEditing] = useState<any>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const [q, setQ] = useUrlParam("ev_q");
  const [tipoFiltro, setTipoFiltro] = useUrlParam("ev_tipo", "_all");
  const [page, setPage] = useUrlNumber("ev_page", 1);
  const PAGE_SIZE = 8;

  const totalPeso = useMemo(() => (evaluaciones || []).reduce((a: number, e: any) => a + Number(e.peso || 0), 0), [evaluaciones]);
  const ofertaSel = (ofertas as any[] || []).find((o: any) => o.id === effOf);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (evaluaciones || []).filter((e: any) => {
      if (tipoFiltro !== "_all" && e.tipo !== tipoFiltro) return false;
      if (term && !e.nombre?.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [evaluaciones, q, tipoFiltro]);
  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageRows = filtradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useMemo(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const handleSave = async (f: any) => {
    try {
      const isEdit = !!f.id;
      const saved = await upsert.mutateAsync({ ...f, oferta_id: effOf });
      logSemAudit({
        action: isEdit ? "evaluacion.editada" : "evaluacion.creada",
        oferta_id: effOf,
        details: { evaluacion_id: (saved as any)?.id, nombre: f.nombre, tipo: f.tipo, peso: f.peso },
      });
      toast.success("Evaluación guardada");
      setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Evaluaciones</h2>
          <p className="text-xs text-muted-foreground">Define quices, parciales, finales y trabajos por materia</p>
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
          <SearchableCombobox
            width="w-64"
            value={effOf}
            onChange={setOfertaId}
            placeholder="Buscar materia para evaluar…"
            emptyLabel="Sin materias en el periodo"
            items={(ofertas as any[] || []).map((o: any) => ({
              id: o.id,
              label: `${o.sem_materias?.codigo || ""} · ${o.sem_materias?.nombre || ""}`.trim(),
              sub: o.docente_nombre || undefined,
            }))}
          />
          {canEdit && effOf && (
            <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing({ nombre: "", tipo: "quiz", peso: 0, fecha: "", publicada: false })}>
                  <Plus className="h-4 w-4 mr-1" />Nueva
                </Button>
              </DialogTrigger>
              {editing && <EvalDialog data={editing} onSave={handleSave} pending={upsert.isPending} />}
            </Dialog>
          )}
        </div>
      </div>

      {ofertaSel && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between text-sm">
            <span>
              <span className="font-medium">{ofertaSel.sem_materias?.nombre}</span>
              {" · "}{ofertaSel.docente_nombre || "Sin docente"}
            </span>
            <Badge variant={totalPeso === 100 ? "default" : "destructive"}>
              {totalPeso !== 100 && <AlertTriangle className="h-3 w-3 mr-1" />}
              Peso total: {totalPeso}%
            </Badge>
          </CardContent>
        </Card>
      )}

      {effOf && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar evaluación por nombre…" className="pl-8 h-9" />
          </div>
          <Select value={tipoFiltro} onValueChange={(v) => { setTipoFiltro(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos los tipos</SelectItem>
              {TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtradas.length} resultados</span>
        </div>
      )}

      {!effOf ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona una materia para gestionar sus evaluaciones.</CardContent></Card>
      ) : loadingEvals ? (
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3"><div className="h-4 w-1/2 bg-muted rounded animate-pulse mb-2" /><div className="h-3 w-1/3 bg-muted rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{(evaluaciones || []).length === 0 ? "Aún no hay evaluaciones para esta materia. Crea la primera con el botón \"Nueva\"." : "Sin evaluaciones que coincidan con los filtros."}</CardContent></Card>
      ) : (
        <>
        <div className="grid gap-2 md:grid-cols-2">
          {pageRows.map((e: any) => (
            <Card key={e.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setDetalle(e)}>
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{e.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1 text-[10px]">{TIPOS.find(t => t.v === e.tipo)?.l || e.tipo}</Badge>
                    {e.peso}% · {e.fecha || "sin fecha"}
                  </p>
                </div>
                <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                  <Badge variant={e.publicada ? "default" : "outline"} className="text-[10px]">
                    {e.publicada ? <><Eye className="h-3 w-3 mr-1" />Publicada</> : <><EyeOff className="h-3 w-3 mr-1" />Borrador</>}
                  </Badge>
                  {canEdit && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog onConfirm={async () => { await del.mutateAsync(e.id); logSemAudit({ action: "evaluacion.eliminada", oferta_id: effOf, details: { evaluacion_id: e.id, nombre: e.nombre } }); toast.success("Eliminada"); }}
                        trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <span className="text-xs">Página {page} de {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        )}
        </>
      )}

      <Dialog open={!!detalle} onOpenChange={(v) => !v && setDetalle(null)}>
        {detalle && (
          <DialogContent>
            <DialogHeader><DialogTitle>Detalle de evaluación</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{detalle.nombre}</span></div>
              <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline">{TIPOS.find(t => t.v === detalle.tipo)?.l || detalle.tipo}</Badge></div>
              <div><span className="text-muted-foreground">Peso:</span> {detalle.peso}%</div>
              <div><span className="text-muted-foreground">Fecha:</span> {detalle.fecha || "Sin fecha"}</div>
              <div><span className="text-muted-foreground">Estado:</span> {detalle.publicada ? "Publicada (visible para estudiantes)" : "Borrador"}</div>
              <div><span className="text-muted-foreground">Materia:</span> {ofertaSel?.sem_materias?.nombre || "—"}</div>
              <div><span className="text-muted-foreground">Docente:</span> {ofertaSel?.docente_nombre || "Sin docente"}</div>
              <div><span className="text-muted-foreground">ID:</span> <span className="font-mono text-xs">{detalle.id}</span></div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function EvalDialog({ data, onSave, pending }: any) {
  const [f, setF] = useState(data);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{f.id ? "Editar" : "Nueva"} evaluación</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nombre *</Label><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Peso (%)</Label><Input type="number" min={0} max={100} value={f.peso} onChange={(e) => setF({ ...f, peso: +e.target.value })} /></div>
        </div>
        <div><Label>Fecha</Label><Input type="date" value={f.fecha || ""} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="pub" checked={!!f.publicada} onChange={(e) => setF({ ...f, publicada: e.target.checked })} />
          <Label htmlFor="pub">Visible para estudiantes</Label>
        </div>
        <Button disabled={pending || !f.nombre} onClick={() => onSave(f)} className="w-full">
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </DialogContent>
  );
}
