import { useState } from "react";
import { useProgramas, useUpsertPrograma, useDeletePrograma } from "@/hooks/useSeminario";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import SectionHero from "@/components/shell/SectionHero";

export default function ProgramasSection() {
  const { data: programas, isLoading } = useProgramas();
  const upsert = useUpsertPrograma();
  const del = useDeletePrograma();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const onSave = async (form: any) => {
    try {
      await upsert.mutateAsync(form);
      toast.success(editing ? "Programa actualizado" : "Programa creado");
      setOpen(false); setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const list = programas || [];
  const activos = list.filter((p: any) => p.activo).length;
  const totalSem = list.reduce((s: number, p: any) => s + (p.total_semestres || 0), 0);

  return (
    <div className="space-y-4">
      <SectionHero
        icon={BookOpen}
        eyebrow="Curriculum · Catálogo"
        title="Programas Académicos"
        description="Diseña currículos, semestres y modalidades del seminario."
        gradient="from-blue-700 via-indigo-600 to-violet-500"
        stats={[
          { label: "Programas", value: list.length, tone: "info" },
          { label: "Activos", value: activos, tone: "ok" },
          { label: "Semestres", value: totalSem },
          { label: "Modalidades", value: new Set(list.map((p: any) => p.modalidad).filter(Boolean)).size },
        ]}
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo programa</Button>
            </DialogTrigger>
            <ProgramaDialog initial={editing} onSave={onSave} pending={upsert.isPending} />
          </Dialog>
        }
      />

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p: any) => (
            <Card key={p.id} className="group relative overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 opacity-70 group-hover:opacity-100" />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 text-white shadow-sm">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.codigo}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{p.total_semestres} sem</Badge>
                        {p.duracion_anios && <Badge variant="outline" className="text-[10px]">{p.duracion_anios} años</Badge>}
                        <Badge variant="outline" className="text-[10px] capitalize">{p.modalidad}</Badge>
                        {!p.activo && <Badge variant="destructive" className="text-[10px]">Inactivo</Badge>}
                      </div>
                      {p.descripcion && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.descripcion}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} aria-label="Editar programa">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmDialog onConfirm={async () => { await del.mutateAsync(p.id); toast.success("Eliminado"); }} trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramaDialog({ initial, onSave, pending }: any) {
  const [form, setForm] = useState({
    id: initial?.id, codigo: initial?.codigo || "", nombre: initial?.nombre || "",
    descripcion: initial?.descripcion || "", total_semestres: initial?.total_semestres || 8,
    duracion_anios: initial?.duracion_anios || 4, modalidad: initial?.modalidad || "mixta",
    activo: initial?.activo ?? true,
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{initial ? "Editar" : "Nuevo"} programa</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></div>
          <div><Label>Semestres</Label><Input type="number" value={form.total_semestres} onChange={e => setForm({ ...form, total_semestres: +e.target.value })} /></div>
        </div>
        <div><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
        <div><Label>Descripción</Label><Textarea rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Duración (años)</Label><Input type="number" step="0.5" value={form.duracion_anios} onChange={e => setForm({ ...form, duracion_anios: +e.target.value })} /></div>
          <div><Label>Modalidad</Label><Input value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })} placeholder="presencial / virtual / mixta" /></div>
        </div>
        <Button onClick={() => onSave(form)} disabled={pending || !form.codigo || !form.nombre} className="w-full">
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </DialogContent>
  );
}
