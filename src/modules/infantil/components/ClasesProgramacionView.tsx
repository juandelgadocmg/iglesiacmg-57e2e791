import { useState } from "react";
import { BookOpen, Calendar as CalendarIcon, Plus, Users, UserRound, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useInfantilClases, useCreateInfantilClase, useUpdateInfantilClase, useInfantilGrupos } from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function ClasesProgramacionView() {
  const { data: clases, isLoading } = useInfantilClases();
  const { data: grupos } = useInfantilGrupos();
  const { data: personas } = usePersonas();
  const createClase = useCreateInfantilClase();
  const updateClase = useUpdateInfantilClase();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    grupo_id: "",
    maestro_id: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    tema: "",
    versiculo: "",
    objetivo: "",
    actividad: "",
    materiales: "",
    estado: "Programada"
  });

  const openNew = () => {
    setEditingId(null);
    setForm({
      grupo_id: "",
      maestro_id: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      tema: "",
      versiculo: "",
      objetivo: "",
      actividad: "",
      materiales: "",
      estado: "Programada"
    });
    setIsModalOpen(true);
  };

  const openEdit = (clase: any) => {
    setEditingId(clase.id);
    setForm({
      grupo_id: clase.grupo_id || "",
      maestro_id: clase.maestro_id || "",
      fecha: clase.fecha || format(new Date(), "yyyy-MM-dd"),
      tema: clase.tema || "",
      versiculo: clase.versiculo || "",
      objetivo: clase.objetivo || "",
      actividad: clase.actividad || "",
      materiales: clase.materiales || "",
      estado: clase.estado || "Programada"
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.grupo_id || !form.fecha || !form.tema) {
      toast.error("Por favor completa el grupo, la fecha y el tema.");
      return;
    }

    try {
      if (editingId) {
        await updateClase.mutateAsync({ id: editingId, ...form });
        toast.success("Clase actualizada");
      } else {
        await createClase.mutateAsync(form);
        toast.success("Clase programada");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  // Obtener solo maestros para el select
  const maestros = personas?.filter(p => p.roles?.includes("maestro") || p.roles?.includes("admin")) || [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Programación de Clases</h2>
          <p className="text-muted-foreground">Gestiona el currículo y asigna maestros por cada grupo.</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Programar Clase
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
          ) : clases?.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Sin clases programadas</h3>
                <p className="text-sm text-slate-500 mb-4">Aún no hay lecciones creadas en el sistema.</p>
                <Button variant="outline" onClick={openNew}>Crear la primera</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {clases?.map((c) => (
                <Card key={c.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className={`absolute top-0 left-0 w-1 h-full ${c.estado === 'Realizada' ? 'bg-emerald-500' : c.estado === 'Cancelada' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant={c.estado === 'Realizada' ? 'default' : 'secondary'} className={c.estado === 'Realizada' ? 'bg-emerald-100 text-emerald-800' : ''}>
                        {c.estado}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(c)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg line-clamp-1" title={c.tema}>{c.tema}</CardTitle>
                    <CardDescription className="text-xs font-medium text-blue-600">
                      {c.grupo?.nombre || "Grupo sin nombre"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      {format(new Date(c.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                    {c.maestro && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        Maestro: {c.maestro.nombres} {c.maestro.apellidos}
                      </div>
                    )}
                    {c.versiculo && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs italic text-slate-600 line-clamp-2">
                        "{c.versiculo}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Panel Lateral: Grupos Activos */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" /> Grupos Infantiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grupos?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay grupos creados con tipo "Infantil".</p>
              ) : (
                <div className="space-y-3">
                  {grupos?.map(g => (
                    <div key={g.id} className="flex justify-between items-center p-2 rounded-lg border bg-slate-50/50">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{g.nombre}</p>
                        <p className="text-xs text-muted-foreground">{g.edades || "Edad no especificada"}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">Grupo</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Clase" : "Programar Nueva Clase"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grupo / Clase *</Label>
                <Select value={form.grupo_id} onValueChange={(val) => setForm({...form, grupo_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maestro Asignado</Label>
              <Select value={form.maestro_id} onValueChange={(val) => setForm({...form, maestro_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar maestro (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {maestros.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombres} {m.apellidos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tema de la Lección *</Label>
              <Input value={form.tema} onChange={e => setForm({...form, tema: e.target.value})} required placeholder="Ej. El arca de Noé" />
            </div>

            <div className="space-y-2">
              <Label>Versículo a memorizar</Label>
              <Input value={form.versiculo} onChange={e => setForm({...form, versiculo: e.target.value})} placeholder="Génesis 6:22" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Textarea value={form.objetivo} onChange={e => setForm({...form, objetivo: e.target.value})} placeholder="¿Qué deben aprender hoy?" className="h-20 resize-none" />
              </div>
              <div className="space-y-2">
                <Label>Actividad / Manualidad</Label>
                <Textarea value={form.actividad} onChange={e => setForm({...form, actividad: e.target.value})} placeholder="Pintar el arca, recortar animales..." className="h-20 resize-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Materiales Necesarios</Label>
                <Textarea value={form.materiales} onChange={e => setForm({...form, materiales: e.target.value})} placeholder="Colores, tijeras, hojas..." className="h-20 resize-none" />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(val) => setForm({...form, estado: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Programada">Programada</SelectItem>
                    <SelectItem value="Realizada">Realizada</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingId ? "Guardar Cambios" : "Programar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
