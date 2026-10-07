import { useState } from "react";
import { Users, UserPlus, ShieldCheck, Phone, Mail, Link as LinkIcon, AlertTriangle, ShieldAlert, CheckCircle2, Trash2 } from "lucide-react";
import { useInfantilAcudientes, useCreateInfantilAcudiente, useUpdateInfantilAcudiente, useDeleteInfantilAcudiente } from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

export default function PadresView() {
  const { data: acudientes, isLoading } = useInfantilAcudientes();
  const { data: personas } = usePersonas();
  const createAcudiente = useCreateInfantilAcudiente();
  const updateAcudiente = useUpdateInfantilAcudiente();
  const deleteAcudiente = useDeleteInfantilAcudiente();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [ninoPopoverOpen, setNinoPopoverOpen] = useState(false);
  const [acudientePopoverOpen, setAcudientePopoverOpen] = useState(false);
  
  const [form, setForm] = useState({
    nino_id: "",
    acudiente_id: "",
    relacion: "Madre",
    autorizado_recoger: true,
    es_principal: false
  });

  const openNew = () => {
    setForm({
      nino_id: "",
      acudiente_id: "",
      relacion: "Madre",
      autorizado_recoger: true,
      es_principal: false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nino_id || !form.acudiente_id) {
      toast.error("Por favor selecciona un niño y un acudiente.");
      return;
    }
    
    // Check if the relationship already exists
    const exists = acudientes?.some(a => a.nino_id === form.nino_id && a.acudiente_id === form.acudiente_id);
    if (exists) {
      toast.error("Esta relación familiar ya está registrada.");
      return;
    }

    try {
      await createAcudiente.mutateAsync(form);
      toast.success("Acudiente vinculado correctamente");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al vincular acudiente");
    }
  };

  const toggleAutorizacion = async (id: string, currentStatus: boolean) => {
    try {
      await updateAcudiente.mutateAsync({ id, autorizado_recoger: !currentStatus });
      toast.success(currentStatus ? "Permiso revocado" : "Permiso concedido");
    } catch (err: any) {
      toast.error("No se pudo actualizar el permiso");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteAcudiente.mutateAsync(deleteConfirmId);
      toast.success("Relación eliminada");
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error("No se pudo eliminar");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Padres y Acudientes
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Gestiona las autorizaciones de recogida y contactos de emergencia.</p>
        </div>
        <Button onClick={openNew} className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6">
          <UserPlus className="h-5 w-5 mr-2" /> Vincular Acudiente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Registro de Autorizaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-12 flex justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-navy border-t-transparent rounded-full" />
                </div>
              ) : acudientes?.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p>No hay relaciones de acudientes registradas.</p>
                  <Button variant="link" onClick={openNew} className="text-navy mt-2">Crear la primera</Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {acudientes?.map((a) => (
                    <div key={a.id} className="p-5 flex flex-col sm:flex-row gap-4 justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                          {a.nino?.nombres?.charAt(0)}{a.nino?.apellidos?.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-800">{a.nino?.nombres} {a.nino?.apellidos}</h3>
                            {a.es_principal && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-[10px] px-1.5 py-0 h-4">Principal</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <LinkIcon className="h-3 w-3 text-slate-400" />
                            <span className="font-medium">{a.relacion}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-navy">{a.acudiente?.nombres} {a.acudiente?.apellidos}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            {a.acudiente?.telefono && (
                              <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {a.acudiente.telefono}</div>
                            )}
                            {a.acudiente?.email && (
                              <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {a.acudiente.email}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${a.autorizado_recoger ? "text-emerald-600" : "text-slate-400"}`}>
                            {a.autorizado_recoger ? "Autorizado" : "No Autorizado"}
                          </span>
                          <Switch 
                            checked={a.autorizado_recoger}
                            onCheckedChange={() => toggleAutorizacion(a.id, a.autorizado_recoger)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(a.id)} className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-1" /> Desvincular
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-gradient-to-b from-navy to-blue-900 text-white rounded-3xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-coral" />
                Política de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-blue-100/90">
              <p>
                La iglesia mantiene un protocolo estricto de entrega de menores para garantizar su seguridad.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Solo las personas marcadas como <strong>Autorizadas</strong> podrán recoger al niño usando su código QR.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>El <strong>Acudiente Principal</strong> será contactado primero en caso de emergencia.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden border-0 shadow-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-navy to-blue-500" />
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-navy">Vincular Acudiente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Seleccionar Niño *</Label>
              <Popover open={ninoPopoverOpen} onOpenChange={setNinoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ninoPopoverOpen}
                    className="w-full justify-between h-12 rounded-xl bg-slate-50 font-normal"
                  >
                    <span className="truncate">
                      {form.nino_id 
                        ? personas?.find(p => p.id === form.nino_id)?.nombres + " " + personas?.find(p => p.id === form.nino_id)?.apellidos
                        : "Busca al niño..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ninguna persona.</CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-y-auto">
                        {personas?.map(p => (
                          <CommandItem
                            key={p.id}
                            value={`${p.nombres} ${p.apellidos}`}
                            onSelect={() => {
                              setForm({...form, nino_id: p.id});
                              setNinoPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.nino_id === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nombres} {p.apellidos}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Seleccionar Acudiente *</Label>
              <Popover open={acudientePopoverOpen} onOpenChange={setAcudientePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={acudientePopoverOpen}
                    className="w-full justify-between h-12 rounded-xl bg-slate-50 font-normal"
                  >
                    <span className="truncate">
                      {form.acudiente_id 
                        ? personas?.find(p => p.id === form.acudiente_id)?.nombres + " " + personas?.find(p => p.id === form.acudiente_id)?.apellidos
                        : "Busca al acudiente..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ninguna persona.</CommandEmpty>
                      <CommandGroup className="max-h-[250px] overflow-y-auto">
                        {personas?.map(p => (
                          <CommandItem
                            key={p.id}
                            value={`${p.nombres} ${p.apellidos}`}
                            onSelect={() => {
                              setForm({...form, acudiente_id: p.id});
                              setAcudientePopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.acudiente_id === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nombres} {p.apellidos}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">Relación Familiar *</Label>
              <Select value={form.relacion} onValueChange={(val) => setForm({...form, relacion: val})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Madre">Madre</SelectItem>
                  <SelectItem value="Padre">Padre</SelectItem>
                  <SelectItem value="Abuelo/a">Abuelo/a</SelectItem>
                  <SelectItem value="Tío/a">Tío/a</SelectItem>
                  <SelectItem value="Hermano/a mayor">Hermano/a mayor</SelectItem>
                  <SelectItem value="Tutor Legal">Tutor Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50 mt-4">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-slate-800">Autorizado para recoger</Label>
                <p className="text-xs text-slate-500">Esta persona puede llevarse al niño.</p>
              </div>
              <Switch checked={form.autorizado_recoger} onCheckedChange={(val) => setForm({...form, autorizado_recoger: val})} className="data-[state=checked]:bg-emerald-500" />
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-slate-800">Contacto Principal</Label>
                <p className="text-xs text-slate-500">Llamar primero en emergencias.</p>
              </div>
              <Switch checked={form.es_principal} onCheckedChange={(val) => setForm({...form, es_principal: val})} />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-xl px-8">Vincular</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog 
        isOpen={!!deleteConfirmId}
        title="Desvincular Acudiente"
        description="¿Estás seguro de que deseas eliminar esta relación familiar? El acudiente ya no estará autorizado para recoger al niño."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
