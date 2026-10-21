import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Calendar as CalendarIcon,
  Plus,
  Users,
  UserRound,
  Edit2,
  RefreshCw,
  Sparkles,
  Clock,
  MapPin,
  Shirt,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import {
  useInfantilClases,
  useCreateInfantilClase,
  useUpdateInfantilClase,
  useInfantilGrupos,
  isMaestroInfantil,
  useProgramacionReunionesInfantil,
  useMigrarProgramacionReuniones,
  type ServicioReunionInfantil,
} from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  const { data: serviciosReuniones = [], isLoading: isLoadingReuniones } = useProgramacionReunionesInfantil();
  const migrarReuniones = useMigrarProgramacionReuniones();
  const createClase = useCreateInfantilClase();
  const updateClase = useUpdateInfantilClase();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedReunionKey, setSelectedReunionKey] = useState<string>("");
  const [vistaFiltro, setVistaFiltro] = useState<"todos" | "reuniones" | "clases">("todos");

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
    estado: "Programada",
  });

  // Servicios de Reuniones que tienen programación infantil diligenciada
  const serviciosInfantilProgramados = useMemo(
    () => serviciosReuniones.filter((s) => s.tiene_programacion_infantil),
    [serviciosReuniones]
  );

  // Auto-migración silenciosa a infantil_clases cuando hay programación en Reuniones y grupos disponibles
  const autoSyncedRef = useRef<string>("");
  useEffect(() => {
    if (!grupos || grupos.length === 0) return;
    if (serviciosInfantilProgramados.length === 0) return;
    const fingerprint = serviciosInfantilProgramados
      .map((s) => `${s.key}:${s.maestro_id}:${s.maestro_auxiliar_id}:${s.tema}:${s.versiculo}`)
      .join("|");
    if (autoSyncedRef.current === fingerprint) return;
    autoSyncedRef.current = fingerprint;
    migrarReuniones.mutate(serviciosInfantilProgramados);
  }, [serviciosInfantilProgramados, grupos]);

  // Servicio de Reuniones actualmente seleccionado o coincidente por fecha en el modal
  const reunionActivaModal = useMemo(() => {
    if (selectedReunionKey) {
      return serviciosReuniones.find((s) => s.key === selectedReunionKey) || null;
    }
    if (form.fecha) {
      return (
        serviciosReuniones.find((s) => s.fecha === form.fecha && s.tiene_programacion_infantil) ||
        serviciosReuniones.find((s) => s.fecha === form.fecha) ||
        null
      );
    }
    return null;
  }, [selectedReunionKey, form.fecha, serviciosReuniones]);

  // Función que "llama" toda la información programada de un servicio de Reuniones al formulario
  const aplicarServicioReunionAlFormulario = (srv: ServicioReunionInfantil, showToast = true) => {
    setSelectedReunionKey(srv.key);
    const defaultGrupo = srv.grupo_sugerido_id || form.grupo_id || grupos?.[0]?.id || "";
    setForm((prev) => ({
      ...prev,
      grupo_id: defaultGrupo,
      fecha: srv.fecha || prev.fecha,
      maestro_id: srv.maestro_id || prev.maestro_id || "",
      maestro_auxiliar_id: srv.maestro_auxiliar_id || prev.maestro_auxiliar_id || "",
      tema: srv.tema || prev.tema || srv.evento_titulo,
      versiculo: srv.versiculo || prev.versiculo || "",
      objetivo: srv.objetivo || prev.objetivo || "",
      actividad: srv.actividad || prev.actividad || "",
      materiales: srv.materiales || prev.materiales || "",
    }));
    if (showToast) {
      toast.success(`Programación cargada desde Reuniones: ${srv.evento_titulo} (${srv.fecha})`);
    }
  };

  const handleFechaChange = (nuevaFecha: string) => {
    setForm((prev) => ({ ...prev, fecha: nuevaFecha }));
    // Si existe un servicio en Reuniones para esa fecha, llamar automáticamente toda su programación
    const match =
      serviciosReuniones.find((s) => s.fecha === nuevaFecha && s.tiene_programacion_infantil) ||
      serviciosReuniones.find((s) => s.fecha === nuevaFecha);
    if (match) {
      setSelectedReunionKey(match.key);
      setForm((prev) => ({
        ...prev,
        fecha: nuevaFecha,
        grupo_id: prev.grupo_id || match.grupo_sugerido_id || grupos?.[0]?.id || "",
        maestro_id: match.maestro_id || prev.maestro_id || "",
        maestro_auxiliar_id: match.maestro_auxiliar_id || prev.maestro_auxiliar_id || "",
        tema: match.tema || prev.tema || match.evento_titulo,
        versiculo: match.versiculo || prev.versiculo || "",
        objetivo: match.objetivo || prev.objetivo || "",
        actividad: match.actividad || prev.actividad || "",
        materiales: match.materiales || prev.materiales || "",
      }));
      toast.info(`Se cargó automáticamente lo programado para el servicio del ${nuevaFecha}`);
    } else {
      setSelectedReunionKey("");
    }
  };

  const openNew = () => {
    setEditingId(null);
    const hoy = format(new Date(), "yyyy-MM-dd");
    const srvHoy =
      serviciosReuniones.find((s) => s.fecha === hoy && s.tiene_programacion_infantil) ||
      serviciosInfantilProgramados[0] ||
      null;

    if (srvHoy && srvHoy.fecha === hoy) {
      setSelectedReunionKey(srvHoy.key);
      setForm({
        grupo_id: srvHoy.grupo_sugerido_id || grupos?.[0]?.id || "",
        maestro_id: srvHoy.maestro_id || "",
        maestro_auxiliar_id: srvHoy.maestro_auxiliar_id || "",
        fecha: srvHoy.fecha,
        tema: srvHoy.tema || srvHoy.evento_titulo,
        versiculo: srvHoy.versiculo || "",
        objetivo: srvHoy.objetivo || "",
        actividad: srvHoy.actividad || "",
        materiales: srvHoy.materiales || "",
        estado: "Programada",
      });
    } else {
      setSelectedReunionKey("");
      setForm({
        grupo_id: grupos?.[0]?.id || "",
        maestro_id: "",
        maestro_auxiliar_id: "",
        fecha: hoy,
        tema: "",
        versiculo: "",
        objetivo: "",
        actividad: "",
        materiales: "",
        estado: "Programada",
      });
    }
    setIsModalOpen(true);
  };

  const openFromReunion = (srv: ServicioReunionInfantil) => {
    // Buscar si ya existe en infantil_clases para editarlo, o crearlo con los datos de Reuniones
    const existente = (clases || []).find(
      (c: any) => c.fecha === srv.fecha && (c.tema === srv.tema || c.grupo_id === srv.grupo_sugerido_id)
    );
    setEditingId(existente?.id || null);
    setSelectedReunionKey(srv.key);
    setForm({
      grupo_id: existente?.grupo_id || srv.grupo_sugerido_id || grupos?.[0]?.id || "",
      maestro_id: srv.maestro_id || existente?.maestro_id || "",
      maestro_auxiliar_id: srv.maestro_auxiliar_id || existente?.maestro_auxiliar_id || "",
      fecha: srv.fecha,
      tema: srv.tema || existente?.tema || srv.evento_titulo,
      versiculo: srv.versiculo || existente?.versiculo || "",
      objetivo: srv.objetivo || existente?.objetivo || "",
      actividad: srv.actividad || existente?.actividad || "",
      materiales: srv.materiales || existente?.materiales || "",
      estado: existente?.estado || "Programada",
    });
    setIsModalOpen(true);
  };

  const openEdit = (clase: any) => {
    setEditingId(clase.id);
    const matchReunion =
      serviciosReuniones.find((s) => s.fecha === clase.fecha && s.tiene_programacion_infantil) ||
      serviciosReuniones.find((s) => s.fecha === clase.fecha) ||
      null;
    setSelectedReunionKey(matchReunion?.key || "");
    setForm({
      grupo_id: clase.grupo_id || matchReunion?.grupo_sugerido_id || grupos?.[0]?.id || "",
      maestro_id: clase.maestro_id || matchReunion?.maestro_id || "",
      maestro_auxiliar_id: clase.maestro_auxiliar_id || matchReunion?.maestro_auxiliar_id || "",
      fecha: clase.fecha || format(new Date(), "yyyy-MM-dd"),
      tema: clase.tema || matchReunion?.tema || "",
      versiculo: clase.versiculo || matchReunion?.versiculo || "",
      objetivo: clase.objetivo || matchReunion?.objetivo || "",
      actividad: clase.actividad || matchReunion?.actividad || "",
      materiales: clase.materiales || matchReunion?.materiales || "",
      estado: clase.estado || "Programada",
    });
    setIsModalOpen(true);
  };

  const handleSincronizarManual = async () => {
    if (serviciosInfantilProgramados.length === 0) {
      toast.info("No se encontraron servicios con programación infantil pendiente en el módulo de Reuniones.");
      return;
    }
    try {
      const res = await migrarReuniones.mutateAsync(serviciosInfantilProgramados);
      toast.success(
        `Sincronización completada: ${res.creados} clases nuevas migradas y ${res.actualizados} actualizadas desde Reuniones.`
      );
    } catch (err: any) {
      toast.error(err.message || "Error al sincronizar con Reuniones");
    }
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
      maestro_auxiliar_id: form.maestro_auxiliar_id || null,
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

  // Incluir tanto maestros nombrados en Gestión Maestros como servidores asignados desde Reuniones
  const maestroOptions = useMemo(() => {
    const idsEnReuniones = new Set<string>();
    serviciosReuniones.forEach((s) => {
      if (s.maestro_id) idsEnReuniones.add(s.maestro_id);
      if (s.maestro_auxiliar_id) idsEnReuniones.add(s.maestro_auxiliar_id);
      s.equipo_infantil.forEach((eq) => idsEnReuniones.add(eq.persona_id));
    });

    const filtrados = (personas || []).filter((p: any) => isMaestroInfantil(p) || idsEnReuniones.has(p.id));
    const base = filtrados.length > 0 ? filtrados : personas || [];

    return base
      .map((m: any) => ({
        value: m.id,
        label: `${m.nombres} ${m.apellidos}`.trim(),
        hint: m.telefono || undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [personas, serviciosReuniones]);

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
    [grupos]
  );

  const servicioReunionOptions = useMemo(
    () =>
      serviciosReuniones.map((s) => ({
        value: s.key,
        label: `${s.fecha} · ${s.evento_titulo} (${s.ministerio_nombre})`,
        hint:
          s.equipo_infantil.length > 0
            ? `${s.equipo_infantil.length} servidor(es) · ${s.tema}`
            : s.tema || "Sin servidores aún",
      })),
    [serviciosReuniones]
  );

  // Mapa rápido por fecha/tema para enriquecer las tarjetas de clases con el equipo de Reuniones (Infantil y Kings Army)
  const findReunionParaClase = (c: any): ServicioReunionInfantil | undefined => {
    const candidatos = serviciosReuniones.filter((s) => s.fecha === c.fecha);
    if (candidatos.length === 0) return undefined;
    return (
      candidatos.find((s) => s.tema && c.tema && s.tema.toLowerCase() === c.tema.toLowerCase()) ||
      candidatos.find((s) => s.grupo_sugerido_id && s.grupo_sugerido_id === c.grupo_id) ||
      candidatos.find((s) => s.tiene_programacion_infantil) ||
      candidatos[0]
    );
  };

  // Servicios programados en Reuniones (Infantil y Kings Army) que aún no tienen fila equivalente en infantil_clases
  const reunionesSinClaseEnBd = useMemo(
    () =>
      serviciosInfantilProgramados.filter(
        (s) =>
          !(clases || []).some(
            (c: any) =>
              c.fecha === s.fecha &&
              ((c.tema && s.tema && c.tema.toLowerCase() === s.tema.toLowerCase()) ||
                (s.grupo_sugerido_id && c.grupo_id === s.grupo_sugerido_id))
          )
      ),
    [serviciosInfantilProgramados, clases]
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Programación de Clases y Servicios
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
            Sincronizado automáticamente con la programación de Kabod y Kings Army (Ministerio Infantil y Adolescentes) en el módulo de Reuniones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleSincronizarManual}
            disabled={migrarReuniones.isPending || isLoadingReuniones}
            className="border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-navy font-bold rounded-xl h-11 px-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${migrarReuniones.isPending ? "animate-spin" : ""}`} />
            Migrar desde Reuniones ({serviciosInfantilProgramados.length})
          </Button>
          <Button
            onClick={openNew}
            className="bg-navy hover:bg-navy/90 text-white shadow-lg shadow-navy/20 transition-all hover:scale-105 active:scale-95 rounded-xl h-11 px-6"
          >
            <Plus className="h-5 w-5 mr-2" /> Programar Clase
          </Button>
        </div>
      </div>

      {/* Selector de vista */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setVistaFiltro("todos")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            vistaFiltro === "todos" ? "bg-navy text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Vista Unificada ({(clases?.length || 0) + reunionesSinClaseEnBd.length})
        </button>
        <button
          type="button"
          onClick={() => setVistaFiltro("reuniones")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            vistaFiltro === "reuniones" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Programado en Reuniones ({serviciosInfantilProgramados.length})
        </button>
        <button
          type="button"
          onClick={() => setVistaFiltro("clases")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            vistaFiltro === "clases" ? "bg-navy text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Clases Infantiles ({clases?.length || 0})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* SECCIÓN 1: TARJETAS DIRECTAS DESDE EL MÓDULO DE REUNIONES */}
          {(vistaFiltro === "reuniones" || (vistaFiltro === "todos" && reunionesSinClaseEnBd.length > 0)) && (
            <div className="space-y-4">
              {vistaFiltro === "reuniones" && serviciosInfantilProgramados.length === 0 ? (
                <Card className="border-dashed shadow-none">
                  <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <h3 className="text-base font-semibold text-slate-700">
                      Sin servicios infantiles diligenciados en Reuniones
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mt-1">
                      Cuando asignes maestros, auxiliares o temas en el módulo{" "}
                      <strong>Reuniones → Programación</strong> (para el Ministerio Infantil), aparecerán aquí
                      automáticamente.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {(vistaFiltro === "reuniones" ? serviciosInfantilProgramados : reunionesSinClaseEnBd).map((srv) => (
                    <Card
                      key={srv.key}
                      className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 shadow-lg shadow-blue-200/40 bg-white rounded-2xl hover:-translate-y-1"
                    >
                      <div
                        className="absolute top-0 left-0 w-1.5 h-full"
                        style={{ background: srv.ministerio_color || "#2563eb" }}
                      />
                      <CardHeader className="pb-3 pt-5 px-5">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 text-[10px] font-bold">
                              <Sparkles className="w-3 h-3 mr-1" /> Desde Reuniones · {srv.ministerio_nombre}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {srv.estado_evento}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs bg-slate-100 hover:bg-navy hover:text-white text-navy rounded-lg font-semibold transition-all"
                            onClick={() => openFromReunion(srv)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Ver / Editar
                          </Button>
                        </div>
                        <CardTitle
                          className="text-lg font-bold text-navy line-clamp-1 group-hover:text-blue-600 transition-colors"
                          title={srv.tema}
                        >
                          {srv.tema}
                        </CardTitle>
                        <CardDescription className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-blue-600" />
                          Servicio: {srv.evento_titulo} {srv.grupo_texto ? `· Grupo: ${srv.grupo_texto}` : ""}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3 px-5 pb-5">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                            <CalendarIcon className="h-3.5 w-3.5" />
                          </div>
                          <span>
                            {format(new Date(`${srv.fecha}T00:00:00`), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                            {srv.hora ? ` · ${srv.hora}` : ""}
                          </span>
                        </div>

                        {srv.maestro && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                            <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                              <UserRound className="h-3.5 w-3.5" />
                            </div>
                            <span>
                              Maestro:{" "}
                              <strong className="text-navy">
                                {srv.maestro.nombres} {srv.maestro.apellidos}
                              </strong>{" "}
                              {srv.maestro.cargo ? `(${srv.maestro.cargo})` : ""}
                            </span>
                          </div>
                        )}

                        {srv.maestro_auxiliar && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                            <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                              <Users className="h-3.5 w-3.5" />
                            </div>
                            <span>
                              Auxiliar:{" "}
                              <strong className="text-blue-900">
                                {srv.maestro_auxiliar.nombres} {srv.maestro_auxiliar.apellidos}
                              </strong>{" "}
                              {srv.maestro_auxiliar.cargo ? `(${srv.maestro_auxiliar.cargo})` : ""}
                            </span>
                          </div>
                        )}

                        {/* Equipo completo asignado en el servicio */}
                        {srv.equipo_infantil.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Equipo programado en Reuniones ({srv.equipo_infantil.length}):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {srv.equipo_infantil.map((eq) => (
                                <Badge
                                  key={eq.id}
                                  variant="secondary"
                                  className="text-[10px] bg-slate-100 text-slate-700 font-medium"
                                >
                                  <strong className="text-navy mr-1">{eq.cargo_nombre}:</strong> {eq.nombres}{" "}
                                  {eq.apellidos}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Campos pedagógicos diligenciados en Reuniones */}
                        {(srv.versiculo || srv.objetivo || srv.materiales || srv.actividad || srv.uniforme) && (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                            {srv.versiculo && (
                              <p>
                                <strong className="text-navy">Texto Bíblico:</strong> {srv.versiculo}
                              </p>
                            )}
                            {srv.objetivo && (
                              <p>
                                <strong className="text-navy">Objetivo:</strong> {srv.objetivo}
                              </p>
                            )}
                            {srv.materiales && (
                              <p>
                                <strong className="text-navy">Material:</strong> {srv.materiales}
                              </p>
                            )}
                            {srv.actividad && (
                              <p>
                                <strong className="text-navy">Dinámica:</strong> {srv.actividad}
                              </p>
                            )}
                            {srv.uniforme && (
                              <p>
                                <strong className="text-navy">Uniforme:</strong> {srv.uniforme}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN 2: CLASES EN IGLESIA INFANTIL (ENRIQUECIDAS CON DATOS DE REUNIONES) */}
          {vistaFiltro !== "reuniones" && (
            <>
              {isLoading ? (
                <div className="flex justify-center p-10">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : (clases?.length || 0) === 0 && reunionesSinClaseEnBd.length === 0 ? (
                <Card className="border-dashed shadow-none">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">Sin clases programadas</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Programa una clase aquí o diligencia el Ministerio Infantil en el módulo de Reuniones.
                    </p>
                    <Button variant="outline" onClick={openNew}>
                      Crear o llamar desde Reuniones
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {clases?.map((c: any) => {
                    const srvReunion = findReunionParaClase(c);
                    return (
                      <Card
                        key={c.id}
                        className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 shadow-lg shadow-slate-200/50 bg-white rounded-2xl hover:-translate-y-1"
                      >
                        <div
                          className={`absolute top-0 left-0 w-1.5 h-full ${
                            c.estado === "Realizada"
                              ? "bg-emerald-500"
                              : c.estado === "Cancelada"
                              ? "bg-red-500"
                              : "bg-gradient-to-b from-coral to-orange-400"
                          }`}
                        />
                        <CardHeader className="pb-3 pt-5 px-5">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge
                                variant={c.estado === "Realizada" ? "default" : "secondary"}
                                className={`font-semibold tracking-wide uppercase text-[10px] ${
                                  c.estado === "Realizada"
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : c.estado === "Cancelada"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-coral/10 text-coral hover:bg-coral/20"
                                }`}
                              >
                                {c.estado}
                              </Badge>
                              {srvReunion?.tiene_programacion_infantil && (
                                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Reuniones: {srvReunion.ministerio_nombre}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 -mr-2 bg-slate-100/50 hover:bg-slate-200 text-slate-500 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100"
                              onClick={() => openEdit(c)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardTitle
                            className="text-xl font-bold text-navy line-clamp-1 group-hover:text-coral transition-colors"
                            title={c.tema}
                          >
                            {c.tema}
                          </CardTitle>
                          <CardDescription className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {c.grupo?.nombre || "Grupo Infantil"}
                            {srvReunion?.evento_titulo ? ` · ${srvReunion.evento_titulo}` : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 px-5 pb-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                              <CalendarIcon className="h-4 w-4" />
                            </div>
                            {format(new Date(`${c.fecha}T00:00:00`), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                          </div>

                          {(c.maestro || srvReunion?.maestro) && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                                <UserRound className="h-4 w-4" />
                              </div>
                              <span>
                                Maestro:{" "}
                                <strong className="text-navy">
                                  {c.maestro
                                    ? `${c.maestro.nombres} ${c.maestro.apellidos}`
                                    : `${srvReunion?.maestro?.nombres} ${srvReunion?.maestro?.apellidos}`}
                                </strong>
                              </span>
                            </div>
                          )}

                          {(c.maestro_auxiliar || c.maestro_auxiliar_id || srvReunion?.maestro_auxiliar) &&
                            (() => {
                              const aux =
                                c.maestro_auxiliar ||
                                personas?.find((p) => p.id === c.maestro_auxiliar_id) ||
                                srvReunion?.maestro_auxiliar;
                              if (!aux) return null;
                              return (
                                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                  <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                                    <Users className="h-4 w-4" />
                                  </div>
                                  <span>
                                    Auxiliar:{" "}
                                    <strong className="text-blue-900">
                                      {aux.nombres} {aux.apellidos}
                                    </strong>
                                  </span>
                                </div>
                              );
                            })()}

                          {/* Si el servicio tiene más servidores asignados en Reuniones (Recepción, Aseo, etc.), mostrarlos */}
                          {srvReunion && srvReunion.equipo_infantil.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Equipo del servicio ({srvReunion.equipo_infantil.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {srvReunion.equipo_infantil.map((eq) => (
                                  <Badge
                                    key={eq.id}
                                    variant="outline"
                                    className="text-[10px] bg-slate-50 text-slate-700 border-slate-200"
                                  >
                                    <strong className="text-navy mr-1">{eq.cargo_nombre}:</strong> {eq.nombres}{" "}
                                    {eq.apellidos}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {c.versiculo && (
                            <div className="mt-2 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100 rounded-xl text-xs italic text-slate-600 line-clamp-2 relative">
                              <span className="text-3xl text-slate-200 absolute top-1 left-2 font-serif leading-none">
                                "
                              </span>
                              <span className="relative z-10 pl-4 block">{c.versiculo}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel Lateral: Servicios de Reuniones + Grupos Activos */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-700 to-indigo-600 text-white">
              <CardTitle className="text-base font-bold flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="h-4 w-4" />
                </div>
                Servicios en Reuniones
              </CardTitle>
              <CardDescription className="text-blue-100 text-xs">
                Haz clic en cualquier servicio para llamar toda su programación a Iglesia Infantil.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 max-h-80 overflow-y-auto space-y-2.5">
              {serviciosReuniones.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  No hay reuniones programadas aún en el módulo de Reuniones.
                </p>
              ) : (
                serviciosReuniones.slice(0, 12).map((srv) => (
                  <button
                    key={srv.key}
                    type="button"
                    onClick={() => openFromReunion(srv)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/70 hover:border-blue-200 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-navy group-hover:text-blue-700 truncate">
                        {srv.evento_titulo}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          srv.tiene_programacion_infantil
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        {srv.fecha}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      {srv.tiene_programacion_infantil
                        ? `${srv.ministerio_nombre} · ${srv.equipo_infantil.length} servidor(es) · ${srv.tema}`
                        : "Clic para programar este servicio"}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 bg-navy text-white">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
                Grupos Infantiles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {grupos?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay grupos creados con tipo "Infantil".</p>
              ) : (
                <div className="space-y-3">
                  {grupos?.map((g: any) => (
                    <div
                      key={g.id}
                      className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-navy">{g.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{g.edades || "Edades no especificadas"}</p>
                      </div>
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 shadow-sm font-medium">
                        Activo
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL: PROGRAMAR / EDITAR CLASE (CON LLAMADO AUTOMÁTICO DESDE REUNIONES) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Clase Infantil" : "Programar Clase Infantil"}</DialogTitle>
            <DialogDescription className="text-xs">
              Selecciona un servicio del módulo de Reuniones o elige su fecha para llamar automáticamente todo lo que
              está programado para ese servicio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Selector para llamar directamente cualquier servicio programado en Reuniones */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Llamar programación desde Servicio de Reuniones
                </Label>
                {reunionActivaModal && (
                  <Badge className="bg-blue-600 text-white border-0 text-[10px]">
                    {reunionActivaModal.ministerio_nombre}
                  </Badge>
                )}
              </div>
              <SearchableSelect
                options={servicioReunionOptions}
                value={selectedReunionKey}
                onChange={(key) => {
                  const srv = serviciosReuniones.find((s) => s.key === key);
                  if (srv) aplicarServicioReunionAlFormulario(srv, true);
                  else setSelectedReunionKey("");
                }}
                placeholder="Seleccionar reunión / servicio para cargar sus datos..."
                searchPlaceholder="Buscar por fecha, título o ministerio..."
                emptyText="No hay servicios registrados en Reuniones."
                allowClear
              />

              {/* Resumen de todo lo programado para este servicio en el módulo de Reuniones */}
              {reunionActivaModal && (
                <div className="p-3 rounded-lg bg-white border border-blue-100 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-navy">
                      {reunionActivaModal.evento_titulo} · {reunionActivaModal.fecha}
                      {reunionActivaModal.hora ? ` (${reunionActivaModal.hora})` : ""}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => aplicarServicioReunionAlFormulario(reunionActivaModal, true)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Volver a cargar datos del servicio
                    </Button>
                  </div>

                  {reunionActivaModal.equipo_infantil.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-600">
                        Servidores programados en este servicio ({reunionActivaModal.equipo_infantil.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {reunionActivaModal.equipo_infantil.map((eq) => (
                          <Badge key={eq.id} variant="secondary" className="text-[10px]">
                            <strong className="mr-1">{eq.cargo_nombre}:</strong> {eq.nombres} {eq.apellidos} (
                            {eq.estado})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Este servicio aún no tiene servidores asignados en el ministerio infantil.
                    </p>
                  )}

                  {(reunionActivaModal.uniforme || reunionActivaModal.observacion) && (
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      {reunionActivaModal.uniforme && (
                        <span className="flex items-center gap-1">
                          <Shirt className="h-3 w-3 text-blue-600" />
                          <strong>Uniforme:</strong> {reunionActivaModal.uniforme}
                        </span>
                      )}
                      {reunionActivaModal.observacion && (
                        <span>
                          <strong>Observación:</strong> {reunionActivaModal.observacion}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                <Label>Fecha del Servicio *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => handleFechaChange(e.target.value)}
                  required
                />
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
                  emptyText="No hay maestros disponibles."
                  allowClear
                />
              </div>

              <div className="space-y-2">
                <Label>Maestro Auxiliar (Co-docente)</Label>
                <SearchableSelect
                  options={maestroOptions.filter((m) => m.value !== form.maestro_id)}
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
              <Input
                value={form.tema}
                onChange={(e) => setForm({ ...form, tema: e.target.value })}
                required
                placeholder="Ej. El arca de Noé"
              />
            </div>

            <div className="space-y-2">
              <Label>Versículo / Texto Bíblico</Label>
              <Input
                value={form.versiculo}
                onChange={(e) => setForm({ ...form, versiculo: e.target.value })}
                placeholder="Génesis 6:22"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Textarea
                  value={form.objetivo}
                  onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
                  placeholder="¿Qué deben aprender hoy?"
                  className="h-20 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Actividad / Dinámica</Label>
                <Textarea
                  value={form.actividad}
                  onChange={(e) => setForm({ ...form, actividad: e.target.value })}
                  placeholder="Pintar el arca, recortar animales..."
                  className="h-20 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Materiales Necesarios</Label>
                <Textarea
                  value={form.materiales}
                  onChange={(e) => setForm({ ...form, materiales: e.target.value })}
                  placeholder="Colores, tijeras, hojas..."
                  className="h-20 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(val) => setForm({ ...form, estado: val })}>
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
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingId ? "Guardar Cambios" : "Guardar Programación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
