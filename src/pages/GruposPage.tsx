import { useState, lazy, Suspense, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import GrupoFormDialog from "@/components/forms/GrupoFormDialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import ReporteGrupoFormDialog from "@/components/forms/ReporteGrupoFormDialog";
import GrupoPerfilView from "@/components/groups/GrupoPerfilView";
import GrupoHierarchyView from "@/components/groups/GrupoHierarchyView";
import GruposRedRail from "@/components/grupos/GruposRedRail";
import GruposViewSwitcher from "@/components/grupos/GruposViewSwitcher";
import PlanificacionGrupoFormDialog from "@/components/forms/PlanificacionGrupoFormDialog";
import { usePlanificaciones, useDeletePlanificacion } from "@/hooks/usePlanificaciones";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Pencil, Plus, ClipboardList, Network, DollarSign, TrendingUp, BarChart3, FileText, Trash2, Eye, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { useGrupos, useDeleteGrupo } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useUserRoles } from "@/hooks/useUserRoles";
import { canPerform } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/hooks/useActiveRole";
import PageSkeleton from "@/components/shared/PageSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { GrupoInfoCard, GrupoCardsSkeletonGrid } from "@/components/grupos/GrupoInfoCard";
import PlanificacionBulkBar from "@/components/grupos/PlanificacionBulkBar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const ReportesGruposContent = lazy(() => import("@/pages/ReportesGruposPage"));
const MapaGruposContent = lazy(() => import("@/pages/MapaGruposPage"));
const GraficoMinisterioContent = lazy(() => import("@/pages/GraficoMinisterioPage"));
const TesoreriaCDPSection = lazy(() => import("@/components/groups/TesoreriaCDPSection"));

const REDES = ["Nissi", "Rohi", "Jireh", "Adonai", "Shaddai", "Elohim"];

function useRedStats() {
  return useQuery({
    queryKey: ["red_dashboard_stats"],
    queryFn: async () => {
      // Fetch groups with red
      const { data: grupos } = await supabase
        .from("grupos")
        .select("id, nombre, red, grupo_miembros(count)")
        .eq("estado", "Activo");

      // Fetch all reportes_grupos with attendance data
      const { data: reportes } = await supabase
        .from("reportes_grupos")
        .select("grupo_id, ofrenda_casa_paz, estado, reporte_asistencia(presente)")
        .eq("estado", "Aprobado");

      const stats = REDES.map(red => {
        const redGrupos = (grupos || []).filter((g: any) => g.red === red);
        const grupoIds = new Set(redGrupos.map(g => g.id));
        const totalMiembros = redGrupos.reduce((s: number, g: any) => s + (g.grupo_miembros?.[0]?.count || 0), 0);

        const redReportes = (reportes || []).filter((r: any) => grupoIds.has(r.grupo_id));
        const totalOfrenda = redReportes.reduce((s: number, r: any) => s + (Number(r.ofrenda_casa_paz) || 0), 0);

        // Calc attendance from reporte_asistencia
        let totalPresentes = 0;
        let totalAsistenciaRecords = 0;
        redReportes.forEach((r: any) => {
          const asist = r.reporte_asistencia || [];
          totalAsistenciaRecords += asist.length;
          totalPresentes += asist.filter((a: any) => a.presente).length;
        });

        const promedioAsistencia = totalAsistenciaRecords > 0
          ? Math.round((totalPresentes / totalAsistenciaRecords) * 100)
          : 0;

        return {
          red,
          casasDePaz: redGrupos.length,
          totalMiembros,
          reportes: redReportes.length,
          totalOfrenda,
          promedioAsistencia,
          totalPresentes,
        };
      });

      return stats;
    },
  });
}

export default function GruposPage() {
  const { data: grupos, isLoading } = useGrupos();
  const deleteGrupo = useDeleteGrupo();
  const [editing, setEditing] = useState<any>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
  const [selectedRed, setSelectedRed] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("lista");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const { data: planificaciones, error: planError, refetch: refetchPlan, isLoading: loadingPlan } = usePlanificaciones();
  const deletePlan = useDeletePlanificacion();
  const [viewingPlan, setViewingPlan] = useState<any>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const { roles } = useUserRoles();
  const { user } = useAuth();
  const { activeRole } = useActiveRole();
  const canCreateGrupo   = canPerform(roles, "grupos:create");
  const canEditGrupo     = canPerform(roles, "grupos:edit");
  const canDeleteGrupo   = canPerform(roles, "grupos:delete");
  const canCreateReporte = canPerform(roles, "reportes_grupos:create");
  const canManageTesoreriaCDP = canPerform(roles, "tesoreria_cdp:manage");

  // Use activeRole to determine the view — respects the profile switcher
  const isLiderCDP = activeRole === "lider_casa_paz";
  const isLiderRed = activeRole === "lider_red";

  // Fetch profile to get assigned grupo_id (lider_casa_paz) and red (lider_red)
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["my_profile", user?.id],
    enabled: !!user?.id && (isLiderCDP || isLiderRed),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("grupo_id, red")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isLoadingAll = isLoading || ((isLiderCDP || isLiderRed) && loadingProfile);

  if (isLoadingAll) {
    return (
      <PageSkeleton variant="dashboard" />
    );
  }

  // lider_casa_paz → show only their assigned group
  if (isLiderCDP) {
    const grupoIdCDP = (profile as any)?.grupo_id;
    if (!grupoIdCDP) {
      return (
        <div className="animate-fade-in min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <Users className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold">Sin grupo asignado</h2>
            <p className="text-sm text-muted-foreground">
              Tu usuario aún no tiene una Casa de Paz asignada. Contacta al administrador para que te la configure.
            </p>
          </div>
        </div>
      );
    }
    return <GrupoPerfilView grupoId={grupoIdCDP} onBack={null} readOnly canReportAndPlan />;
  }

  // lider_red → show only groups in their assigned red
  if (isLiderRed) {
    const redAsignada = (profile as any)?.red;
    if (!redAsignada) {
      return (
        <div className="animate-fade-in min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <Users className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold">Sin red asignada</h2>
            <p className="text-sm text-muted-foreground">
              Tu usuario aún no tiene una Red asignada. Contacta al administrador.
            </p>
          </div>
        </div>
      );
    }
    const gruposDeRed = (grupos || []).filter((g: any) => g.red === redAsignada);
    const totalIntegrantes = gruposDeRed.reduce((sum: number, g: any) => sum + (g.grupo_miembros?.[0]?.count || 0), 0);
    const totalGrupos = gruposDeRed.length;
    const gruposCasaPaz = gruposDeRed.filter((g: any) => g.tipo === "Casas de paz").length;

    return (
      <div className="animate-fade-in space-y-4">
        <PageHeader title={`Red ${redAsignada}`} description={`Casas de paz y grupos de la Red ${redAsignada}`} />

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalGrupos}</p>
            <p className="text-xs text-muted-foreground mt-1">Grupos en la red</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{gruposCasaPaz}</p>
            <p className="text-xs text-muted-foreground mt-1">Casas de paz</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalIntegrantes}</p>
            <p className="text-xs text-muted-foreground mt-1">Personas en la red</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalGrupos - gruposCasaPaz}</p>
            <p className="text-xs text-muted-foreground mt-1">Otros grupos</p>
          </div>
        </div>

        {gruposDeRed.length === 0 ? (
          <EmptyState
            icon={Users}
            title={`No hay grupos en la Red ${redAsignada}`}
            description="Cuando se asignen Casas de Paz a esta red aparecerán aquí."
            variant="compact"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gruposDeRed.map((g: any) => {
              const count = g.grupo_miembros?.[0]?.count || 0;
              return (
                <GrupoInfoCard
                  key={g.id}
                  onClick={() => setSelectedGrupoId(g.id)}
                  title={g.nombre}
                  subtitle={`${g.tipo} · ${g.dia_reunion || "—"}`}
                  badge={count > 0 ? { label: `${count} miembros`, tone: "neutral" } : undefined}
                />
              );
            })}
          </div>
        )}
        {selectedGrupoId && (
          <GrupoPerfilView grupoId={selectedGrupoId} onBack={() => setSelectedGrupoId(null)} readOnly />
        )}
      </div>
    );
  }

  const tableData = (grupos || []).map(g => ({
    ...g,
    liderNombre: (g as any).personas ? `${(g as any).personas.nombres} ${(g as any).personas.apellidos}` : "—",
    miembrosCount: (g as any).grupo_miembros?.[0]?.count || 0,
  }));

  const handleDelete = async (id: string) => {
    try { await deleteGrupo.mutateAsync(id); toast.success("Grupo eliminado"); }
    catch { toast.error("Error al eliminar"); }
  };

  // If a group is selected, show profile view
  if (selectedGrupoId) {
    return <GrupoPerfilView grupoId={selectedGrupoId} onBack={() => setSelectedGrupoId(null)} />;
  }

  const gruposFiltrados = selectedRed
    ? tableData.filter((g: any) => g.red === selectedRed)
    : tableData;

  const totalMiembrosRed = selectedRed
    ? gruposFiltrados.reduce((s: number, g: any) => s + (g.miembrosCount || 0), 0)
    : 0;

  return (
    <div className="animate-fade-in -m-3 md:-m-6 flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Desktop Sidebar Rail */}
      <div className="hidden md:block shrink-0 h-full overflow-y-auto">
        <GruposRedRail
          grupos={tableData}
          selectedRed={selectedRed}
          selectedGrupoId={null}
          onSelectAll={() => setSelectedRed(null)}
          onSelectRed={(r) => setSelectedRed(r)}
          onSelectGrupo={(id) => setSelectedGrupoId(id)}
        />
      </div>

      {/* Mobile Drawer Sheet */}
      <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
        <SheetContent side="left" className="p-0 w-[290px] sm:w-[320px]">
          <SheetHeader className="p-3 border-b">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" /> Redes y Grupos
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
            <GruposRedRail
              grupos={tableData}
              selectedRed={selectedRed}
              selectedGrupoId={null}
              onSelectAll={() => { setSelectedRed(null); setMobileRailOpen(false); }}
              onSelectRed={(r) => { setSelectedRed(r); setMobileRailOpen(false); }}
              onSelectGrupo={(id) => { setSelectedGrupoId(id); setMobileRailOpen(false); }}
              onItemSelect={() => setMobileRailOpen(false)}
              className="w-full border-r-0 h-full sticky-none top-0 static"
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 p-3 md:p-6 space-y-4 overflow-y-auto h-full">
        {/* Mobile Horizontal Quick Red Bar */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileRailOpen(true)}
            className="h-7 text-xs gap-1 shrink-0 bg-background shadow-none border-border"
          >
            <Network className="h-3.5 w-3.5 text-primary" />
            Explorar
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>

          <Badge
            variant={!selectedRed ? "default" : "outline"}
            className="cursor-pointer text-[11.5px] px-2.5 py-1 shrink-0 font-normal transition-colors"
            onClick={() => { setSelectedRed(null); setActiveTab("lista"); }}
          >
            Todas ({tableData.length})
          </Badge>

          {REDES.map((r) => {
            const count = tableData.filter((g) => g.red === r).length;
            const isSel = selectedRed === r;
            return (
              <Badge
                key={r}
                variant={isSel ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-[11.5px] px-2.5 py-1 shrink-0 font-normal transition-colors",
                  isSel && "bg-primary text-primary-foreground"
                )}
                onClick={() => { setSelectedRed(r); setActiveTab("lista"); }}
              >
                {r} ({count})
              </Badge>
            );
          })}
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              {selectedRed ? `Red ${selectedRed}` : "Grupos"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {selectedRed
                ? `${gruposFiltrados.length} grupos · ${totalMiembrosRed} miembros`
                : "Redes, casas de paz y planificación pastoral"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <ExportDropdown title="Grupos" filename="grupos" columns={[
              { header: "Nombre", key: "nombre" }, { header: "Tipo", key: "tipo" },
              { header: "Red", key: "red" }, { header: "Líder", key: "liderNombre" },
              { header: "Día", key: "dia_reunion" }, { header: "Miembros", key: "miembrosCount" },
              { header: "Estado", key: "estado" },
            ]} data={gruposFiltrados} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs sm:text-sm">
                  <FileText className="h-3.5 w-3.5" /> Herramientas <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setActiveTab("reporte")}><ClipboardList className="h-4 w-4 mr-2" />Iniciar reporte semanal</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("reportes")}>Reportes históricos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("planificacion")}><FileText className="h-4 w-4 mr-2" />Planificación CDP</DropdownMenuItem>
                {canManageTesoreriaCDP && <DropdownMenuItem onClick={() => setActiveTab("tesoreria-cdp")}><DollarSign className="h-4 w-4 mr-2" />Tesorería CDP</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => setActiveTab("mapa")}>Mapa geográfico</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("organigrama")}>Organigrama ministerial</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("jerarquia")}>Vista jerárquica</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canCreateGrupo && <GrupoFormDialog />}
          </div>
        </div>

        {canEditGrupo && editing && <GrupoFormDialog initialData={editing} onClose={() => setEditing(null)} />}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-9 w-full flex flex-nowrap overflow-x-auto justify-start max-w-full no-scrollbar pb-0.5">
            <TabsTrigger value="lista" className="text-[12.5px] shrink-0">
              {selectedRed ? "Grupos de la red" : "Todos los grupos"}
            </TabsTrigger>
            {!selectedRed && (
              <TabsTrigger value="dashboard" className="gap-1 text-[12.5px] shrink-0">
                <BarChart3 className="h-3.5 w-3.5" /> Dashboard redes
              </TabsTrigger>
            )}
            <TabsTrigger value="planificacion" className="gap-1 text-[12.5px] shrink-0">
              <FileText className="h-3.5 w-3.5" /> Planificación
            </TabsTrigger>
            <TabsTrigger value="reportes" className="gap-1 text-[12.5px] shrink-0">
              <ClipboardList className="h-3.5 w-3.5" /> Reportes
            </TabsTrigger>
            <TabsTrigger value="jerarquia" className="gap-1 text-[12.5px] shrink-0">
              <Network className="h-3.5 w-3.5" /> Jerarquía
            </TabsTrigger>
            <TabsTrigger value="mapa" className="gap-1 text-[12.5px] shrink-0">
              Mapa
            </TabsTrigger>
            <TabsTrigger value="organigrama" className="gap-1 text-[12.5px] shrink-0">
              Organigrama
            </TabsTrigger>
            {canManageTesoreriaCDP && (
              <TabsTrigger value="tesoreria-cdp" className="gap-1 text-[12.5px] shrink-0">
                <DollarSign className="h-3.5 w-3.5" /> Tesorería CDP
              </TabsTrigger>
            )}
          </TabsList>


        <TabsContent value="lista">
          <GruposViewSwitcher
            grupos={gruposFiltrados}
            onOpen={(id) => setSelectedGrupoId(id)}
            onEdit={(g) => setEditing(g)}
            onDelete={handleDelete}
            canEdit={canEditGrupo}
            canDelete={canDeleteGrupo}
          />
        </TabsContent>


        <TabsContent value="jerarquia">
          <GrupoHierarchyView onSelectGrupo={(id) => setSelectedGrupoId(id)} />
        </TabsContent>

        <TabsContent value="dashboard">
          <RedDashboard />
        </TabsContent>

        <TabsContent value="reporte">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <ClipboardList className="h-16 w-16 text-muted-foreground/30" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Crear Reporte Semanal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Registra la asistencia, personas nuevas y ofrenda de tu grupo.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Solo disponible el día de reunión configurado en cada grupo.
              </p>
            </div>
            {(() => {
              const now = new Date();
              const day = now.getDay();
              const mins = now.getHours() * 60 + now.getMinutes();
              // Open: lunes(1) a jueves(4) hasta las 23:59
              const isOpen = day >= 1 && day <= 4 && !(day === 4 && mins >= 23 * 60 + 59);
              return (
                <>
                  <Button
                    onClick={() => setShowReportForm(true)}
                    className="gap-2"
                    disabled={!canCreateReporte || !isOpen}
                  >
                    <Plus className="h-4 w-4" /> Iniciar Reporte
                  </Button>
                  {!isOpen && (
                    <p className="text-xs text-destructive text-center mt-1">
                      ⏰ Los reportes solo pueden enviarse de lunes a jueves hasta las 11:59 PM
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="reportes">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <ReportesGruposContent />
          </Suspense>
        </TabsContent>

        {canManageTesoreriaCDP && (
          <TabsContent value="tesoreria-cdp">
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <TesoreriaCDPSection />
            </Suspense>
          </TabsContent>
        )}

        <TabsContent value="mapa">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <MapaGruposContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="organigrama">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <GraficoMinisterioContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="planificacion">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">Hojas de Planeación</h2>
                <p className="text-sm text-muted-foreground">
                  Planificación semanal de Casas de Paz — usa las casillas para acciones masivas.
                </p>
              </div>
              {canCreateGrupo && (
                <Button onClick={() => setShowPlanForm(true)} className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" /> Nueva Planificación
                </Button>
              )}
            </div>

            {loadingPlan || planificaciones === undefined ? (
              <GrupoCardsSkeletonGrid count={6} />
            ) : planError ? (
              <ErrorState error={planError} onRetry={() => refetchPlan()} />
            ) : planificaciones.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aún no hay planificaciones"
                description="Crea la primera hoja de planeación semanal para tus Casas de Paz."
                action={canCreateGrupo ? (
                  <Button onClick={() => setShowPlanForm(true)} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Nueva Planificación
                  </Button>
                ) : undefined}
              />
            ) : (
              <>
                {canEditGrupo && (
                  <PlanificacionBulkBar
                    selectedIds={selectedPlanIds}
                    onClear={() => setSelectedPlanIds([])}
                  />
                )}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {planificaciones.map((p: any) => {
                    const checked = selectedPlanIds.includes(p.id);
                    const toggle = () =>
                      setSelectedPlanIds((prev) =>
                        prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                      );
                    return (
                      <GrupoInfoCard
                        key={p.id}
                        onClick={() => setViewingPlan(p)}
                        title={p.lider_nombre}
                        subtitle={`${p.red || "Sin red"} · ${p.casa_de_paz || "Sin casa de paz"}`}
                        badge={{
                          label: (p.evaluacion_equipo as any)?.asistencia_confirmada ? "Confirmada" : "Plan",
                          tone: (p.evaluacion_equipo as any)?.asistencia_confirmada ? "success" : "info",
                        }}
                        metaDate={{ label: "Creada", value: new Date(p.created_at).toLocaleDateString() }}
                        summaryTitle="Resumen semanal"
                        summary={[
                          { label: "Personas invitadas", value: p.personas_invitadas || 0 },
                          { label: "Fecha ayuno", value: p.fecha_ayuno || "—" },
                          { label: "Evangelización", value: p.fecha_evangelizacion || "—" },
                        ]}
                        actions={
                          <>
                            {canEditGrupo && (
                              <label
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={toggle}
                                  onKeyDown={(e) => {
                                    if (e.key === " " || e.key === "Enter") {
                                      e.preventDefault();
                                      toggle();
                                    }
                                  }}
                                  aria-label={`Seleccionar planificación de ${p.lider_nombre}`}
                                />
                                Seleccionar
                              </label>
                            )}
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewingPlan(p)}>
                              <Eye className="h-3.5 w-3.5" /> Ver
                            </Button>
                            {canDeleteGrupo && (
                              <DeleteConfirmDialog
                                onConfirm={async () => { try { await deletePlan.mutateAsync(p.id); toast.success("Eliminada"); } catch { toast.error("Error"); } }}
                                trigger={
                                  <Button size="sm" variant="ghost" className="ml-auto text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ReporteGrupoFormDialog open={showReportForm} onOpenChange={setShowReportForm} />
      <PlanificacionGrupoFormDialog open={showPlanForm} onOpenChange={setShowPlanForm} />

      {/* Detail view dialog for planificación */}
      <Dialog open={!!viewingPlan} onOpenChange={(v) => { if (!v) setViewingPlan(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Planificación</DialogTitle>
          </DialogHeader>
          {viewingPlan && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs">Líder</span><p className="font-medium">{viewingPlan.lider_nombre}</p></div>
                <div><span className="text-muted-foreground text-xs">Red</span><p className="font-medium">{viewingPlan.red || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Casa de Paz</span><p className="font-medium">{viewingPlan.casa_de_paz || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Personas invitadas</span><p className="font-medium">{viewingPlan.personas_invitadas || 0}</p></div>
                <div><span className="text-muted-foreground text-xs">Fecha ayuno</span><p className="font-medium">{viewingPlan.fecha_ayuno || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Fecha evangelización</span><p className="font-medium">{viewingPlan.fecha_evangelizacion || "—"}</p></div>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">Evaluación Equipo</h4>
                {viewingPlan.evaluacion_equipo && Object.keys(viewingPlan.evaluacion_equipo).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(viewingPlan.evaluacion_equipo as Record<string, boolean>).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-muted last:border-0">
                        <span>{key}</span>
                        <span className={val ? "text-success font-semibold" : "text-muted-foreground"}>
                          {val ? "✓ Sí" : "No"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Sin evaluación registrada</p>}
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">Responsables</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Invitación", viewingPlan.responsable_invitacion],
                    ["Recordar", viewingPlan.responsable_recordar],
                    ["Oración", viewingPlan.responsable_oracion],
                    ["Adoración", viewingPlan.responsable_adoracion],
                    ["Dinámicas", viewingPlan.responsable_dinamicas],
                    ["Predicación", viewingPlan.responsable_predicacion],
                    ["Testimonios", viewingPlan.responsable_testimonios],
                    ["Ayudas", viewingPlan.responsable_ayudas],
                    ["Datos", viewingPlan.responsable_datos],
                    ["Consolidación", viewingPlan.responsable_consolidacion],
                    ["Seguimiento", viewingPlan.responsable_seguimiento],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <span className="text-muted-foreground">{label}</span>
                      <p className="font-medium">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {(viewingPlan.medios_invitacion?.length > 0 || viewingPlan.medios_recordar?.length > 0) && (
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-xs mb-2 text-muted-foreground uppercase tracking-wider">Medios</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Invitación</span>
                      <p className="font-medium">{viewingPlan.medios_invitacion?.join(", ") || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recordar</span>
                      <p className="font-medium">{viewingPlan.medios_recordar?.join(", ") || "—"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function RedDashboard() {
  const { data: stats, isLoading } = useRedStats();

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  const data = stats || [];
  const totals = data.reduce(
    (acc, s) => ({
      casas: acc.casas + s.casasDePaz,
      miembros: acc.miembros + s.totalMiembros,
      ofrenda: acc.ofrenda + s.totalOfrenda,
      presentes: acc.presentes + s.totalPresentes,
      reportes: acc.reportes + s.reportes,
    }),
    { casas: 0, miembros: 0, ofrenda: 0, presentes: 0, reportes: 0 }
  );

  const chartData = data.map(s => ({
    red: s.red,
    "Casas de Paz": s.casasDePaz,
    "Miembros": s.totalMiembros,
    "Prom. Asistencia %": s.promedioAsistencia,
  }));

  const ofrendaChart = data.map(s => ({
    red: s.red,
    "Ofrenda Total": s.totalOfrenda,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <Network className="h-6 w-6 text-info mx-auto mb-1" />
          <p className="text-2xl font-bold">{data.filter(s => s.casasDePaz > 0).length}</p>
          <p className="text-xs text-muted-foreground">Redes Activas</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Users className="h-6 w-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{totals.miembros}</p>
          <p className="text-xs text-muted-foreground">Total Miembros</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <TrendingUp className="h-6 w-6 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold">{totals.reportes}</p>
          <p className="text-xs text-muted-foreground">Reportes Aprobados</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <DollarSign className="h-6 w-6 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">${totals.ofrenda.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Ofrenda Total</p>
        </div>
      </div>

      {/* Table per red */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Estadísticas por Red</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Red</th>
                <th className="text-center p-3 font-medium">Casas de Paz</th>
                <th className="text-center p-3 font-medium">Miembros</th>
                <th className="text-center p-3 font-medium">Reportes</th>
                <th className="text-center p-3 font-medium">Prom. Asistencia</th>
                <th className="text-right p-3 font-medium">Ofrenda Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map(s => (
                <tr key={s.red} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-info" />
                      <span className="font-medium">{s.red}</span>
                    </div>
                  </td>
                  <td className="text-center p-3">{s.casasDePaz}</td>
                  <td className="text-center p-3">{s.totalMiembros}</td>
                  <td className="text-center p-3">{s.reportes}</td>
                  <td className="text-center p-3">
                    <Badge variant={s.promedioAsistencia >= 70 ? "default" : "secondary"} className="text-xs">
                      {s.promedioAsistencia}%
                    </Badge>
                  </td>
                  <td className="text-right p-3 font-medium">${s.totalOfrenda.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-semibold">
                <td className="p-3">Total</td>
                <td className="text-center p-3">{totals.casas}</td>
                <td className="text-center p-3">{totals.miembros}</td>
                <td className="text-center p-3">{totals.reportes}</td>
                <td className="text-center p-3">—</td>
                <td className="text-right p-3">${totals.ofrenda.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Miembros por Red</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="red" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Casas de Paz" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Miembros" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Ofrenda por Red</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ofrendaChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="red" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="Ofrenda Total" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
