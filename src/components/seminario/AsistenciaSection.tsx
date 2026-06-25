import { useState, useEffect } from "react";
import { useUrlParam } from "@/hooks/useUrlParam";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProgramas, usePeriodos, useOfertas, useAsistenciaOferta, useSaveAsistencia, useBulkEnrollOferta, useUnenrollMateria } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, UserCheck, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/useCan";
import { logSemAudit } from "@/lib/seminarioAudit";
import SearchableCombobox from "./SearchableCombobox";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

const ESTADOS = [
  { v: "presente", l: "Presente", color: "default" },
  { v: "tarde", l: "Tarde", color: "secondary" },
  { v: "ausente", l: "Ausente", color: "destructive" },
  { v: "justificado", l: "Justificado", color: "outline" },
];

export default function AsistenciaSection() {
  const can = useCan();
  const canEdit = can("seminario:asistencia_edit");
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useUrlParam("as_prog");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useUrlParam("as_per");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const [ofertaId, setOfertaId] = useUrlParam("as_of");
  const effOf = ofertaId || (ofertas as any[])?.[0]?.id || "";
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useUrlParam("as_fecha", today);
  const { data, isLoading: loadingAsist } = useAsistenciaOferta(effOf, fecha);
  const save = useSaveAsistencia();
  const bulkEnroll = useBulkEnrollOferta();
  const unenroll = useUnenrollMateria();
  const [local, setLocal] = useState<Record<string, { estado: string; observacion?: string }>>({});
  const [detalle, setDetalle] = useState<any>(null);
  const [quitar, setQuitar] = useState<{ im: any; persona: any } | null>(null);

  useEffect(() => {
    const init: Record<string, any> = {};
    (data?.estudiantes || []).forEach((e: any) => {
      const a = data?.asistencias?.[e.id];
      init[e.id] = { estado: a?.estado || "presente", observacion: a?.observacion || "" };
    });
    setLocal(init);
  }, [data?.estudiantes, data?.asistencias, fecha]);

  const handleSave = async () => {
    const rows = Object.entries(local).map(([imId, v]) => ({
      id: data?.asistencias?.[imId]?.id,
      inscripcion_materia_id: imId,
      fecha,
      estado: v.estado,
      observacion: v.observacion,
    }));
    try {
      await save.mutateAsync(rows as any);
      const counts = rows.reduce<Record<string, number>>((acc, r) => { acc[r.estado] = (acc[r.estado] || 0) + 1; return acc; }, {});
      logSemAudit({ action: "asistencia.guardada", oferta_id: effOf, details: { fecha, total: rows.length, conteos: counts } });
      toast.success("Asistencia guardada");
    } catch (e: any) { toast.error(e.message); }
  };

  const marcarTodos = (estado: string) => {
    const upd: any = {};
    Object.keys(local).forEach((k) => { upd[k] = { ...local[k], estado }; });
    setLocal(upd);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Asistencia</h2>
          <p className="text-xs text-muted-foreground">Registra asistencia por materia y fecha</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effPer} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>{(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <SearchableCombobox
            width="w-64"
            value={effOf}
            onChange={setOfertaId}
            placeholder="Buscar materia…"
            emptyLabel="Sin materias en el periodo"
            items={(ofertas as any[] || []).map((o: any) => ({
              id: o.id,
              label: `${o.sem_materias?.codigo || ""} · ${o.sem_materias?.nombre || ""}`.trim(),
              sub: o.docente_nombre || undefined,
            }))}
          />
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
        </div>
      </div>

      {!effOf ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona una materia.</CardContent></Card>
      ) : loadingAsist ? (
        <Card><CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
        </CardContent></Card>
      ) : !data?.estudiantes?.length ? (
        <Card><CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Sin estudiantes matriculados en esta materia.</p>
          {canEdit && effOf && effPer && (
            <Button size="sm" onClick={async () => {
              const oferta = (ofertas as any[] || []).find((o: any) => o.id === effOf);
              if (!oferta) return;
              try {
                const r = await bulkEnroll.mutateAsync({
                  oferta_id: effOf,
                  materia_id: oferta.materia_id,
                  periodo_id: effPer,
                  programa_id: effProg || undefined,
                });
                toast.success(`Matriculados ${r.creados} (omitidos ${r.omitidos}, total inscritos ${r.total})`);
              } catch (e: any) { toast.error(e.message); }
            }} disabled={bulkEnroll.isPending}>
              <UserPlus className="h-4 w-4 mr-1" />
              {bulkEnroll.isPending ? "Matriculando…" : "Matricular todos los inscritos del periodo"}
            </Button>
          )}
        </CardContent></Card>
      ) : (
        <>
          {canEdit && (
            <div className="flex gap-1 flex-wrap text-xs items-center">
              <Button size="sm" variant="outline" onClick={async () => {
                const oferta = (ofertas as any[] || []).find((o: any) => o.id === effOf);
                if (!oferta) return;
                try {
                  const r = await bulkEnroll.mutateAsync({
                    oferta_id: effOf, materia_id: oferta.materia_id,
                    periodo_id: effPer, programa_id: effProg || undefined,
                  });
                  if (r.creados > 0) toast.success(`Se matricularon ${r.creados} estudiantes faltantes`);
                  else toast.info("Todos los inscritos ya estaban matriculados");
                } catch (e: any) { toast.error(e.message); }
              }} disabled={bulkEnroll.isPending}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />Matricular faltantes
              </Button>
              <span className="text-muted-foreground self-center mx-1">Marcar todos:</span>

              {ESTADOS.map((e) => (
                <Button key={e.v} size="sm" variant="outline" onClick={() => marcarTodos(e.v)}>{e.l}</Button>
              ))}
              <Button size="sm" onClick={handleSave} disabled={save.isPending} className="ml-auto">
                <Save className="h-4 w-4 mr-1" />Guardar
              </Button>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.estudiantes.map((im: any) => {
                  const p = im.sem_inscripciones?.personas;
                  const cur = local[im.id] || { estado: "presente", observacion: "" };
                  return (
                    <div key={im.id} className="p-3 flex items-center gap-3 flex-wrap">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1 cursor-pointer hover:underline" onClick={() => setDetalle({ im, persona: p, registro: data?.asistencias?.[im.id], current: cur })}>
                        <p className="text-sm font-medium">{p?.nombres} {p?.apellidos}</p>
                        <p className="text-[10px] text-muted-foreground">{p?.documento}</p>
                      </div>
                      <Select value={cur.estado} disabled={!canEdit}
                        onValueChange={(v) => setLocal({ ...local, [im.id]: { ...cur, estado: v } })}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS.map(e => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Observación" disabled={!canEdit}
                        value={cur.observacion || ""}
                        onChange={(e) => setLocal({ ...local, [im.id]: { ...cur, observacion: e.target.value } })}
                        className="h-8 w-48 text-xs" />
                      {canEdit && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          title="Quitar de esta materia"
                          onClick={() => setQuitar({ im, persona: p })}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!detalle} onOpenChange={(v) => !v && setDetalle(null)}>
        {detalle && (
          <DialogContent>
            <DialogHeader><DialogTitle>Asistencia · {detalle.persona?.nombres} {detalle.persona?.apellidos}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Documento:</span> {detalle.persona?.documento || "—"}</div>
              <div><span className="text-muted-foreground">Fecha:</span> {fecha}</div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Estado:</span>
                <Badge>{ESTADOS.find(e => e.v === detalle.current.estado)?.l || detalle.current.estado}</Badge>
              </div>
              <div><span className="text-muted-foreground">Observación:</span> {detalle.current.observacion || <span className="italic text-xs">Sin observación</span>}</div>
              {detalle.registro?.created_at && (
                <div className="text-xs text-muted-foreground border-t pt-2">Registro guardado: {new Date(detalle.registro.created_at).toLocaleString("es-CO")}</div>
              )}
              {!detalle.registro && <div className="text-xs text-amber-600 border-t pt-2">⚠ Aún no guardado en base de datos</div>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
