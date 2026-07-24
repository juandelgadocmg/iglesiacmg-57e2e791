import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, X, Plus, Trash2, Search, Users, UserPlus, FileText, Ban, CheckCircle2 } from "lucide-react";
import ShareLinkButton from "@/components/shared/ShareLinkButton";
import { useUpdateEvento, useUpdateInscripcion } from "@/hooks/useDatabase";
import {
  useEventoCategorias, useCreateEventoCategoria, useDeleteEventoCategoria,
  useEventoEncargados, useCreateEventoEncargado, useDeleteEventoEncargado,
  useEventoServidores, useCreateEventoServidor, useDeleteEventoServidor,
} from "@/hooks/useEventosExtras";
import { usePersonas, useInscripciones } from "@/hooks/useDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import QrEventoScanner from "@/components/attendance/QrEventoScanner";

interface Props {
  evento: any;
  onBack: () => void;
}

const CLASIFICACIONES = [
  "Protocolo",
  "Alabanza",
  "Danza",
  "Diaconado",
  "Intercesión",
  "Infantil",
  "Afirmación",
  "EscuelasFel",
  "Comunicaciones",
  "Adolescentes y Jóvenes",
  "En Proceso",
];

export default function EventoDetailView({ evento, onBack }: Props) {
  const updateEvento = useUpdateEvento();
  const updateInscripcion = useUpdateInscripcion();
  const queryClient = useQueryClient();
  const { data: categorias, isLoading: loadingCats } = useEventoCategorias(evento.id);
  const createCat = useCreateEventoCategoria();
  const deleteCat = useDeleteEventoCategoria();
  const { data: encargados, isLoading: loadingEnc } = useEventoEncargados(evento.id);
  const createEnc = useCreateEventoEncargado();
  const deleteEnc = useDeleteEventoEncargado();
  const { data: servidores, isLoading: loadingSrv } = useEventoServidores(evento.id);
  const createSrv = useCreateEventoServidor();
  const deleteSrv = useDeleteEventoServidor();
  const { data: personas } = usePersonas();
  const { data: inscripciones } = useInscripciones(evento.id);

  const [form, setForm] = useState({
    nombre: evento.nombre || "",
    tipo: evento.tipo || "",
    fecha_inicio: evento.fecha_inicio || "",
    fecha_fin: evento.fecha_fin || "",
    fecha_cierre_inscripciones: evento.fecha_cierre_inscripciones || "",
    lugar: evento.lugar || "",
    cupos: evento.cupos || "",
    descripcion: evento.descripcion || "",
    estado: evento.estado || "Próximo",
    color: evento.color || "#3b82f6",
  });

  const [newCatName, setNewCatName] = useState("");
  const [newCatAforo, setNewCatAforo] = useState("");
  const [searchEnc, setSearchEnc] = useState("");
  const [searchSrv, setSearchSrv] = useState("");
  const [selectedClasificacion, setSelectedClasificacion] = useState("Protocolo");
  const [informeTab, setInformeTab] = useState("inscripciones");
  const [informeFechaDesde, setInformeFechaDesde] = useState("");
  const [informeFechaHasta, setInformeFechaHasta] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [searchAsistencia, setSearchAsistencia] = useState("");

  const handleSaveGeneral = async () => {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    try {
      await updateEvento.mutateAsync({
        id: evento.id,
        nombre: form.nombre.trim(),
        tipo: form.tipo || null,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        lugar: form.lugar || null,
        cupos: form.cupos ? parseInt(form.cupos) : null,
        descripcion: form.descripcion || null,
        estado: form.estado,
        color: form.color,
        fecha_cierre_inscripciones: form.fecha_cierre_inscripciones || null,
      } as any);
      toast.success("Evento actualizado");
    } catch { toast.error("Error al guardar"); }
  };

  const handleCancelarActividad = async () => {
    if (!motivoCancelacion.trim()) { toast.error("Ingresa el motivo de cancelación"); return; }
    setCancelando(true);
    try {
      await updateEvento.mutateAsync({
        id: evento.id,
        estado: "Cancelado",
        motivo_cancelacion: motivoCancelacion.trim(),
      } as any);
      toast.success("Actividad cancelada");
      setCancelDialogOpen(false);
      onBack();
    } catch { toast.error("Error al cancelar"); }
    finally { setCancelando(false); }
  };

  const handleToggleAsistencia = async (inscId: string, currentValue: boolean) => {
    try {
      await updateInscripcion.mutateAsync({ id: inscId, confirmado: !currentValue });
      queryClient.invalidateQueries({ queryKey: ["inscripciones", evento.id] });
    } catch { toast.error("Error al actualizar asistencia"); }
  };

  const handleAddCategoria = async () => {
    if (!newCatName.trim()) return;
    try {
      await createCat.mutateAsync({ evento_id: evento.id, nombre: newCatName.trim(), aforo: parseInt(newCatAforo) || 0 });
      setNewCatName(""); setNewCatAforo("");
      toast.success("Categoría agregada");
    } catch { toast.error("Error"); }
  };

  const filteredPersonasEnc = (personas || []).filter(p => {
    const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
    const alreadyAdded = (encargados || []).some(e => e.persona_id === p.id);
    return full.includes(searchEnc.toLowerCase()) && !alreadyAdded;
  });

  const filteredPersonasSrv = (personas || []).filter(p => {
    const full = `${p.nombres} ${p.apellidos}`.toLowerCase();
    const alreadyAdded = (servidores || []).some(s => s.persona_id === p.id);
    return full.includes(searchSrv.toLowerCase()) && !alreadyAdded;
  });

  const handleAddEncargado = async (personaId: string) => {
    try {
      await createEnc.mutateAsync({ evento_id: evento.id, persona_id: personaId });
      toast.success("Encargado agregado");
    } catch { toast.error("Error"); }
  };

  const handleAddServidor = async (personaId: string) => {
    try {
      await createSrv.mutateAsync({ evento_id: evento.id, persona_id: personaId, clasificacion: selectedClasificacion });
      toast.success("Servidor agregado");
    } catch { toast.error("Error"); }
  };

  const totalInscritos = inscripciones?.length || 0;
  const confirmados = inscripciones?.filter(i => i.confirmado).length || 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Volver"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Actualizar Actividad: "{evento.nombre}"</h1>
          <p className="text-sm text-muted-foreground">Formulario para la actualización de la actividad.</p>
        </div>
        <ShareLinkButton
          toastMessage="Enlace del evento copiado"
          buildUrl={() => {
            const p = new URLSearchParams(window.location.search);
            p.set("ev", String(evento.id));
            return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
          }}
        />
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="encargados">Encargados</TabsTrigger>
          <TabsTrigger value="asistencias">Asistencias</TabsTrigger>
          <TabsTrigger value="servidores">Servidores Actividad</TabsTrigger>
          <TabsTrigger value="informes">📊 Informes</TabsTrigger>
        </TabsList>

        {/* TAB GENERAL */}
        <TabsContent value="general">
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <div className="flex gap-2">
              <Button onClick={handleSaveGeneral} disabled={updateEvento.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Guardar
              </Button>
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
              {evento.estado !== "Cancelado" && (
                <Button variant="destructive" onClick={() => setCancelDialogOpen(true)} className="gap-2">
                  <Ban className="h-4 w-4" /> Cancelar Actividad
                </Button>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Información principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la actividad *</Label>
                  <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Selecciona un color</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Fechas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de inicio *</Label>
                  <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de cierre (Inscripciones)</Label>
                  <Input type="date" value={form.fecha_cierre_inscripciones} onChange={e => setForm(f => ({ ...f, fecha_cierre_inscripciones: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de finalización</Label>
                  <Input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Próximo">Próximo</SelectItem>
                      <SelectItem value="En curso">En curso</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de evento</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Evento Gratuito">Evento Gratuito</SelectItem>
                    <SelectItem value="Evento Cerrado">Evento Cerrado</SelectItem>
                    <SelectItem value="Evento Abierto">Evento Abierto</SelectItem>
                    <SelectItem value="Conferencia">Conferencia</SelectItem>
                    <SelectItem value="Retiro">Retiro</SelectItem>
                    <SelectItem value="Campamento">Campamento</SelectItem>
                    <SelectItem value="Taller">Taller</SelectItem>
                    <SelectItem value="Concierto">Concierto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input value={form.lugar} onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea rows={4} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ingresa la información acerca de los predicadores o artistas invitados..." />
              </div>
              <div className="space-y-2">
                <Label>Cupos</Label>
                <Input type="number" min="0" value={form.cupos} onChange={e => setForm(f => ({ ...f, cupos: e.target.value }))} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB CATEGORIAS */}
        <TabsContent value="categorias">
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-foreground">Categorías: "{evento.nombre}"</h3>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ej: VIP, General" className="w-48" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Aforo</Label>
                <Input type="number" value={newCatAforo} onChange={e => setNewCatAforo(e.target.value)} placeholder="1000" className="w-28" />
              </div>
              <Button onClick={handleAddCategoria} disabled={createCat.isPending} className="gap-2">
                <Plus className="h-4 w-4" /> Agregar Categoría
              </Button>
            </div>

            {loadingCats ? <Skeleton className="h-32 w-full" /> : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">DESCRIPCIÓN</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">AFORO</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">AFORO OCUPADO</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(categorias || []).length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No hay categorías creadas</td></tr>
                    ) : (categorias || []).map(cat => (
                      <tr key={cat.id} className="border-t">
                        <td className="px-4 py-3 text-sm font-medium">Nombre: {cat.nombre}</td>
                        <td className="px-4 py-3 text-sm text-center">{cat.aforo?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 text-sm text-center">{cat.inscritos || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <DeleteConfirmDialog onConfirm={() => deleteCat.mutateAsync(cat.id)} title="¿Eliminar categoría?" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB ENCARGADOS */}
        <TabsContent value="encargados">
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-foreground">Encargados de la Actividad</h3>
            <p className="text-sm text-muted-foreground">Selecciona el/los encargado/s del Actividad</p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar persona por código, nombre o apellido..."
                value={searchEnc}
                onChange={e => setSearchEnc(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchEnc.length > 1 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredPersonasEnc.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer" onClick={() => handleAddEncargado(p.id)}>
                    <span className="text-sm">{p.nombres} {p.apellidos}</span>
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                ))}
                {filteredPersonasEnc.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No se encontraron personas</p>}
              </div>
            )}

            {loadingEnc ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-2">
                {(encargados || []).length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No hay encargados asignados</p>
                  </div>
                ) : (encargados || []).map(enc => (
                  <div key={enc.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {((enc as any).personas?.nombres?.[0] || "") + ((enc as any).personas?.apellidos?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{(enc as any).personas?.nombres} {(enc as any).personas?.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{enc.rol}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEnc.mutateAsync(enc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB ASISTENCIAS */}
        <TabsContent value="asistencias">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-semibold text-foreground">Asistencias del Evento</h3>
              <QrEventoScanner eventoId={evento.id} onAsistenciaMarked={() => queryClient.invalidateQueries({ queryKey: ["inscripciones", evento.id] })} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Inscritos</p>
                <p className="text-2xl font-bold text-foreground">{totalInscritos}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">Presentes</p>
                <p className="text-2xl font-bold text-primary">{confirmados}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-destructive">{totalInscritos - confirmados}</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar asistente por nombre o cédula..."
                value={searchAsistencia}
                onChange={e => setSearchAsistencia(e.target.value)}
                className="pl-10"
              />
            </div>

            {(inscripciones || []).length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay inscripciones para este evento</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Persona</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Asistencia</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Pago</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inscripciones || [])
                      .filter(insc => {
                        if (!searchAsistencia) return true;
                        const name = `${(insc as any).personas?.nombres || ""} ${(insc as any).personas?.apellidos || ""}`.toLowerCase();
                        return name.includes(searchAsistencia.toLowerCase());
                      })
                      .map(insc => (
                      <tr key={insc.id} className="border-t">
                        <td className="px-4 py-3 text-sm">{(insc as any).personas?.nombres} {(insc as any).personas?.apellidos}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant={insc.confirmado ? "default" : "outline"}
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => handleToggleAsistencia(insc.id, !!insc.confirmado)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {insc.confirmado ? "Presente" : "Ausente"}
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={insc.estado_pago === "Pagado" ? "default" : "outline"}>
                            {insc.estado_pago || "Pendiente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">{new Date(insc.created_at).toLocaleDateString("es")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB SERVIDORES */}
        <TabsContent value="servidores">
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-foreground">Servidores Actividad</h3>
            <p className="text-sm text-muted-foreground">Aquí puedes agregar los servidores del evento.</p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Label className="text-xs font-medium">Clasificación servidor:</Label>
              <div className="flex flex-wrap gap-2">
                {CLASIFICACIONES.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedClasificacion(c)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selectedClasificacion === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-foreground border-border hover:bg-muted"}`}
                  >
                    {c} <span className="ml-1 opacity-60">{(servidores || []).filter(s => s.clasificacion === c).length}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar persona por código, nombre o apellido..."
                value={searchSrv}
                onChange={e => setSearchSrv(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchSrv.length > 1 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredPersonasSrv.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 cursor-pointer" onClick={() => handleAddServidor(p.id)}>
                    <span className="text-sm">{p.nombres} {p.apellidos}</span>
                    <Badge variant="outline">{selectedClasificacion}</Badge>
                  </div>
                ))}
              </div>
            )}

            {loadingSrv ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-2">
                {(servidores || []).filter(s => s.clasificacion === selectedClasificacion).length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No hay servidores con clasificación "{selectedClasificacion}"</p>
                  </div>
                ) : (servidores || []).filter(s => s.clasificacion === selectedClasificacion).map(srv => (
                  <div key={srv.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-accent/10 text-accent">
                          {((srv as any).personas?.nombres?.[0] || "") + ((srv as any).personas?.apellidos?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{(srv as any).personas?.nombres} {(srv as any).personas?.apellidos}</p>
                        <Badge variant="secondary" className="text-xs">{srv.clasificacion}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSrv.mutateAsync(srv.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB INFORMES */}
        <TabsContent value="informes">
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-foreground">Informes del Evento</h3>

            {/* Sub-tabs for report types */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "inscripciones", label: "📋 Informe de Inscripciones" },
                { key: "pagos", label: "💰 Informe de Pagos" },
                { key: "asistencia", label: "📊 Informe de Asistencia" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setInformeTab(tab.key)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${informeTab === tab.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-foreground border-border hover:bg-muted"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">📅 Filtrar por fecha:</span>
                <Input type="date" value={informeFechaDesde} onChange={e => setInformeFechaDesde(e.target.value)} className="h-7 w-36 text-xs" />
                <span className="text-muted-foreground">a</span>
                <Input type="date" value={informeFechaHasta} onChange={e => setInformeFechaHasta(e.target.value)} className="h-7 w-36 text-xs" />
              </div>
              {(informeFechaDesde || informeFechaHasta) && (
                <Button variant="ghost" size="sm" onClick={() => { setInformeFechaDesde(""); setInformeFechaHasta(""); }}>Limpiar filtro</Button>
              )}
            </div>

            {/* INFORME INSCRIPCIONES */}
            {informeTab === "inscripciones" && (() => {
              let filtered = inscripciones || [];
              if (informeFechaDesde) filtered = filtered.filter(i => new Date(i.created_at) >= new Date(informeFechaDesde));
              if (informeFechaHasta) filtered = filtered.filter(i => new Date(i.created_at) <= new Date(informeFechaHasta + "T23:59:59"));
              const confirmadosCount = filtered.filter(i => i.confirmado).length;
              const pendientesCount = filtered.length - confirmadosCount;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Total Inscritos</p>
                      <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Confirmados</p>
                      <p className="text-2xl font-bold text-primary">{confirmadosCount}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Pendientes</p>
                      <p className="text-2xl font-bold text-amber-500">{pendientesCount}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">#</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Persona</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Confirmado</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Estado Pago</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Fecha Inscripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No hay inscripciones registradas</td></tr>
                        ) : filtered.map((insc, idx) => (
                          <tr key={insc.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium">{(insc as any).personas?.nombres} {(insc as any).personas?.apellidos}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={insc.confirmado ? "default" : "secondary"}>{insc.confirmado ? "Sí" : "No"}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={insc.estado_pago === "Pagado" ? "default" : "outline"}>{insc.estado_pago || "Pendiente"}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm text-muted-foreground">{new Date(insc.created_at).toLocaleDateString("es")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* INFORME PAGOS */}
            {informeTab === "pagos" && (() => {
              let filtered = inscripciones || [];
              if (informeFechaDesde) filtered = filtered.filter(i => new Date(i.created_at) >= new Date(informeFechaDesde));
              if (informeFechaHasta) filtered = filtered.filter(i => new Date(i.created_at) <= new Date(informeFechaHasta + "T23:59:59"));
              const pagados = filtered.filter(i => i.estado_pago === "Pagado");
              const pendientes = filtered.filter(i => i.estado_pago !== "Pagado");

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Total Registros</p>
                      <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Pagados</p>
                      <p className="text-2xl font-bold text-emerald-600">{pagados.length}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Pendientes de Pago</p>
                      <p className="text-2xl font-bold text-rose-500">{pendientes.length}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">#</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Persona</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Estado Pago</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No hay registros de pago</td></tr>
                        ) : filtered.map((insc, idx) => (
                          <tr key={insc.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium">{(insc as any).personas?.nombres} {(insc as any).personas?.apellidos}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={insc.estado_pago === "Pagado" ? "default" : "outline"}>{insc.estado_pago || "Pendiente"}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm text-muted-foreground">{new Date(insc.created_at).toLocaleDateString("es")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* INFORME ASISTENCIA */}
            {informeTab === "asistencia" && (() => {
              let filtered = inscripciones || [];
              if (informeFechaDesde) filtered = filtered.filter(i => new Date(i.created_at) >= new Date(informeFechaDesde));
              if (informeFechaHasta) filtered = filtered.filter(i => new Date(i.created_at) <= new Date(informeFechaHasta + "T23:59:59"));
              const confirmadosCount = filtered.filter(i => i.confirmado).length;
              const ausentes = filtered.length - confirmadosCount;
              const porcentaje = filtered.length > 0 ? Math.round((confirmadosCount / filtered.length) * 100) : 0;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Total Inscritos</p>
                      <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Asistieron</p>
                      <p className="text-2xl font-bold text-primary">{confirmadosCount}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">Ausentes</p>
                      <p className="text-2xl font-bold text-rose-500">{ausentes}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">% Asistencia</p>
                      <p className="text-2xl font-bold text-foreground">{porcentaje}%</p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">#</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Persona</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Asistencia</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Fecha Registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No hay registros de asistencia</td></tr>
                        ) : filtered.map((insc, idx) => (
                          <tr key={insc.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-2.5 text-sm font-medium">{(insc as any).personas?.nombres} {(insc as any).personas?.apellidos}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={insc.confirmado ? "default" : "destructive"}>{insc.confirmado ? "Presente" : "Ausente"}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-center text-sm text-muted-foreground">{new Date(insc.created_at).toLocaleDateString("es")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>

      {/* CANCEL DIALOG */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" /> Cancelar Actividad
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Por medio de este formulario podrás cancelar la actividad <strong>"{evento.nombre}"</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="space-y-2">
              <Label>Ingresa los motivos por los cuales se cancelará la actividad *</Label>
              <Textarea
                rows={4}
                value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                placeholder="Describe el motivo de la cancelación..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Salir</Button>
            <Button variant="destructive" onClick={handleCancelarActividad} disabled={cancelando} className="gap-2">
              <Ban className="h-4 w-4" /> Cancelar Actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
