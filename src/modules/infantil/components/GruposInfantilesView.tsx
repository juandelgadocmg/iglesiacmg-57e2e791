import { useState } from "react";
import { Users, Plus, Edit2, Trash2, Home, Hash, LayoutGrid } from "lucide-react";
import { useInfantilGrupos, useCreateInfantilGrupo, useUpdateInfantilGrupo, useDeleteInfantilGrupo } from "@/hooks/useInfantil";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

export default function GruposInfantilesView() {
  const { data: grupos, isLoading } = useInfantilGrupos();
  const createGrupo = useCreateInfantilGrupo();
  const updateGrupo = useUpdateInfantilGrupo();
  const deleteGrupo = useDeleteInfantilGrupo();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    nombre: "",
    edades: "",
    edad_minima: 0,
    edad_maxima: 0,
    salon: "",
    capacidad: 0
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ nombre: "", edades: "", edad_minima: 0, edad_maxima: 0, salon: "", capacidad: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (g: any) => {
    setEditingId(g.id);
    const detalles = g.infantil_grupos_detalles?.[0] || {};
    setForm({
      nombre: g.nombre || "",
      edades: g.edades || "",
      edad_minima: detalles.edad_minima || 0,
      edad_maxima: detalles.edad_maxima || 0,
      salon: detalles.salon || "",
      capacidad: detalles.capacidad || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre) return toast.error("El nombre del grupo es obligatorio.");

    try {
      if (editingId) {
        await updateGrupo.mutateAsync({ id: editingId, ...form });
        toast.success("Grupo actualizado");
      } else {
        await createGrupo.mutateAsync(form);
        toast.success("Grupo creado");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el grupo");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteGrupo.mutateAsync(deleteConfirmId);
      toast.success("Grupo eliminado");
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error("No se pudo eliminar el grupo");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Grupos por Edad
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Gestiona la distribución, salones y capacidades del ministerio de niños.</p>
        </div>
        <Button onClick={openNew} className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6">
          <Plus className="h-5 w-5 mr-2" /> Crear Grupo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-navy border-t-transparent rounded-full" />
          </div>
        ) : grupos?.length === 0 ? (
          <Card className="col-span-full border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <LayoutGrid className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No hay grupos creados</h3>
              <p className="text-sm text-slate-500 mb-4">Crea el primer grupo para comenzar a segmentar a los niños por edad.</p>
              <Button onClick={openNew} variant="outline" className="rounded-xl border-navy text-navy hover:bg-navy hover:text-white">Empezar ahora</Button>
            </CardContent>
          </Card>
        ) : (
          grupos?.map((g) => {
            const detalles = g.infantil_grupos_detalles?.[0] || {};
            return (
              <Card key={g.id} className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="h-2 w-full bg-gradient-to-r from-navy to-blue-500" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold uppercase tracking-wider text-[10px]">
                      {g.edades || `${detalles.edad_minima || 0} a ${detalles.edad_maxima || 0} años`}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-full" onClick={() => openEdit(g)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => setDeleteConfirmId(g.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-black text-navy mt-2">{g.nombre}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center">
                      <Home className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Salón</span>
                      <span className="text-sm font-bold text-slate-700">{detalles.salon || "Sin asignar"}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center">
                      <Users className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Capacidad</span>
                      <span className="text-sm font-bold text-slate-700">{detalles.capacidad || 0} <span className="text-xs font-medium text-slate-500">niños</span></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                    <Hash className="h-4 w-4 text-coral" />
                    Rango de edad: <strong>{detalles.edad_minima || 0} - {detalles.edad_maxima || 0} años</strong>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden border-0 shadow-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-navy to-blue-500" />
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-navy">{editingId ? "Editar Grupo" : "Nuevo Grupo Infantil"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Nombre del Grupo *</Label>
              <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="h-12 rounded-xl bg-slate-50" placeholder="Ej. Párvulos" required />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Descripción de Edades</Label>
              <Input value={form.edades} onChange={e => setForm({...form, edades: e.target.value})} className="h-12 rounded-xl bg-slate-50" placeholder="Ej. 2 a 4 años" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Edad Mínima</Label>
                <Input type="number" value={form.edad_minima} onChange={e => setForm({...form, edad_minima: parseInt(e.target.value) || 0})} className="h-12 rounded-xl bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Edad Máxima</Label>
                <Input type="number" value={form.edad_maxima} onChange={e => setForm({...form, edad_maxima: parseInt(e.target.value) || 0})} className="h-12 rounded-xl bg-slate-50" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Salón Asignado</Label>
                <Input value={form.salon} onChange={e => setForm({...form, salon: e.target.value})} className="h-12 rounded-xl bg-slate-50" placeholder="Ej. Salón A" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-semibold">Capacidad Max.</Label>
                <Input type="number" value={form.capacidad} onChange={e => setForm({...form, capacidad: parseInt(e.target.value) || 0})} className="h-12 rounded-xl bg-slate-50" />
              </div>
            </div>

            <DialogFooter className="pt-4 mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8">Guardar Grupo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog 
        isOpen={!!deleteConfirmId}
        title="Eliminar Grupo"
        description="¿Estás seguro? Se perderá el historial de clases planificadas en este grupo. Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
