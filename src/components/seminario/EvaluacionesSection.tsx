import { useState, useMemo } from "react";
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
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const [ofertaId, setOfertaId] = useState("");
  const effOf = ofertaId || (ofertas as any[])?.[0]?.id || "";
  const { data: evaluaciones } = useEvaluaciones(effOf);
  const upsert = useUpsertEvaluacion();
  const del = useDeleteEvaluacion();
  const [editing, setEditing] = useState<any>(null);
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("_all");
  const [page, setPage] = useState(1);
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
          <Select value={effOf} onValueChange={setOfertaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Materia (oferta)" /></SelectTrigger>
            <SelectContent>
              {(ofertas as any[] || []).map((o: any) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.sem_materias?.codigo} · {o.sem_materias?.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      ) : filtradas.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sin evaluaciones que coincidan con los filtros.</CardContent></Card>
      ) : (
        <>
        <div className="grid gap-2 md:grid-cols-2">
          {pageRows.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{e.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1 text-[10px]">{TIPOS.find(t => t.v === e.tipo)?.l || e.tipo}</Badge>
                    {e.peso}% · {e.fecha || "sin fecha"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge variant={e.publicada ? "default" : "outline"} className="text-[10px]">
                    {e.publicada ? <><Eye className="h-3 w-3 mr-1" />Publicada</> : <><EyeOff className="h-3 w-3 mr-1" />Borrador</>}
                  </Badge>
                  {canEdit && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog onConfirm={async () => { await del.mutateAsync(e.id); logSemAudit({ action: "evaluacion.eliminada", oferta_id: effOf, details: { evaluacion_id: e.id, nombre: e.nombre } }); toast.success("Eliminada"); }}
                        trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <span className="text-xs">Página {page} de {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        )}
        </>
      )}
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
