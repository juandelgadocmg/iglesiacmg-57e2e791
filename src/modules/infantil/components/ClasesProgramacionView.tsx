import { useMemo, useState } from "react";
import { BookOpen, Calendar as CalendarIcon, Plus, Users, UserRound, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useInfantilClases, useCreateInfantilClase, useUpdateInfantilClase, useInfantilGrupos, isMaestroInfantil } from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "./SearchableSelect";
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
    maestro_auxiliar_id: "",
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
      maestro_auxiliar_id: "",
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
      maestro_auxiliar_id: clase.maestro_auxiliar_id || "",
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

    const payload = {
      ...form,
      maestro_id: form.maestro_id || null,
      maestro_auxiliar_id: form.maestro_auxiliar_id || null
    };
    try {
      if (editingId) {
        await updateClase.mutateAsync({ id: editingId, ...payload });
        toast.success("Clase actualizada");
      } else {
        await createClase.mutateAsync(payload);
        toast.success("Clase programada");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  // Solo personas nombradas como maestros infantiles (Gestión Maestros)
  const maestroOptions = useMemo(
    () =>
      (personas || [])
        .filter(isMaestroInfantil)
        .map((m: any) => ({ value: m.id, label: `${m.nombres} ${m.apellidos}`.trim(), hint: m.telefono || undefined }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [personas],
  );

  const grupoOptions = useMemo(
    () =>
      (grupos || []).map((g: any) => {
        const d = g.infantil_grupos_detalles?.[0];
        return {
          value: g.id,
          label: g.nombre,
          hint: g.edades || (d ? `${d.edad_minima ?? 0} a ${d.edad_maxima ?? 0} años` : undefined),
        };
      }),
    [grupos],
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Programación de Clases
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Gestiona el currículo y asigna maestros de forma dinámica.</p>
        </div>
        <Button onClick={openNew} className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6">
          <Plus className="h-5 w-5 mr-2" /> Programar Clase
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
            <div className="grid sm:grid-cols-2 gap-6">
              {clases?.map((c) => (
                <Card key={c.id} className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 shadow-lg shadow-slate-200/50 bg-white rounded-2xl hover:-translate-y-1">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${c.estado === 'Realizada' ? 'bg-emerald-500' : c.estado === 'Cancelada' ? 'bg-red-500' : 'bg-gradient-to-b from-coral to-orange-400'}`} />
                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={c.estado === 'Realizada' ? 'default' : 'secondary'} className={`font-semibold tracking-wide uppercase text-[10px] ${c.estado === 'Realizada' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : c.estado === 'Cancelada' ? 'bg-red-100 text-red-800' : 'bg-coral/10 text-coral hover:bg-coral/20'}`}>
                        {c.estado}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 bg-slate-100/50 hover:bg-slate-200 text-slate-500 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100" onClick={() => openEdit(c)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-xl font-bold text-navy line-clamp-1 group-hover:text-coral transition-colors" title={c.tema}>{c.tema}</CardTitle>
                    <CardDescription className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {c.grupo?.nombre || "Grupo sin nombre"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 pb-5">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <div className="p-1.5 bg-slate-100 rounded-md text-slate-500"><CalendarIcon className="h-4 w-4" /></div>
                      {format(new Date(`${c.fecha}T00:00:00`), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </div>
                    {c.maestro && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <div className="p-1.5 bg-slate-100 rounded-md text-slate-500"><UserRound className="h-4 w-4" /></div>
                        <span>Maestro: <strong className="text-navy">{c.maestro.nombres} {c.maestro.apellidos}</strong></span>
                      </div>
                    )}
                    {(c.maestro_auxiliar || c.maestro_auxiliar_id) && (() => {
                      const aux = c.maestro_auxiliar || personas?.find(p => p.id === c.maestro_auxiliar_id);
                      if (!aux) return null;
                      return (
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <div className="p-1.5 bg-blue-50 rounded-md text-blue-600"><Users className="h-4 w-4" /></div>
                          <span>Auxiliar: <strong className="text-blue-900">{aux.nombres} {aux.apellidos}</strong></span>
                        </div>
                      );
                    })()}
                    {c.versiculo && (
                      <div className="mt-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 rounded-xl text-xs italic text-slate-600 line-clamp-2 relative">
                        <span className="text-3xl text-slate-200 absolute top-1 left-2 font-serif leading-none">"</span>
                        <span className="relative z-10 pl-4 block">{c.versiculo}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Panel Lateral: Grupos Activos */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 bg-navy text-white">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><Users className="h-5 w-5" /></div>
                Grupos Infantiles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {grupos?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay grupos creados con tipo "Infantil".</p>
              ) : (
                <div className="space-y-3">
                  {grupos?.map(g => (
                    <div key={g.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-navy">{g.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{g.edades || "Edades no especificadas"}</p>
                      </div>
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 shadow-sm font-medium">Activo</Badge>
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
                <SearchableSelect
                  options={grupoOptions}
                  value={form.grupo_id}
                  onChange={(v) => setForm({ ...form, grupo_id: v })}
                  placeholder="Seleccionar grupo"
                  searchPlaceholder="Buscar grupo..."
                  emptyText="No hay grupos. Créalos en el módulo Grupos."
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maestro Principal</Label>
                <SearchableSelect
                  options={maestroOptions}
                  value={form.maestro_id}
                  onChange={(v) => setForm({ ...form, maestro_id: v })}
                  placeholder="Seleccionar maestro (opcional)"
                  searchPlaceholder="Buscar maestro principal..."
                  emptyText="No hay maestros. Nómbralos en Gestión Maestros."
                  allowClear
                />
              </div>

              <div className="space-y-2">
                <Label>Maestro Auxiliar (Co-docente)</Label>
                <SearchableSelect
                  options={maestroOptions.filter(m => m.value !== form.maestro_id)}
                  value={form.maestro_auxiliar_id}
                  onChange={(v) => setForm({ ...form, maestro_auxiliar_id: v })}
                  placeholder="Seleccionar maestro auxiliar"
                  searchPlaceholder="Buscar maestro auxiliar..."
                  emptyText="No hay maestros disponibles."
                  allowClear
                />
              </div>
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
