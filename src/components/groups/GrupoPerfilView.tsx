import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PersonaDetailDialog from "@/components/groups/PersonaDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import {
  useGrupoDetalle, useGrupoMiembrosDetalle, useGrupoReportes, useGrupoAsistenciaStats,
  type MiembroDetalle, type ReporteResumen,
} from "@/hooks/useGrupoPerfil";
import {
  useAddGrupoMiembro, useUpdateMiembroRol, useRemoveGrupoMiembro, useSearchPersonas, ROLES_GRUPO,
} from "@/hooks/useGrupoMembers";
import {
  Users, Shield, Home, UserCheck, Search, UserPlus, X, MapPin, Clock,
  CalendarDays, Phone, Mail, ChevronLeft, Pencil, ClipboardList, TrendingUp,
  TrendingDown, UserMinus, Star, Network, Crown, BarChart3, FileText,
  CheckCircle2, XCircle, DollarSign, Map as MapIcon, Eye, Download,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";
import GrupoFormDialog from "@/components/forms/GrupoFormDialog";
import ReporteGrupoFormDialog from "@/components/forms/ReporteGrupoFormDialog";
import PlanificacionGrupoFormDialog from "@/components/forms/PlanificacionGrupoFormDialog";
import { usePlanificaciones, useDeletePlanificacion } from "@/hooks/usePlanificaciones";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { exportGroupProfilePDF } from "@/lib/exportUtils";

interface Props {
  grupoId: string;
  onBack: (() => void) | null;
  readOnly?: boolean;
}

const rolIcon = (rol: string) => {
  switch (rol) {
    case "lider": return <Shield className="h-3 w-3" />;
    case "sublider": return <Star className="h-3 w-3" />;
    case "anfitrion": return <Home className="h-3 w-3" />;
    case "colaborador": return <UserCheck className="h-3 w-3" />;
    default: return null;
  }
};

const rolBadgeClass = (rol: string) => {
  switch (rol) {
    case "lider": return "bg-primary/10 text-primary border-primary/30";
    case "sublider": return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400";
    case "anfitrion": return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400";
    case "colaborador": return "bg-info/10 text-info border-info/30";
    default: return "";
  }
};

export default function GrupoPerfilView({ grupoId, onBack, readOnly = false }: Props) {
  const { data: grupo, isLoading: loadingGrupo, isError: errorGrupo, error: grupoErr, refetch: refetchGrupo } = useGrupoDetalle(grupoId);
  const { data: miembros, isLoading: loadingMiembros } = useGrupoMiembrosDetalle(grupoId);
  const { data: reportes } = useGrupoReportes(grupoId);
  const { data: asistenciaStats } = useGrupoAsistenciaStats(grupoId);

  const [editing, setEditing] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<any>(null);
  const [memberFilterRol, setMemberFilterRol] = useState("todos");
  const [memberFilterEstado, setMemberFilterEstado] = useState("todos");
  const [addingRol, setAddingRol] = useState("asistente");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const MEMBERS_PER_PAGE = 20;

  const addMiembro = useAddGrupoMiembro();
  const updateRol = useUpdateMiembroRol();
  const removeMiembro = useRemoveGrupoMiembro();
  const { data: searchResults } = useSearchPersonas(searchQuery);

  const existingIds = new Set((miembros || []).map(m => m.persona_id));
  const filteredSearch = (searchResults || []).filter(p => !existingIds.has(p.id));

  // Metrics
  const metrics = useMemo(() => {
    const allMembers = miembros || [];
    const total = allMembers.length;
    const equipo = allMembers.filter(m => m.rol !== "asistente");
    const activos = allMembers.filter(m => m.persona?.estado_iglesia === "Activo");
    const inactivos = total - activos.length;

    const reps = reportes || [];
    const lastReport = reps[0];
    const totalNuevos = reps.reduce((s, r) => s + r.nuevos, 0);
    const avgPresentes = reps.length > 0 ? Math.round(reps.reduce((s, r) => s + r.presentes, 0) / reps.length) : 0;

    // Retention: % of members who were present in last report vs total
    const retencion = lastReport && total > 0 ? Math.round((lastReport.presentes / total) * 100) : 0;

    return { total, equipo: equipo.length, activos: activos.length, inactivos, totalNuevos, avgPresentes, retencion, lastReport };
  }, [miembros, reportes]);

  // Filter members
  const filteredMembers = useMemo(() => {
    let list = miembros || [];
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      list = list.filter(m => {
        const p = m.persona;
        return p && (`${p.nombres} ${p.apellidos}`.toLowerCase().includes(q) || p.telefono?.includes(q) || p.email?.toLowerCase().includes(q));
      });
    }
    if (memberFilterRol !== "todos") list = list.filter(m => m.rol === memberFilterRol);
    if (memberFilterEstado !== "todos") {
      list = list.filter(m => {
        if (memberFilterEstado === "activo") return m.persona?.estado_iglesia === "Activo";
        return m.persona?.estado_iglesia !== "Activo";
      });
    }
    return list;
  }, [miembros, memberSearch, memberFilterRol, memberFilterEstado]);

  const equipoMembers = filteredMembers.filter(m => m.rol !== "asistente");
  const asistenteMembers = filteredMembers.filter(m => m.rol === "asistente");

  // Chart data
  const chartData = useMemo(() => {
    return (asistenciaStats || []).map(s => ({
      fecha: format(parseISO(s.fecha), "dd MMM", { locale: es }),
      Presentes: s.presentes,
      Ausentes: s.ausentes,
      Nuevos: s.nuevos,
    }));
  }, [asistenciaStats]);

  const handleAdd = async (personaId: string) => {
    try {
      await addMiembro.mutateAsync({ grupo_id: grupoId, persona_id: personaId, rol: addingRol });
      toast.success("Miembro agregado");
      setSearchQuery("");
    } catch (err: any) {
      toast.error(err.message || "Error al agregar");
    }
  };

  const handleRolChange = async (miembroId: string, newRol: string) => {
    try {
      await updateRol.mutateAsync({ id: miembroId, grupo_id: grupoId, rol: newRol });
      toast.success("Rol actualizado");
    } catch { toast.error("Error al actualizar rol"); }
  };

  const handleRemove = async (miembroId: string) => {
    try {
      await removeMiembro.mutateAsync({ id: miembroId, grupo_id: grupoId });
      toast.success("Miembro removido");
    } catch { toast.error("Error al remover"); }
  };

  if (loadingGrupo) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-[500px] w-full" /></div>;
  }

  if (!grupo) return <div className="text-center py-12 text-muted-foreground">Grupo no encontrado</div>;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back button — hidden for lider_casa_paz (readOnly) */}
      {onBack && (
        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Volver a Grupos
        </Button>
      )}

      {/* ====== HEADER ====== */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{grupo.nombre}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">{grupo.tipo}</Badge>
                {grupo.red && <Badge variant="secondary" className="text-xs gap-1"><Network className="h-3 w-3" />Red {grupo.red}</Badge>}
                <StatusBadge status={grupo.estado} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
              if (!grupo) return;
              const mList = (miembros || []).map(m => ({
                nombre: `${m.persona?.nombres || ""} ${m.persona?.apellidos || ""}`,
                rol: ROLES_GRUPO.find(r => r.value === m.rol)?.label || "Asistente",
                telefono: m.persona?.telefono || "",
                email: m.persona?.email || "",
                estado: m.persona?.estado_iglesia || "",
              }));
              const rList = (reportes || []).map(r => ({
                fecha: format(parseISO(r.fecha), "dd/MM/yyyy"),
                presentes: r.presentes,
                ausentes: r.ausentes,
                nuevos: r.nuevos,
                ofrenda: r.ofrenda_casa_paz || 0,
                estado: r.estado,
              }));
              exportGroupProfilePDF(grupo as any, metrics, mList, rList);
              toast.success("PDF generado");
            }}>
              <Download className="h-3.5 w-3.5" /> Exportar PDF
            </Button>
            {!readOnly && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            )}
            {(() => {
              const now = new Date();
              const day = now.getDay();
              const mins = now.getHours() * 60 + now.getMinutes();
              const isOpen = day >= 1 && day <= 4 && !(day === 4 && mins >= 23 * 60 + 59);
              return (
                <div className="flex flex-col items-end gap-0.5">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShowReportForm(true)}
                    disabled={!isOpen}
                    title={!isOpen ? "Solo disponible lunes a jueves hasta las 11:59 PM" : ""}
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Crear Reporte
                  </Button>
                  {!isOpen && (
                    <p className="text-[10px] text-destructive">⏰ Lunes–Jue 11:59 PM</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Breadcrumb hierarchy */}
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Crown className="h-4 w-4" /><span>Equipo Ministerial</span>
          <span>›</span>
          {grupo.red ? (<><Network className="h-4 w-4" /><span>Red {grupo.red}</span><span>›</span></>) : null}
          <Home className="h-4 w-4" /><span className="text-foreground font-medium">{grupo.nombre}</span>
        </div>
      </div>

      {/* ====== METRICS ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard icon={Users} label="Integrantes" value={metrics.total} />
        <MetricCard icon={Shield} label="Equipo" value={metrics.equipo} />
        <MetricCard icon={BarChart3} label="Promedio Asist." value={metrics.avgPresentes} />
        <MetricCard icon={TrendingUp} label="Nuevos (total)" value={metrics.totalNuevos} />
        <MetricCard icon={UserMinus} label="Inactivos" value={metrics.inactivos} />
        <MetricCard icon={CheckCircle2} label="Retención" value={`${metrics.retencion}%`} />
      </div>

      {/* ====== TABS ====== */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="integrantes">Integrantes ({metrics.total})</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          <TabsTrigger value="planificacion" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Planificación
          </TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>

        {/* ====== INFO TAB ====== */}
        <TabsContent value="info">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Group info */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Información Principal</h3>
              <div className="space-y-3 text-sm">
                {grupo.descripcion && <InfoRow label="Descripción" value={grupo.descripcion} />}
                <InfoRow label="Tipo de grupo" value={grupo.tipo} />
                <InfoRow label="Red" value={grupo.red || "Sin asignar"} />
                <InfoRow label="Fecha de creación" value={format(parseISO(grupo.created_at), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })} />
                <InfoRow label="Integrantes" value={String(metrics.total)} />
              </div>
            </div>

            {/* Contact info */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Información de Contacto</h3>
              <div className="space-y-3 text-sm">
                <InfoRow icon={CalendarDays} label="Día de reunión" value={grupo.dia_reunion || "—"} />
                <InfoRow icon={Clock} label="Hora de reunión" value={grupo.hora_reunion || "—"} />
                <InfoRow icon={MapPin} label="Dirección" value={grupo.ubicacion || "—"} />
                {grupo.lider && (
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={grupo.lider.foto_url || undefined} />
                      <AvatarFallback className="text-xs">{grupo.lider.nombres[0]}{grupo.lider.apellidos[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Líder</p>
                      <p className="font-medium">{grupo.lider.nombres} {grupo.lider.apellidos}</p>
                      {grupo.lider.telefono && <p className="text-xs text-muted-foreground">{grupo.lider.telefono}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Equipo de trabajo summary */}
            <div className="rounded-xl border bg-card p-5 space-y-3 md:col-span-2">
              <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Equipo de Trabajo</h3>
              {loadingMiembros ? <Skeleton className="h-20" /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(miembros || []).filter(m => m.rol !== "asistente").map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={m.persona?.foto_url || undefined} />
                        <AvatarFallback className="text-xs">{m.persona?.nombres?.[0]}{m.persona?.apellidos?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.persona?.nombres} {m.persona?.apellidos}</p>
                        <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${rolBadgeClass(m.rol)}`}>
                          {rolIcon(m.rol)} {ROLES_GRUPO.find(r => r.value === m.rol)?.label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(miembros || []).filter(m => m.rol !== "asistente").length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">No hay equipo de trabajo asignado</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ====== INTEGRANTES TAB ====== */}
        <TabsContent value="integrantes">
          <div className="space-y-4">
            {/* Add member — hidden for readOnly */}
            {!readOnly && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Agregar integrante</p>
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar persona..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={addingRol} onValueChange={setAddingRol}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES_GRUPO.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {searchQuery.length >= 2 && filteredSearch.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {filteredSearch.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.foto_url || undefined} />
                        <AvatarFallback className="text-[10px]">{p.nombres[0]}{p.apellidos[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.nombres} {p.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{p.tipo_persona}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => handleAdd(p.id)} disabled={addMiembro.isPending}>
                        <UserPlus className="h-3.5 w-3.5" /> Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )} {/* end !readOnly add member */}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filtrar integrantes..." value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setMembersPage(1); }} className="pl-10" />
              </div>
              <Select value={memberFilterRol} onValueChange={setMemberFilterRol}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  {ROLES_GRUPO.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={memberFilterEstado} onValueChange={setMemberFilterEstado}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activo iglesia</SelectItem>
                  <SelectItem value="inactivo">Inactivo iglesia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Members list */}
            {loadingMiembros ? <Skeleton className="h-[300px]" /> : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No se encontraron integrantes</p>
              </div>
            ) : (
              <>
                {equipoMembers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Equipo de Trabajo ({equipoMembers.length})</h4>
                    <div className="space-y-1.5">
                      {equipoMembers.map(m => <MemberCard key={m.id} miembro={m} onRolChange={handleRolChange} onRemove={handleRemove} readOnly={readOnly} onView={setSelectedPersona} />)}
                    </div>
                  </div>
                )}
                {equipoMembers.length > 0 && asistenteMembers.length > 0 && <Separator />}
                {asistenteMembers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Asistentes ({asistenteMembers.length})</h4>
                    <div className="space-y-1.5">
                      {asistenteMembers.slice((membersPage - 1) * MEMBERS_PER_PAGE, membersPage * MEMBERS_PER_PAGE).map(m => (
                        <MemberCard key={m.id} miembro={m} onRolChange={handleRolChange} onRemove={handleRemove} readOnly={readOnly} onView={setSelectedPersona} />
                      ))}
                    </div>
                    {asistenteMembers.length > MEMBERS_PER_PAGE && (() => {
                      const totalPages = Math.ceil(asistenteMembers.length / MEMBERS_PER_PAGE);
                      return (
                        <div className="flex items-center justify-between pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            Mostrando {(membersPage - 1) * MEMBERS_PER_PAGE + 1}–{Math.min(membersPage * MEMBERS_PER_PAGE, asistenteMembers.length)} de {asistenteMembers.length}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={membersPage <= 1} onClick={() => setMembersPage(p => p - 1)}>
                              ← Anterior
                            </Button>
                            {totalPages <= 7 ? (
                              Array.from({ length: totalPages }, (_, i) => (
                                <Button key={i + 1} variant={membersPage === i + 1 ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setMembersPage(i + 1)}>
                                  {i + 1}
                                </Button>
                              ))
                            ) : (
                              <>
                                {[1, 2].map(n => (
                                  <Button key={n} variant={membersPage === n ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setMembersPage(n)}>{n}</Button>
                                ))}
                                {membersPage > 3 && <span className="text-xs px-1">…</span>}
                                {membersPage > 2 && membersPage < totalPages - 1 && (
                                  <Button variant="default" size="sm" className="h-7 w-7 text-xs p-0">{membersPage}</Button>
                                )}
                                {membersPage < totalPages - 2 && <span className="text-xs px-1">…</span>}
                                {[totalPages - 1, totalPages].map(n => (
                                  <Button key={n} variant={membersPage === n ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setMembersPage(n)}>{n}</Button>
                                ))}
                              </>
                            )}
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={membersPage >= totalPages} onClick={() => setMembersPage(p => p + 1)}>
                              Siguiente →
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Person detail dialog */}
          <PersonaDetailDialog
            persona={selectedPersona}
            open={!!selectedPersona}
            onOpenChange={(o) => !o && setSelectedPersona(null)}
          />
        </TabsContent>

        {/* ====== ESTADÍSTICAS TAB ====== */}
        <TabsContent value="estadisticas">
          <div className="space-y-4">
            {chartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No hay datos de asistencia disponibles</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold mb-4">Asistencia últimos 6 meses</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="fecha" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Presentes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Ausentes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold mb-4">Tendencia de asistencia</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="fecha" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Presentes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Nuevos" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ====== REPORTES TAB ====== */}
        <TabsContent value="reportes">
          <div className="space-y-3">
            {(!reportes || reportes.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No hay reportes registrados</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-2">
                  {reportes.map(r => (
                    <div key={r.id} className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{format(parseISO(r.fecha), "EEEE d 'de' MMMM yyyy", { locale: es })}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" />{r.presentes} presentes</span>
                              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" />{r.ausentes} ausentes</span>
                              {r.nuevos > 0 && <span className="flex items-center gap-1"><UserPlus className="h-3 w-3 text-info" />{r.nuevos} nuevos</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(r.ofrenda_casa_paz || 0) > 0 && (
                            <Badge variant="outline" className="text-xs gap-1"><DollarSign className="h-3 w-3" />${r.ofrenda_casa_paz}</Badge>
                          )}
                          <ReportStatusBadge estado={r.estado} />
                        </div>
                      </div>
                      {r.mensaje && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.mensaje}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ====== PLANIFICACIÓN TAB ====== */}
        <TabsContent value="planificacion">
          <PlanificacionTab grupoId={grupoId} readOnly={readOnly} />
        </TabsContent>

        {/* ====== MAPA TAB ====== */}
        <TabsContent value="mapa">
          {grupo.latitud && grupo.longitud ? (
            <div className="rounded-xl border overflow-hidden">
              <MapEmbed lat={grupo.latitud} lng={grupo.longitud} nombre={grupo.nombre} />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay coordenadas registradas para este grupo</p>
              <p className="text-xs mt-1">Edita el grupo para agregar latitud y longitud</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {editing && grupo && <GrupoFormDialog initialData={grupo as any} onClose={() => setEditing(false)} />}
      <ReporteGrupoFormDialog open={showReportForm} onOpenChange={setShowReportForm} />
    </div>
  );
}

// ====== Sub-components ======

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function ReportStatusBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    "Aprobado": "bg-success/10 text-success border-success/30",
    "No Aprobado": "bg-destructive/10 text-destructive border-destructive/30",
    "No Verificado": "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400",
    "No Finalizado": "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={`text-[10px] h-5 ${styles[estado] || ""}`}>{estado}</Badge>;
}

function MemberCard({ miembro, onRolChange, onRemove, readOnly = false, onView }: { miembro: MiembroDetalle; onRolChange: (id: string, rol: string) => void; onRemove: (id: string) => void; readOnly?: boolean; onView?: (persona: any) => void }) {
  const p = miembro.persona;
  if (!p) return null;
  const initials = `${p.nombres?.[0] || ""}${p.apellidos?.[0] || ""}`.toUpperCase();
  const rol = miembro.rol || "asistente";
  const rolLabel = ROLES_GRUPO.find(r => r.value === rol)?.label || "Asistente";

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onView?.(p)}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={p.foto_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{p.nombres} {p.apellidos}</p>
          <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${rolBadgeClass(rol)}`}>
            {rolIcon(rol)} {rolLabel}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-5">{p.tipo_persona}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          {p.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefono}</span>}
          {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
          {p.direccion && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.direccion}</span>}
          <span>· {p.estado_iglesia}</span>
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Select value={rol} onValueChange={v => onRolChange(miembro.id, v)}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES_GRUPO.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemove(miembro.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function MapEmbed({ lat, lng, nombre }: { lat: number; lng: number; nombre: string }) {
  return (
    <div className="relative">
      <iframe
        title={`Ubicación de ${nombre}`}
        width="100%"
        height="400"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`}
      />
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 bg-card/90 backdrop-blur border rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1.5"
      >
        <MapIcon className="h-3.5 w-3.5" /> Ver en Google Maps
      </a>
    </div>
  );
}

function PlanificacionTab({ grupoId, readOnly = false }: { grupoId: string; readOnly?: boolean }) {
  const { data: planificaciones } = usePlanificaciones(grupoId);
  const deletePlan = useDeletePlanificacion();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<any>(null);

  if (viewingPlan) {
    return <PlanificacionDetailView plan={viewingPlan} onBack={() => setViewingPlan(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Hojas de Planeación</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Planificación semanal de Casa de Paz</p>
        </div>
        <Button onClick={() => setShowPlanForm(true)} className="gap-2 w-full sm:w-auto">
          <UserPlus className="h-4 w-4" /> Nueva Planificación
        </Button>
      </div>

      {planificaciones && planificaciones.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {planificaciones.map((p: any) => (
            <div key={p.id} className="rounded-xl border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setViewingPlan(p)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{p.lider_nombre}</p>
                  <p className="text-xs text-muted-foreground">Red: {p.red || "—"} · {p.casa_de_paz || "—"}</p>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewingPlan(p)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {!readOnly && (
                    <DeleteConfirmDialog
                      onConfirm={async () => { try { await deletePlan.mutateAsync(p.id); toast.success("Eliminada"); } catch { toast.error("Error"); } }}
                      trigger={<Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><X className="h-3.5 w-3.5" /></Button>}
                    />
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
              <div className="text-xs space-y-0.5">
                <p>Invitados: {p.personas_invitadas}</p>
                <p>Ayuno: {p.fecha_ayuno || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No hay planificaciones registradas.</p>
        </div>
      )}

      <PlanificacionGrupoFormDialog open={showPlanForm} onOpenChange={setShowPlanForm} />
    </div>
  );
}

const EVAL_ITEMS_VIEW = [
  "Invitación CDP asistentes", "Ayuno CDP", "Evangelización CDP",
  "Oración Inicial CDP", "Adoración y Alabanza CDP", "Dinámicas CDP",
  "Predicación CDP", "Toma de Testimonios CDP",
  "Ayudas Didácticas (Vídeos, Impresiones)", "Toma de Datos CDP",
  "Consolidación (Llamar a los nuevos)",
  "Seguimiento (crecimiento espiritual y conexión con la Iglesia)",
];

function PlanificacionDetailView({ plan, onBack }: { plan: any; onBack: () => void }) {
  const evaluacion = (plan.evaluacion_equipo || {}) as Record<string, boolean>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">Hoja de Planeación — Casa de Paz</h2>
          <p className="text-sm text-muted-foreground">Descripción detallada de la preparación: Antes, Durante y Después</p>
        </div>
      </div>

      {/* Section 1: Datos del grupo */}
      <div className="rounded-lg border p-4 bg-primary/5 space-y-4">
        <p className="text-xs font-semibold uppercase text-primary tracking-wider">
          VISIÓN CMG: Id y haced discípulos a todas las naciones por medio de las casas de paz
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><span className="text-xs text-muted-foreground">Red</span><p className="font-medium">{plan.red || "—"}</p></div>
          <div><span className="text-xs text-muted-foreground">Líder Casa de Paz</span><p className="font-medium">{plan.lider_nombre}</p></div>
          <div><span className="text-xs text-muted-foreground">Casa de Paz (Grupo)</span><p className="font-medium">{plan.casa_de_paz || "—"}</p></div>
        </div>
      </div>

      {/* Section 2: Evaluación equipo */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm uppercase">Evaluación Equipo de Trabajo</h4>
        <p className="text-xs text-muted-foreground">
          Corresponde al trabajo en equipo de su anterior Casa de Paz.
        </p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-2 font-medium">Actividad</th>
                <th className="text-center p-2 w-20 font-medium">Cumplió</th>
              </tr>
            </thead>
            <tbody>
              {EVAL_ITEMS_VIEW.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2">{item}</td>
                  <td className="text-center p-2">
                    {evaluacion[item] ? (
                      <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Antes */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase">Antes de la Casa de Paz</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Persona Responsable de la Invitación</span>
            <p className="font-medium text-sm">{plan.responsable_invitacion || "—"}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Número de Personas Invitadas</span>
            <p className="font-medium text-sm">{plan.personas_invitadas || 0}</p>
          </div>
        </div>
        {plan.medios_invitacion && plan.medios_invitacion.length > 0 && (
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Medios Usados para la invitación</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {plan.medios_invitacion.map((m: string) => (
                <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Persona responsable de recordar la CDP</span>
            <p className="font-medium text-sm">{plan.responsable_recordar || "—"}</p>
          </div>
          {plan.medios_recordar && plan.medios_recordar.length > 0 && (
            <div className="rounded-lg border p-3 space-y-1">
              <span className="text-xs text-muted-foreground">Medios Usados para Recordar</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {plan.medios_recordar.map((m: string) => (
                  <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Ayuno por la Casa de Paz (fecha)</span>
            <p className="font-medium text-sm">{plan.fecha_ayuno || "—"}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Evangelización (fecha)</span>
            <p className="font-medium text-sm">{plan.fecha_evangelizacion || "—"}</p>
          </div>
        </div>
      </div>

      {/* Section 4: Durante */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase">Durante la Casa de Paz</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Oración Inicial", plan.responsable_oracion],
            ["Adoración y Alabanza", plan.responsable_adoracion],
            ["Dinámicas", plan.responsable_dinamicas],
            ["Predicación", plan.responsable_predicacion],
            ["Toma de Testimonios", plan.responsable_testimonios],
            ["Ayudas Didácticas", plan.responsable_ayudas],
            ["Toma de Datos", plan.responsable_datos],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border p-3 space-y-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <p className="font-medium text-sm">{(value as string) || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Después */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm uppercase">Después de la Casa de Paz</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Consolidación</span>
            <p className="font-medium text-sm">{plan.responsable_consolidacion || "—"}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <span className="text-xs text-muted-foreground">Seguimiento</span>
            <p className="font-medium text-sm">{plan.responsable_seguimiento || "—"}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Recuerda amado Líder que en la excelencia está reflejado Dios, no improvises tu Casa de Paz, planifica y darás fruto.
        </p>
      </div>
    </div>
  );
}
