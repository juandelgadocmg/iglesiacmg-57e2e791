import { useState, useMemo } from "react";
import {
  Heart, Search, CalendarPlus, PhoneCall, CheckCircle2, Clock, User,
  Calendar, AlertCircle, MessageCircle, FileText, Check, Plus, UserCheck, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { usePersonas } from "@/hooks/useDatabase";
import { useNinos } from "../hooks/useNinos";
import {
  useInfantilSeguimientos,
  useCreateInfantilSeguimiento,
  useUpdateInfantilSeguimiento,
  useInfantilAcudientes,
  isMaestroInfantil
} from "@/hooks/useInfantil";
import { SearchableSelect } from "./SearchableSelect";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function SeguimientoInfantilView() {
  const { data: personas = [] } = usePersonas();
  const { ninos = [] } = useNinos();
  const { data: seguimientos = [], isLoading: isLoadingSeguimientos } = useInfantilSeguimientos();
  const { data: acudientes = [] } = useInfantilAcudientes();
  const createSeguimiento = useCreateInfantilSeguimiento();
  const updateSeguimiento = useUpdateInfantilSeguimiento();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNinoId, setSelectedNinoId] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<"todos" | "Pendiente" | "Completado">("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario de nuevo seguimiento
  const [form, setForm] = useState({
    nino_id: "",
    tipo: "Llamada Pastoral",
    fecha: format(new Date(), "yyyy-MM-dd"),
    hora: "10:00",
    prioridad: "Normal" as "Normal" | "Alta" | "Urgente",
    lider_id: "",
    notas: ""
  });

  // Normalizador de texto para búsquedas sin tildes ni mayúsculas
  const normalize = (str: string) =>
    (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Filtrado de niños para el buscador
  const filteredNinos = useMemo(() => {
    const term = normalize(searchTerm);
    if (!term) return ninos.slice(0, 15);
    const tokens = term.split(/\s+/).filter(Boolean);
    return ninos.filter(n => {
      const full = normalize(`${n.nombres} ${n.apellidos}`);
      const doc = normalize(n.documento || "");
      return tokens.every(t => full.includes(t) || doc.includes(t));
    });
  }, [ninos, searchTerm]);

  // Niño seleccionado actualmente
  const selectedNino = useMemo(() => {
    if (!selectedNinoId) return null;
    return ninos.find(n => n.id === selectedNinoId) || null;
  }, [ninos, selectedNinoId]);

  // Acudientes del niño seleccionado
  const ninoAcudientes = useMemo(() => {
    if (!selectedNinoId) return [];
    const rels = acudientes.filter(a => a.nino_id === selectedNinoId);
    return rels.map(rel => {
      const p = personas.find(per => per.id === rel.acudiente_id);
      return {
        ...rel,
        persona: p || rel.acudiente
      };
    });
  }, [acudientes, personas, selectedNinoId]);

  // Seguimientos filtrados por estado para el panel izquierdo
  const listaSeguimientos = useMemo(() => {
    return (seguimientos || []).filter(s => {
      if (filterEstado === "todos") return true;
      return s.estado === filterEstado;
    });
  }, [seguimientos, filterEstado]);

  // Seguimientos exclusivos del niño seleccionado
  const historialNino = useMemo(() => {
    if (!selectedNinoId) return [];
    return (seguimientos || []).filter(s => s.nino_id === selectedNinoId);
  }, [seguimientos, selectedNinoId]);

  // Opciones de niños para el modal de programación
  const ninosOptions = useMemo(() => {
    return ninos.map(n => ({
      value: n.id,
      label: `${n.nombres} ${n.apellidos}`.trim(),
      hint: n.documento ? `Doc: ${n.documento}` : undefined
    })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [ninos]);

  // Opciones de líderes / maestros
  const maestrosOptions = useMemo(() => {
    return personas
      .filter(isMaestroInfantil)
      .map(m => ({
        value: m.id,
        label: `${m.nombres} ${m.apellidos}`.trim(),
        hint: m.telefono || undefined
      }));
  }, [personas]);

  const handleOpenProgramar = (ninoId?: string) => {
    setForm({
      nino_id: ninoId || selectedNinoId || (ninos[0]?.id || ""),
      tipo: "Llamada Pastoral",
      fecha: format(new Date(), "yyyy-MM-dd"),
      hora: "10:00",
      prioridad: "Normal",
      lider_id: "",
      notas: ""
    });
    setIsModalOpen(true);
  };

  const handleSubmitSeguimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nino_id) {
      toast.error("Por favor selecciona el niño a quien se realizará el seguimiento.");
      return;
    }
    if (!form.notas.trim()) {
      toast.error("Ingresa una nota o descripción para el seguimiento.");
      return;
    }

    const targetNino = ninos.find(n => n.id === form.nino_id);

    try {
      await createSeguimiento.mutateAsync({
        nino_id: form.nino_id,
        tipo: form.tipo,
        fecha: form.fecha,
        hora: form.hora || undefined,
        prioridad: form.prioridad,
        lider_id: form.lider_id || undefined,
        notas: form.notas,
        nino_info: targetNino ? { id: targetNino.id, nombres: targetNino.nombres, apellidos: targetNino.apellidos } : undefined
      });

      toast.success("Seguimiento pastoral programado con éxito");
      setIsModalOpen(false);
      setSelectedNinoId(form.nino_id);
    } catch (err: any) {
      toast.error(err.message || "Error al programar seguimiento");
    }
  };

  const handleToggleEstado = async (seg: any) => {
    const nuevoEstado = seg.estado === "Completado" ? "Pendiente" : "Completado";
    try {
      await updateSeguimiento.mutateAsync({
        id: seg.id,
        estado: nuevoEstado
      });
      toast.success(`Seguimiento marcado como ${nuevoEstado}`);
    } catch (err: any) {
      toast.error("No se pudo actualizar el estado");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Seguimiento Pastoral
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Gestión de llamadas, visitas y seguimiento personalizado a los niños y sus familias.
          </p>
        </div>
        <Button
          onClick={() => handleOpenProgramar()}
          className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6 font-bold"
        >
          <CalendarPlus className="h-5 w-5 mr-2" /> Programar Seguimiento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA 1: LISTADO DE TAREAS Y SEGUIMIENTOS */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-navy flex items-center gap-2">
                  <Heart className="w-4 h-4 text-coral" /> Tareas de Seguimiento
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-white text-slate-600">
                  {listaSeguimientos.length}
                </Badge>
              </div>

              {/* Filtro de estado */}
              <div className="flex gap-1.5 mt-2 bg-slate-200/50 p-1 rounded-xl">
                {(["todos", "Pendiente", "Completado"] as const).map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setFilterEstado(est)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                      filterEstado === est ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[580px] overflow-y-auto divide-y divide-slate-100">
              {isLoadingSeguimientos ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando seguimientos...</div>
              ) : listaSeguimientos.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay seguimientos registrados con el filtro seleccionado.
                </div>
              ) : (
                listaSeguimientos.map((seg) => {
                  const ninoNombre = seg.nino ? `${seg.nino.nombres} ${seg.nino.apellidos}` : "Niño";
                  const isSelected = selectedNinoId === seg.nino_id;

                  return (
                    <div
                      key={seg.id}
                      className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                        isSelected ? "bg-blue-50/70 border-l-4 border-l-navy" : ""
                      }`}
                      onClick={() => setSelectedNinoId(seg.nino_id)}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="font-bold text-sm text-slate-900 line-clamp-1">{ninoNombre}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEstado(seg);
                          }}
                          className="shrink-0"
                          title="Cambiar estado"
                        >
                          {seg.estado === "Completado" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Listo
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" /> Pendiente
                            </Badge>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-navy font-semibold">
                          {seg.tipo}
                        </Badge>
                        <span>{seg.fecha}</span>
                        {seg.prioridad === "Alta" && (
                          <Badge className="bg-red-100 text-red-700 text-[9px] border-0">Alta</Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-white/60 p-2 rounded-lg border border-slate-100/80">
                        {seg.notas}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA 2 & 3: BUSCADOR Y FICHA PASTORAL */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 p-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Buscar niño por nombre, apellido o documento para abrir su ficha pastoral..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-white border-slate-200 focus-visible:ring-navy shadow-sm"
                />
              </div>

              {/* Sugerencias de búsqueda rápida */}
              {searchTerm.trim().length > 0 && filteredNinos.length > 0 && (
                <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {filteredNinos.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setSelectedNinoId(n.id);
                        setSearchTerm("");
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50/60 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-navy">{n.nombres} {n.apellidos}</p>
                        <p className="text-xs text-slate-500">{n.documento ? `Doc: ${n.documento}` : "Sin documento"}</p>
                      </div>
                      <Badge variant="outline" className="text-xs text-navy bg-slate-50">
                        Ver Ficha
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6">
              {!selectedNino ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[420px]">
                  <div className="p-4 bg-slate-100 rounded-3xl mb-4 text-slate-400">
                    <User className="h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Selecciona o busca un niño</h3>
                  <p className="max-w-md text-sm text-slate-500 leading-relaxed mb-6">
                    Elige un niño de la lista de tareas o utiliza el buscador para consultar su historial pastoral, información médica y contactos de acudientes.
                  </p>

                  <div className="w-full max-w-md text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Acceso Rápido a Niños:</p>
                    <div className="flex flex-wrap gap-2">
                      {ninos.slice(0, 8).map((n) => (
                        <Button
                          key={n.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedNinoId(n.id)}
                          className="rounded-xl border-slate-200 text-xs font-semibold hover:border-navy hover:text-navy"
                        >
                          {n.nombres} {n.apellidos}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Ficha encabezado del niño */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-navy to-blue-900 text-white shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">{selectedNino.nombres} {selectedNino.apellidos}</h3>
                        <Badge className="bg-coral text-white border-0 text-[10px] font-semibold">
                          Infantil
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-200 mt-1">
                        {selectedNino.documento ? `Documento: ${selectedNino.documento} · ` : ""}
                        {selectedNino.fecha_nacimiento ? `Nacimiento: ${selectedNino.fecha_nacimiento}` : "Sin fecha"}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleOpenProgramar(selectedNino.id)}
                      className="bg-coral hover:bg-coral/90 text-white font-bold rounded-xl text-xs shadow-md shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar Seguimiento
                    </Button>
                  </div>

                  {/* Alertas médicas y observaciones */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70">
                      <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-4 h-4 text-amber-600" /> Alergias y Alertas Médicas
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedNino.detalles?.alergias || selectedNino.detalles?.info_medica || "Sin alergias ni restricciones médicas registradas."}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                        <FileText className="w-4 h-4 text-blue-600" /> Observaciones Generales
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedNino.detalles?.observaciones || "Sin observaciones especiales registradas."}
                      </p>
                    </div>
                  </div>

                  {/* Sección de Acudientes con contacto directo */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Contactos y Acudientes Autorizados
                    </h4>

                    {ninoAcudientes.length === 0 && !selectedNino.detalles?.contacto_emergencia ? (
                      <p className="text-xs text-slate-400 italic">No hay acudientes vinculados a este niño.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ninoAcudientes.map((acu) => {
                          const tel = acu.persona?.telefono;
                          const cleanTel = tel ? tel.replace(/\D/g, "") : "";
                          const waUrl = cleanTel ? `https://wa.me/${cleanTel.startsWith("57") ? cleanTel : `57${cleanTel}`}` : null;

                          return (
                            <div key={acu.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                              <div className="min-w-0 pr-2">
                                <p className="text-sm font-bold text-navy truncate">
                                  {acu.persona?.nombres} {acu.persona?.apellidos}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {acu.relacion || "Acudiente"} {tel ? `· ${tel}` : ""}
                                </p>
                              </div>

                              <div className="flex gap-1.5 shrink-0">
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    title="WhatsApp al acudiente"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                )}
                                {tel && (
                                  <a
                                    href={`tel:${tel}`}
                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Llamar"
                                  >
                                    <PhoneCall className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {selectedNino.detalles?.contacto_emergencia && (
                          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-navy">Teléfono de Emergencia</p>
                              <p className="text-xs text-slate-500">{selectedNino.detalles.contacto_emergencia}</p>
                            </div>
                            <a
                              href={`tel:${selectedNino.detalles.contacto_emergencia}`}
                              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <PhoneCall className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Historial Pastoral de este niño */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Historial Pastoral ({historialNino.length} registros)
                    </h4>

                    {historialNino.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Aún no se han registrado notas ni seguimientos para este niño.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {historialNino.map((h) => (
                          <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-navy/10 text-navy font-semibold text-[10px] border-0">
                                  {h.tipo}
                                </Badge>
                                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" /> {h.fecha} {h.hora ? `(${h.hora})` : ""}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleEstado(h)}
                              >
                                {h.estado === "Completado" ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-0">
                                    <Check className="w-3 h-3 mr-1" /> Completado
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 text-[10px] border-0">
                                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                                  </Badge>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                              {h.notas}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIÁLOGO: PROGRAMAR SEGUIMIENTO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-navy flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-coral" /> Programar Seguimiento Pastoral
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra una llamada, visita o acompañamiento pastoral para un niño y su familia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSeguimiento} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Niño / Niña *</Label>
              <SearchableSelect
                options={ninosOptions}
                value={form.nino_id}
                onChange={(v) => setForm({ ...form, nino_id: v })}
                placeholder="Seleccionar niño..."
                searchPlaceholder="Buscar por nombre o documento..."
                emptyText="No se encontraron niños."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tipo de Acción *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Llamada Pastoral">Llamada Pastoral</SelectItem>
                    <SelectItem value="Ausencia">Ausencia a Clase</SelectItem>
                    <SelectItem value="Visita Hogar">Visita al Hogar</SelectItem>
                    <SelectItem value="Cumpleaños">Cumpleaños</SelectItem>
                    <SelectItem value="Oración / Salud">Oración / Salud</SelectItem>
                    <SelectItem value="Bienvenida">Bienvenida Nuevo Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Prioridad</Label>
                <Select
                  value={form.prioridad}
                  onValueChange={(v: "Normal" | "Alta" | "Urgente") => setForm({ ...form, prioridad: v })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Fecha *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Hora</Label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Responsable / Maestro Asignado</Label>
              <SearchableSelect
                options={maestrosOptions}
                value={form.lider_id}
                onChange={(v) => setForm({ ...form, lider_id: v })}
                placeholder="Seleccionar maestro (opcional)..."
                searchPlaceholder="Buscar maestro..."
                emptyText="No se encontraron maestros."
                allowClear
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Motivo / Notas Pastorales *</Label>
              <Textarea
                placeholder="Describe el motivo del seguimiento, detalles a conversar o peticiones de oración..."
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                required
                className="text-xs rounded-xl min-h-[80px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={createSeguimiento.isPending} className="bg-navy hover:bg-navy/90 text-white rounded-xl font-bold">
                {createSeguimiento.isPending ? "Guardando..." : "Programar Seguimiento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
