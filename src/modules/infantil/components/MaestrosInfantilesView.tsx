import { useMemo, useState } from "react";
import { Users, UserPlus, Shield, GraduationCap, Phone, Mail, Award, Search, Trash2 } from "lucide-react";
import { usePersonas, useUpdatePersona } from "@/hooks/useDatabase";
import { TIPO_MAESTRO_INFANTIL, getTiposPersona as getTipos, isMaestroInfantil } from "@/hooks/useInfantil";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "./SearchableSelect";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";


export default function MaestrosInfantilesView() {
  const { data: personas, isLoading } = usePersonas();
  const updatePersona = useUpdatePersona();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [selectedPersonaId, setSelectedPersonaId] = useState("");

  const maestros = personas?.filter(isMaestroInfantil) || [];

  const personaOptions = useMemo(
    () =>
      (personas || [])
        .filter((p: any) => !isMaestroInfantil(p))
        .map((p: any) => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`.trim(),
          hint: [p.documento, p.telefono].filter(Boolean).join(" · ") || undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [personas],
  );

  const handleAddMaestro = async () => {
    if (!selectedPersonaId) return toast.error("Selecciona una persona");
    
    const persona = personas?.find(p => p.id === selectedPersonaId);
    if (!persona) return;

    if (isMaestroInfantil(persona)) {
      return toast.error("Esta persona ya es maestro");
    }

    const nuevosTipos = [...getTipos(persona), TIPO_MAESTRO_INFANTIL];
    try {
      await updatePersona.mutateAsync({ id: persona.id, tipos_persona: nuevosTipos } as any);
      toast.success("Maestro nombrado exitosamente");
      setIsModalOpen(false);
      setSelectedPersonaId("");
    } catch (e: any) {
      toast.error("Error al nombrar maestro: " + (e?.message || ""));
    }
  };

  const handleRemoveMaestro = async () => {
    if (!deleteConfirmId) return;
    const persona = personas?.find(p => p.id === deleteConfirmId);
    if (!persona) return;

    const nuevosTipos = getTipos(persona).filter(t => t !== TIPO_MAESTRO_INFANTIL);
    try {
      await updatePersona.mutateAsync({ id: persona.id, tipos_persona: nuevosTipos } as any);
      toast.success("Rol de maestro removido");
      setDeleteConfirmId(null);
    } catch (e: any) {
      toast.error("Error al remover el rol");
    }
  };

  const filteredMaestros = maestros.filter(m => 
    (m.nombres + " " + m.apellidos).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Gestión de Maestros
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Directorio de servidores y maestros capacitados para el ministerio infantil.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6">
          <UserPlus className="h-5 w-5 mr-2" /> Nombrar Maestro
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-white border-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-navy border-t-transparent rounded-full" />
          </div>
        ) : filteredMaestros?.length === 0 ? (
          <Card className="col-span-full border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <GraduationCap className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No hay maestros registrados</h3>
              <p className="text-sm text-slate-500 mb-4">Nombra a tu primer maestro desde la base de datos de personas.</p>
              <Button onClick={() => setIsModalOpen(true)} variant="outline" className="rounded-xl border-navy text-navy hover:bg-navy hover:text-white">Nombrar ahora</Button>
            </CardContent>
          </Card>
        ) : (
          filteredMaestros.map((m) => (
            <Card key={m.id} className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="h-2 w-full bg-gradient-to-r from-blue-400 to-navy" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-slate-100 border border-blue-100 rounded-full flex items-center justify-center font-black text-xl text-navy shadow-sm">
                    {m.nombres?.charAt(0)}{m.apellidos?.charAt(0)}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteConfirmId(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 line-clamp-1" title={`${m.nombres} ${m.apellidos}`}>
                  {m.nombres} {m.apellidos}
                </h3>
                
                <div className="flex items-center gap-1.5 mt-1 mb-4">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 flex items-center gap-1 font-semibold">
                    <Award className="h-3 w-3" /> Maestro Activo
                  </Badge>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  {m.telefono && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" /> {m.telefono}
                    </div>
                  )}
                  {m.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" /> <span className="line-clamp-1">{m.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden border-0 shadow-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-navy to-blue-500" />
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-navy">Nombrar Maestro</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Buscar Persona *</Label>
              <SearchableSelect
                options={personaOptions}
                value={selectedPersonaId}
                onChange={setSelectedPersonaId}
                placeholder="Selecciona un miembro de la iglesia..."
                searchPlaceholder="Escribe nombre, documento o teléfono..."
                emptyText="No se encontró ninguna persona."
                className="h-12 rounded-xl bg-slate-50"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3 mt-4">
              <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">Permisos Especiales</p>
                <p>Al nombrar a esta persona como maestro, podrá ser asignada a las lecciones curriculares de los grupos infantiles.</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleAddMaestro} disabled={updatePersona.isPending} className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8">Confirmar Nombramiento</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog 
        isOpen={!!deleteConfirmId}
        title="Remover Rol de Maestro"
        description="¿Estás seguro de que deseas quitar el rol de maestro a esta persona? No podrá ser asignada a nuevas clases."
        onConfirm={handleRemoveMaestro}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
