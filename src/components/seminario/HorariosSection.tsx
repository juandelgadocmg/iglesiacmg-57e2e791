import { useState, useMemo } from "react";
import { useProgramas, useSemestres, usePensumMaterias, usePeriodos, useUpsertPeriodo, useOfertas, useUpsertOferta, useDeleteOferta, usePersonasLite } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Clock, MapPin, User, AlertTriangle, Video } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { isZoomStale, generateZoomLink } from "@/lib/seminarioZoom";
import { useCan } from "@/hooks/useCan";

export default function HorariosSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const { data: semestres } = useSemestres(effProg);
  const { data: pensum } = usePensumMaterias(effProg);
  const { data: periodos } = usePeriodos(effProg);
  const upsertPer = useUpsertPeriodo();
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: ofertas } = useOfertas(effPer, effProg);
  const upsertOferta = useUpsertOferta();
  const delOferta = useDeleteOferta();
  const { data: personas } = usePersonasLite();

  const [editing, setEditing] = useState<any>(null);
  const [creatingPeriodo, setCreatingPeriodo] = useState(false);

  const matsBySem = useMemo(() => {
    const map: Record<string, any[]> = {};
    (pensum || []).forEach((p: any) => {
      const sn = p.sem_pensum_semestres?.numero;
      if (!sn) return;
      (map[sn] = map[sn] || []).push(p.sem_materias);
    });
    return map;
  }, [pensum]);

  const ofertaPorMateria = (mid: string) => (ofertas || []).find((o: any) => o.materia_id === mid);

  const handleSavePeriodo = async (p: any) => {
    try {
      await upsertPer.mutateAsync({ ...p, programa_id: effProg });
      toast.success("Periodo guardado");
      setCreatingPeriodo(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const periodoActivo = (periodos || []).find((p: any) => p.id === effPer);
  const handleSaveOferta = async (form: any) => {
    try {
      let payload = { ...form, periodo_id: effPer };
      const ctxZ = {
        docente: payload.docente_nombre,
        periodoCodigo: periodoActivo?.codigo,
        materiaCodigo: editing?.materia?.codigo,
        materiaId: payload.materia_id,
      };
      const expected = generateZoomLink(ctxZ);
      const stale = payload.zoom_meeting_id && payload.zoom_meeting_id !== expected.meetingId;
      if (payload.modalidad !== "presencial" && (!payload.zoom_link || stale)) {
        payload.zoom_link = expected.url;
        payload.zoom_meeting_id = expected.meetingId;
        payload.zoom_password = expected.pwd;
        if (stale) toast.info("Link Zoom regenerado por cambio de docente/periodo");
      }
      if (payload.modalidad === "presencial") {
        payload.zoom_link = null; payload.zoom_meeting_id = null; payload.zoom_password = null;
      }
      await upsertOferta.mutateAsync(payload);
      toast.success("Horario guardado");
      setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Horarios y Asignación Docente</h2>
          <p className="text-xs text-muted-foreground">Define docente, aula y horario por materia y periodo</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={effProg} onValueChange={setProgramaId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>{(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={effPer} onValueChange={setPeriodoId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>{(periodos || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={creatingPeriodo} onOpenChange={setCreatingPeriodo}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Periodo</Button></DialogTrigger>
            <PeriodoDialog onSave={handleSavePeriodo} pending={upsertPer.isPending} />
          </Dialog>
        </div>
      </div>

      {!effPer ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Crea un periodo académico para empezar a programar horarios.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(semestres || []).map((s: any) => {
            const mats = matsBySem[s.numero] || [];
            if (!mats.length) return null;
            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm">Semestre {s.numero}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {mats.map((m: any) => {
                      const of = ofertaPorMateria(m.id);
                      return (
                        <div key={m.id} className="border rounded-lg p-3 space-y-2" style={{ borderLeftColor: m.color, borderLeftWidth: 3 }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{m.nombre}</p>
                              <p className="text-[10px] text-muted-foreground">{m.codigo} · {m.creditos}cr</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ materia: m, oferta: of })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {of && (
                                <DeleteConfirmDialog onConfirm={async () => { await delOferta.mutateAsync(of.id); toast.success("Eliminado"); }}
                                  trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                              )}
                            </div>
                          </div>
                          {of ? (
                            <div className="space-y-1 text-[11px]">
                              <p className="flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" />{of.docente_nombre || "Sin docente"}</p>
                              <p className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-muted-foreground" />{of.horario || "Sin horario"}</p>
                              <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />{of.aula || "Sin aula"} {of.modalidad && <Badge variant="outline" className="ml-1 text-[9px]">{of.modalidad}</Badge>}</p>
                              {(() => {
                                const stale = isZoomStale(of, { docente: of.docente_nombre, periodoCodigo: periodoActivo?.codigo, materiaCodigo: m.codigo });
                                if (of.zoom_link && of.modalidad !== "presencial" && !stale) {
                                  return <p className="flex items-center gap-1.5"><Video className="h-3 w-3 text-primary" /><a href={of.zoom_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">Zoom</a></p>;
                                }
                                if (stale) {
                                  return (
                                    <p className="flex items-center gap-1.5 text-destructive">
                                      <AlertTriangle className="h-3 w-3" />Link Zoom desactualizado (cambió docente/periodo). Regenera al guardar.
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">Sin programación</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && <OfertaDialog ctx={editing} personas={personas || []} onSave={handleSaveOferta} pending={upsertOferta.isPending} />}
      </Dialog>
    </div>
  );
}

function PeriodoDialog({ onSave, pending }: any) {
  const [f, setF] = useState({ codigo: "", nombre: "", fecha_inicio: "", fecha_fin: "", activo: true });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo periodo académico</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Código *</Label><Input value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} placeholder="2026-1" /></div>
          <div><Label>Nombre *</Label><Input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Semestre 2026-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Inicio *</Label><Input type="date" value={f.fecha_inicio} onChange={e => setF({ ...f, fecha_inicio: e.target.value })} /></div>
          <div><Label>Fin *</Label><Input type="date" value={f.fecha_fin} onChange={e => setF({ ...f, fecha_fin: e.target.value })} /></div>
        </div>
        <Button disabled={pending || !f.codigo || !f.nombre || !f.fecha_inicio || !f.fecha_fin} onClick={() => onSave(f)} className="w-full">
          {pending ? "Guardando..." : "Crear periodo"}
        </Button>
      </div>
    </DialogContent>
  );
}

function OfertaDialog({ ctx, personas, onSave, pending }: any) {
  const o = ctx.oferta || {};
  const [f, setF] = useState({
    id: o.id, materia_id: ctx.materia.id,
    docente_persona_id: o.docente_persona_id || null,
    docente_nombre: o.docente_nombre || "",
    aula: o.aula || "", horario: o.horario || "",
    cupos: o.cupos || 30, modalidad: o.modalidad || "presencial",
    zoom_link: o.zoom_link || "", estado: o.estado || "activa",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Horario · {ctx.materia.nombre}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Docente (de la iglesia)</Label>
          <Select value={f.docente_persona_id || "none"} onValueChange={(v) => {
            if (v === "none") { setF({ ...f, docente_persona_id: null }); return; }
            const p: any = personas.find((x: any) => x.id === v);
            setF({ ...f, docente_persona_id: v, docente_nombre: p ? `${p.nombres} ${p.apellidos}` : f.docente_nombre });
          }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar docente" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">— Sin asignar —</SelectItem>
              {personas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombres} {p.apellidos}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Nombre docente (libre)</Label><Input value={f.docente_nombre} onChange={e => setF({ ...f, docente_nombre: e.target.value })} placeholder="Si no está en personas" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Horario</Label><Input value={f.horario} onChange={e => setF({ ...f, horario: e.target.value })} placeholder="Lun y Mié 7-9pm" /></div>
          <div><Label>Aula</Label><Input value={f.aula} onChange={e => setF({ ...f, aula: e.target.value })} placeholder="Aula 1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Cupos</Label><Input type="number" value={f.cupos} onChange={e => setF({ ...f, cupos: +e.target.value })} /></div>
          <div>
            <Label>Modalidad</Label>
            <Select value={f.modalidad} onValueChange={(v) => setF({ ...f, modalidad: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="mixta">Mixta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {f.modalidad !== "presencial" && (
          <div>
            <Label>Link Zoom <span className="text-[10px] text-muted-foreground">(se genera automático si lo dejas vacío)</span></Label>
            <div className="flex gap-1">
              <Input value={f.zoom_link} onChange={e => setF({ ...f, zoom_link: e.target.value })} placeholder="Se generará al guardar" />
              <Button type="button" size="sm" variant="outline" onClick={async () => {
                const { generateZoomLink } = await import("@/lib/seminarioZoom");
                const z = generateZoomLink({ docente: f.docente_nombre, materiaCodigo: ctx.materia.codigo, materiaId: ctx.materia.id });
                setF({ ...f, zoom_link: z.url });
              }}>Regenerar</Button>
            </div>
          </div>
        )}
        <Button disabled={pending} onClick={() => onSave(f)} className="w-full">{pending ? "Guardando..." : "Guardar"}</Button>
      </div>
    </DialogContent>
  );
}
