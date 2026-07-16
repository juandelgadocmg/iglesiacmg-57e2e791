import { useState, useMemo } from "react";
import PageHeader from "@/components/shared/PageHeader";
import MetricCard from "@/components/shared/MetricCard";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { GrupoInfoCard, GrupoCardsSkeletonGrid, type GrupoCardBadgeTone } from "@/components/grupos/GrupoInfoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import ReporteGrupoFormDialog from "@/components/forms/ReporteGrupoFormDialog";
import { useReportesGrupos, useDeleteReporteGrupo, useUpdateReporteGrupo } from "@/hooks/useReportesGrupos";
import { useTesoreriaMora, getSemanaRange } from "@/hooks/useTesoreriaCDP";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus, Search, FileText, ClipboardCheck, CheckCircle2, XCircle,
  AlertCircle, CalendarIcon, DollarSign, Trash2, ShieldCheck, Pencil, SearchX
} from "lucide-react";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

const ESTADOS = ["Todos", "No Finalizado", "No Verificado", "Aprobado", "No Aprobado"] as const;

const ESTADO_TONE: Record<string, GrupoCardBadgeTone> = {
  "No Finalizado": "neutral",
  "No Verificado": "warning",
  "Aprobado": "success",
  "No Aprobado": "danger",
};

export default function ReportesGruposPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: reportes, isLoading, error, refetch } = useReportesGrupos();
  const deleteReporte = useDeleteReporteGrupo();
  const updateReporte = useUpdateReporteGrupo();
  const { data: morosos } = useTesoreriaMora();

  // Set de "grupo_id__semana_inicio" con saldo pendiente
  const morosaSet = useMemo(() => {
    const s = new Set<string>();
    (morosos || []).forEach((m) => s.add(`${m.grupo_id}__${m.semana_inicio}`));
    return s;
  }, [morosos]);

  const filtered = useMemo(() => {
    if (!reportes) return [];
    return reportes.filter((r) => {
      if (tab !== "Todos" && r.estado !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          r.mensaje.toLowerCase().includes(q) ||
          r.grupos?.nombre?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateRange?.from) {
        const fecha = parseISO(r.fecha);
        const from = dateRange.from;
        const to = dateRange.to || dateRange.from;
        if (!isWithinInterval(fecha, { start: from, end: to })) return false;
      }
      return true;
    });
  }, [reportes, tab, search, dateRange]);

  const counts = useMemo(() => {
    if (!reportes) return { all: 0, noFin: 0, noVer: 0, apro: 0, noApro: 0 };
    return {
      all: reportes.length,
      noFin: reportes.filter((r) => r.estado === "No Finalizado").length,
      noVer: reportes.filter((r) => r.estado === "No Verificado").length,
      apro: reportes.filter((r) => r.estado === "Aprobado").length,
      noApro: reportes.filter((r) => r.estado === "No Aprobado").length,
    };
  }, [reportes]);

  const handleVerify = async (id: string) => {
    try {
      const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      await updateReporte.mutateAsync({
        id,
        estado: "Aprobado",
        verificado_por: user?.id,
        fecha_verificacion: new Date().toISOString(),
      });
      toast.success("Reporte aprobado.");
    } catch {
      toast.error("Error al verificar el reporte.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateReporte.mutateAsync({ id, estado: "No Aprobado" });
      toast.success("Reporte rechazado.");
    } catch {
      toast.error("Error al rechazar el reporte.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Listado de Reportes</h2>
          <p className="text-sm text-muted-foreground">Consulta y gestiona todos los reportes enviados</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Todos" value={counts.all} icon={FileText} />
        <MetricCard title="No Finalizados" value={counts.noFin} icon={AlertCircle} variant="accent" />
        <MetricCard title="No Verificados" value={counts.noVer} icon={ClipboardCheck} variant="info" />
        <MetricCard title="Aprobados" value={counts.apro} icon={CheckCircle2} variant="success" />
        <MetricCard title="No Aprobados" value={counts.noApro} icon={XCircle} variant="default" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tema o grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange?.from
                ? `${format(dateRange.from, "dd/MM/yy")}${dateRange.to ? ` - ${format(dateRange.to, "dd/MM/yy")}` : ""}`
                : "Filtrar fechas"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {dateRange && (
          <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
            Limpiar fechas
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {ESTADOS.map((e) => (
            <TabsTrigger key={e} value={e}>{e}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Report Cards */}
      {isLoading ? (
        <GrupoCardsSkeletonGrid count={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        reportes && reportes.length > 0 ? (
          <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="Ningún reporte coincide con los filtros aplicados. Ajusta la búsqueda o el rango de fechas."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearch(""); setTab("Todos"); setDateRange(undefined); }}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Aún no hay reportes"
            description="Cuando los líderes envíen sus reportes de grupo aparecerán aquí."
          />
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const semana = getSemanaRange(parseISO(r.fecha));
            const key = `${r.grupo_id}__${semana.inicio}`;
            const enMora = morosaSet.has(key) && Number(r.ofrenda_casa_paz) > 0;

            const summary: Array<{ label: React.ReactNode; value: React.ReactNode; emphasis?: boolean; divided?: boolean; icon?: any; iconClassName?: string }> = [
              { label: "Ofrenda Casa de Paz", value: `$${Number(r.ofrenda_casa_paz).toFixed(2)}` },
              { label: "Total", value: `$${Number(r.total_reportado).toFixed(2)}`, emphasis: true },
            ];
            if (r.ingreso_verificado_sobre !== null) {
              summary.push({
                label: "Verificado en sobre",
                value: <span className="text-success">${Number(r.ingreso_verificado_sobre).toFixed(2)}</span>,
                divided: true,
                icon: ShieldCheck,
                iconClassName: "text-success",
              });
            }

            return (
              <GrupoInfoCard
                key={r.id}
                title={r.mensaje}
                subtitle={`${r.grupos?.nombre || "Grupo"} · ${r.grupos?.tipo || ""}`}
                badge={{ label: r.estado, tone: ESTADO_TONE[r.estado] ?? "neutral" }}
                metaDate={{ label: "Fecha reunión", value: format(parseISO(r.fecha), "PPP", { locale: es }) }}
                metaSecondary={`Reportado: ${format(parseISO(r.created_at), "PPP 'a las' hh:mm a", { locale: es })}`}
                extraBadge={enMora ? (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <DollarSign className="h-3 w-3" /> Pendiente entregar a tesorería
                  </Badge>
                ) : null}
                description={r.observaciones}
                attendance={r.asistencia_count && (r.asistencia_count.presentes > 0 || r.asistencia_count.ausentes > 0) ? (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {r.asistencia_count.presentes} presentes
                    </span>
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <XCircle className="h-3.5 w-3.5" /> {r.asistencia_count.ausentes} ausentes
                    </span>
                    {r.asistencia_count.nuevos > 0 && (
                      <span className="flex items-center gap-1 text-info font-medium">
                        + {r.asistencia_count.nuevos} nuevos
                      </span>
                    )}
                  </div>
                ) : null}
                summaryTitle="Ingresos digitados por el líder"
                summary={summary}
                actions={
                  <>
                    {(r.estado === "No Verificado" || r.estado === "No Finalizado") && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1 text-success" onClick={() => handleVerify(r.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleReject(r.id)}>
                          <XCircle className="h-3.5 w-3.5" /> Rechazar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditingId(r.id); setShowForm(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <DeleteConfirmDialog
                      onConfirm={async () => {
                        await deleteReporte.mutateAsync(r.id);
                        toast.success("Reporte eliminado.");
                      }}
                      trigger={
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <ReporteGrupoFormDialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) setEditingId(null); }} editReporteId={editingId} />
    </div>
  );
}
