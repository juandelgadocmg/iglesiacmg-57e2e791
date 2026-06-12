import { useState, useMemo } from "react";
import { useProgramas, useSemestres, usePensumMaterias, usePeriodos, useOfertas, useInscripciones, useUpsertInscripcion, useDeleteInscripcion, useInscripcionMaterias, useEnrollMateria, useUnenrollMateria, useUpdateInscripcionMateria, usePersonasLite } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, UserPlus, BookOpen, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

export default function EstudiantesSection() {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState("");
  const effProg = programaId || programas?.[0]?.id || "";
  const programa = (programas || []).find((p: any) => p.id === effProg);
  const { data: periodos } = usePeriodos(effProg);
  const [periodoId, setPeriodoId] = useState("");
  const effPer = periodoId || periodos?.[0]?.id || "";
  const { data: inscripciones } = useInscripciones(effProg, effPer);
  const upsertIns = useUpsertInscripcion();
  const delIns = useDeleteInscripcion();
  const { data: personas } = usePersonasLite();
  const [creating, setCreating] = useState(false);
  const [selectedIns, setSelectedIns] = useState<any>(null);

  const yaInscritos = new Set((inscripciones || []).map((i: any) => i.persona_id));

  const handleCreate = async (form: any) => {
    try {
      await upsertIns.mutateAsync({ ...form, programa_id: effProg, periodo_id: effPer, estado: "activa" });
      toast.success("Estudiante inscrito");
      setCreating(false);
    } catch (e: any) { toast.error(e.message); }
  };

  if (selectedIns) {
    return <EstudianteDetalle ins={selectedIns} programa={programa} onBack={() => setSelectedIns(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Estudiantes Inscritos</h2>
          <p className="text-xs text-muted-foreground">Inscribe estudiantes por semestre y registra avance académico</p>
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
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!effPer}><UserPlus className="h-4 w-4 mr-1" />Inscribir</Button>
            </DialogTrigger>
            <InscripcionDialog personas={(personas || []).filter((p: any) => !yaInscritos.has(p.id))}
              totalSem={programa?.total_semestres || 8}
              onSave={handleCreate} pending={upsertIns.isPending} />
          </Dialog>
        </div>
      </div>

      {!effPer ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Selecciona o crea un periodo en la pestaña Horarios.</CardContent></Card>
      ) : (inscripciones || []).length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No hay estudiantes inscritos en este periodo.</CardContent></Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {(inscripciones || []).map((i: any) => {
            const p = i.personas;
            const credAprob = i.total_creditos_aprobados || 0;
            const totalProg = (programa?.total_semestres || 8) * 20;
            const pct = Math.min(100, Math.round((credAprob / totalProg) * 100));
            return (
              <Card key={i.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedIns(i)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {p?.nombres?.[0]}{p?.apellidos?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{p?.nombres} {p?.apellidos}</p>
                        <Badge variant="outline" className="text-[10px]">Sem {i.semestre_actual || "—"}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p?.documento}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{credAprob} cr · {pct}%</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">Promedio: {i.promedio_acumulado ?? "—"}</span>
                        <DeleteConfirmDialog onConfirm={async () => { await delIns.mutateAsync(i.id); toast.success("Eliminado"); }}
                          trigger={<Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-3 w-3" /></Button>} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InscripcionDialog({ personas, totalSem, onSave, pending }: any) {
  const [f, setF] = useState({ persona_id: "", semestre_actual: 1 });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nueva inscripción</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Persona *</Label>
          <Select value={f.persona_id} onValueChange={(v) => setF({ ...f, persona_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {personas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombres} {p.apellidos} {p.documento && `· ${p.documento}`}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Semestre a cursar *</Label>
          <Select value={String(f.semestre_actual)} onValueChange={(v) => setF({ ...f, semestre_actual: +v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalSem }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>Semestre {n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onSave(f)} disabled={pending || !f.persona_id} className="w-full">
          {pending ? "Guardando..." : "Inscribir"}
        </Button>
      </div>
    </DialogContent>
  );
}

function EstudianteDetalle({ ins, programa, onBack }: any) {
  const { data: semestres } = useSemestres(ins.programa_id);
  const { data: pensum } = usePensumMaterias(ins.programa_id);
  const { data: ofertas } = useOfertas(ins.periodo_id, ins.programa_id);
  const { data: cursando } = useInscripcionMaterias(ins.id);
  const enroll = useEnrollMateria();
  const unenroll = useUnenrollMateria();
  const updateIns = useUpdateInscripcionMateria();

  const matsBySem = useMemo(() => {
    const map: Record<number, any[]> = {};
    (pensum || []).forEach((p: any) => {
      const n = p.sem_pensum_semestres?.numero;
      if (!n) return;
      (map[n] = map[n] || []).push(p.sem_materias);
    });
    return map;
  }, [pensum]);

  const cursandoMap = new Map((cursando || []).map((c: any) => [c.materia_id, c]));
  const totalCreditos = (programa?.total_semestres || 8) * 20;
  const aprobadas = (cursando || []).filter((c: any) => c.estado === "aprobada");
  const credAprob = aprobadas.reduce((s: number, c: any) => s + (c.sem_materias?.creditos || 0), 0);
  const pct = Math.min(100, Math.round((credAprob / totalCreditos) * 100));

  const handleEnroll = async (materia_id: string) => {
    const oferta = (ofertas || []).find((o: any) => o.materia_id === materia_id);
    if (!oferta) { toast.error("Esta materia no tiene oferta en el periodo. Crea horario primero."); return; }
    try {
      await enroll.mutateAsync({ inscripcion_id: ins.id, oferta_id: oferta.id, materia_id });
      toast.success("Matriculada");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async (id: string, patch: any) => {
    try { await updateIns.mutateAsync({ id, ...patch }); toast.success("Actualizado"); }
    catch (e: any) { toast.error(e.message); }
  };

  const p = ins.personas;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Volver</Button>
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {p?.nombres?.[0]}{p?.apellidos?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{p?.nombres} {p?.apellidos}</p>
              <p className="text-xs text-muted-foreground">{p?.documento} · {programa?.nombre}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline">Semestre {ins.semestre_actual}</Badge>
                <Badge variant="outline">Promedio {ins.promedio_acumulado ?? "—"}</Badge>
                <Badge variant="outline">{credAprob}/{totalCreditos} créditos</Badge>
              </div>
            </div>
            <div className="w-full md:w-48">
              <p className="text-[10px] text-muted-foreground mb-1">Avance del programa</p>
              <Progress value={pct} className="h-2" />
              <p className="text-[10px] text-right mt-1">{pct}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(semestres || []).map((s: any) => {
          const mats = matsBySem[s.numero] || [];
          if (!mats.length) return null;
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Semestre {s.numero}</p>
                  {s.numero === ins.semestre_actual && <Badge>Actual</Badge>}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {mats.map((m: any) => {
                    const c: any = cursandoMap.get(m.id);
                    return (
                      <div key={m.id} className="border rounded p-2 text-xs" style={{ borderLeftColor: m.color, borderLeftWidth: 3 }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{m.nombre}</p>
                            <p className="text-[10px] text-muted-foreground">{m.codigo} · {m.creditos}cr</p>
                          </div>
                          {!c ? (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleEnroll(m.id)}>
                              <Plus className="h-3 w-3 mr-0.5" />Matricular
                            </Button>
                          ) : (
                            <DeleteConfirmDialog onConfirm={async () => { await unenroll.mutateAsync(c.id); toast.success("Retirada"); }}
                              trigger={<Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
                          )}
                        </div>
                        {c && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Select value={c.estado} onValueChange={(v) => handleUpdate(c.id, { estado: v })}>
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cursando">Cursando</SelectItem>
                                <SelectItem value="aprobada">Aprobada</SelectItem>
                                <SelectItem value="reprobada">Reprobada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input type="number" step="0.1" min="0" max="5" placeholder="Nota"
                              defaultValue={c.nota_final ?? ""}
                              onBlur={(e) => {
                                const n = e.target.value === "" ? null : +e.target.value;
                                if (n !== c.nota_final) handleUpdate(c.id, { nota_final: n });
                              }}
                              className="h-7 w-20 text-[10px]" />
                          </div>
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
    </div>
  );
}
