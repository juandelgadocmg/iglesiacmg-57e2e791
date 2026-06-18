import { useState } from "react";
import { useProgramas, useMateriasSem, useUpsertMateria, useDeleteMateriaSem, usePrerequisitos, useAddPrerequisito, useRemovePrerequisito } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Link2, X } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

export default function MateriasSection({ readOnly = false }: { readOnly?: boolean }) {
  const { data: programas } = useProgramas();
  const [programaId, setProgramaId] = useState<string>("");
  const effectiveId = programaId || programas?.[0]?.id || "";
  const { data: materias, isLoading } = useMateriasSem(effectiveId);
  const { data: prereqs } = usePrerequisitos(effectiveId);
  const upsert = useUpsertMateria();
  const del = useDeleteMateriaSem();
  const addPre = useAddPrerequisito();
  const remPre = useRemovePrerequisito();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [prereqFor, setPrereqFor] = useState<any>(null);

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
        <div className="flex gap-2">
          <Select value={effectiveId} onValueChange={setProgramaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Programa" /></SelectTrigger>
            <SelectContent>
              {(programas || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
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
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {(materias || []).map((m: any) => {
            const myPre = (prereqs || []).filter((p: any) => p.materia_id === m.id);
            return (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1 self-stretch rounded" style={{ background: m.color || "#3B82F6" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{m.nombre}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{m.creditos} cr</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{m.codigo} · {m.intensidad_horaria}h{m.area ? ` · ${m.area}` : ""}</p>
                      {myPre.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
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
                        <div className="flex gap-1 mt-2">
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
        </div>
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
    </div>
  );
}

function MateriaDialog({ initial, onSave, pending }: any) {
  const [f, setF] = useState({
    id: initial?.id, codigo: initial?.codigo || "", nombre: initial?.nombre || "",
    descripcion: initial?.descripcion || "", creditos: initial?.creditos || 3,
    intensidad_horaria: initial?.intensidad_horaria || 48, area: initial?.area || "",
    color: initial?.color || "#3B82F6", activo: initial?.activo ?? true,
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
        <div><Label>Descripción</Label><Textarea rows={2} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></div>
        <Button onClick={() => onSave(f)} disabled={pending || !f.codigo || !f.nombre} className="w-full">{pending ? "Guardando..." : "Guardar"}</Button>
      </div>
    </DialogContent>
  );
}
