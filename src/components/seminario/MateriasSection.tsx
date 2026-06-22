import { useState, useMemo } from "react";
import {
  useProgramas, useMateriasSem, useUpsertMateria, useDeleteMateriaSem,
  usePrerequisitos, useAddPrerequisito, useRemovePrerequisito,
  useSemestres, usePensumMaterias, useMateriaHistorial,
} from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Link2, X, Eye, Video, History } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

export default function MateriasSection({ readOnly = false }: { readOnly?: boolean }) {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState<string>("");
  const effectiveId = programaId || programas?.[0]?.id || "";
  const { data: materias, isLoading } = useMateriasSem(effectiveId);
  const { data: prereqs } = usePrerequisitos(effectiveId);
  const { data: semestres } = useSemestres(effectiveId);
  const { data: pensum } = usePensumMaterias(effectiveId);
  const upsert = useUpsertMateria();
  const del = useDeleteMateriaSem();
  const addPre = useAddPrerequisito();
  const remPre = useRemovePrerequisito();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [prereqFor, setPrereqFor] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [semestreFilter, setSemestreFilter] = useState<string>("all");

  // map materia_id -> semestre numero
  const semestreByMateria = useMemo(() => {
    const m: Record<string, number> = {};
    (pensum || []).forEach((p: any) => {
      const num = p.sem_pensum_semestres?.numero;
      if (num != null) m[p.materia_id] = num;
    });
    return m;
  }, [pensum]);

  const filtered = useMemo(() => {
    const list = materias || [];
    if (semestreFilter === "all") return list;
    if (semestreFilter === "none") return list.filter((m: any) => semestreByMateria[m.id] == null);
    const num = +semestreFilter;
    return list.filter((m: any) => semestreByMateria[m.id] === num);
  }, [materias, semestreFilter, semestreByMateria]);

  const onSave = async (f: any) => {
    try {
      await upsert.mutateAsync({ ...f, programa_id: effectiveId });
      toast.success("Materia guardada"); setOpen(false); setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Catálogo de Materias</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={effectiveId} onValueChange={setProgramaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>
              {(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={semestreFilter} onValueChange={setSemestreFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Semestre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los semestres</SelectItem>
              {(semestres || []).map((s: any) => (
                <SelectItem key={s.id} value={String(s.numero)}>Semestre {s.numero}</SelectItem>
              ))}
              <SelectItem value="none">Sin semestre</SelectItem>
            </SelectContent>
          </Select>
          {!readOnly && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva materia</Button></DialogTrigger>
              <MateriaDialog initial={editing} onSave={onSave} pending={upsert.isPending} />
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} materias</p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m: any) => {
              const myPre = (prereqs || []).filter((p: any) => p.materia_id === m.id);
              const sem = semestreByMateria[m.id];
              return (
                <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetail(m)}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-1 self-stretch rounded" style={{ background: m.color || "#3B82F6" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{m.nombre}</p>
                          <div className="flex gap-1 shrink-0">
                            {sem != null && <Badge variant="secondary" className="text-[10px]">Sem {sem}</Badge>}
                            <Badge variant="outline" className="text-[10px]">{m.creditos} cr</Badge>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {m.codigo} · {m.intensidad_horaria}h{m.area ? ` · ${m.area}` : ""}
                          {m.zoom_link && <span className="ml-1 inline-flex items-center gap-0.5 text-primary"><Video className="h-2.5 w-2.5" /> Zoom</span>}
                        </p>
                        {myPre.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                            {myPre.map((pr: any) => {
                              const ref = (materias || []).find((x: any) => x.id === pr.prerequisito_id);
                              return (
                                <Badge key={pr.id} variant="secondary" className="text-[9px] gap-1">
                                  ↰ {ref?.codigo || "?"}
                                  {!readOnly && <button onClick={() => remPre.mutateAsync(pr.id)}><X className="h-2.5 w-2.5" /></button>}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        {!readOnly && (
                          <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setDetail(m)}><Eye className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setPrereqFor(m)}><Link2 className="h-3 w-3" /> Prerreq</Button>
                            <DeleteConfirmDialog onConfirm={async () => { await del.mutateAsync(m.id); toast.success("Eliminada"); }} trigger={<Button size="sm" variant="ghost" className="h-6 px-2 text-destructive"><Trash2 className="h-3 w-3" /></Button>} />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-6">No hay materias para este filtro.</p>
            )}
          </div>
        </>
      )}

      <Dialog open={!!prereqFor} onOpenChange={(v) => !v && setPrereqFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Prerrequisitos de {prereqFor?.nombre}</DialogTitle></DialogHeader>
          <Select onValueChange={(v) => addPre.mutateAsync({ materia_id: prereqFor.id, prerequisito_id: v }).then(() => toast.success("Agregado"))}>
            <SelectTrigger><SelectValue placeholder="Agregar materia como prerrequisito" /></SelectTrigger>
            <SelectContent>
              {(materias || []).filter((x: any) => x.id !== prereqFor?.id).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.codigo} — {m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        {detail && (
          <MateriaDetailDialog
            materia={detail}
            semestre={semestreByMateria[detail.id]}
            readOnly={readOnly}
            onEdit={() => { setEditing(detail); setDetail(null); setOpen(true); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function MateriaDetailDialog({ materia, semestre, readOnly, onEdit }: any) {
  const { data: historial } = useMateriaHistorial(materia.id);
  return (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="w-2 h-6 rounded" style={{ background: materia.color || "#3B82F6" }} />
          {materia.nombre}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-[10px] uppercase text-muted-foreground">Código</p><p className="font-mono font-semibold">{materia.codigo}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Semestre</p><p className="font-semibold">{semestre != null ? `Semestre ${semestre}` : "Sin asignar"}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Créditos</p><p>{materia.creditos}</p></div>
          <div><p className="text-[10px] uppercase text-muted-foreground">Intensidad horaria</p><p>{materia.intensidad_horaria}h</p></div>
          {materia.area && <div className="col-span-2"><p className="text-[10px] uppercase text-muted-foreground">Área</p><p>{materia.area}</p></div>}
        </div>
        {materia.descripcion && (
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Descripción</p>
            <p className="text-sm whitespace-pre-wrap">{materia.descripcion}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Video className="h-3 w-3" /> Link de Zoom</p>
          {materia.zoom_link ? (
            <a href={materia.zoom_link} target="_blank" rel="noreferrer" className="text-primary text-xs break-all underline">{materia.zoom_link}</a>
          ) : (
            <p className="text-xs text-muted-foreground italic">No configurado</p>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><History className="h-3 w-3" /> Historial de cambios</p>
          {(historial || []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Sin cambios registrados.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(historial || []).map((h: any) => (
                <div key={h.id} className="text-[11px] p-2 rounded bg-muted/40">
                  <p><span className="font-semibold capitalize">{h.campo}:</span> <span className="line-through text-muted-foreground">{h.valor_anterior || "—"}</span> → <span className="font-medium">{h.valor_nuevo || "—"}</span></p>
                  <p className="text-[10px] text-muted-foreground">{h.usuario_nombre || "—"} · {new Date(h.created_at).toLocaleString("es-CO")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={onEdit}><Pencil className="h-3 w-3 mr-1" /> Editar código/nombre</Button>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

function MateriaDialog({ initial, onSave, pending }: any) {
  const [f, setF] = useState({
    id: initial?.id, codigo: initial?.codigo || "", nombre: initial?.nombre || "",
    descripcion: initial?.descripcion || "", creditos: initial?.creditos || 3,
    intensidad_horaria: initial?.intensidad_horaria || 48, area: initial?.area || "",
    color: initial?.color || "#3B82F6", activo: initial?.activo ?? true,
    zoom_link: initial?.zoom_link || "",
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Nueva"} materia</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Código *</Label><Input value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} /></div>
          <div><Label>Créditos</Label><Input type="number" value={f.creditos} onChange={e => setF({ ...f, creditos: +e.target.value })} /></div>
          <div><Label>Horas</Label><Input type="number" value={f.intensidad_horaria} onChange={e => setF({ ...f, intensidad_horaria: +e.target.value })} /></div>
        </div>
        <div><Label>Nombre *</Label><Input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Área</Label><Input value={f.area} onChange={e => setF({ ...f, area: e.target.value })} placeholder="Bíblica / Teológica / Pastoral" /></div>
          <div><Label>Color</Label><Input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} /></div>
        </div>
        <div>
          <Label>Link de Zoom (único para todas las clases de esta materia)</Label>
          <Input
            type="url"
            value={f.zoom_link}
            onChange={e => setF({ ...f, zoom_link: e.target.value })}
            placeholder="https://zoom.us/j/..."
          />
          <p className="text-[10px] text-muted-foreground mt-1">Se usará en todas las clases. Déjalo vacío para usar el link por oferta/horario.</p>
        </div>
        <div><Label>Descripción</Label><Textarea rows={2} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></div>
        {initial && <p className="text-[10px] text-muted-foreground">Los cambios en código y nombre quedarán registrados en el historial.</p>}
        <Button onClick={() => onSave(f)} disabled={pending || !f.codigo || !f.nombre} className="w-full">{pending ? "Guardando..." : "Guardar"}</Button>
      </div>
    </DialogContent>
  );
}
