import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PhoneCall,
  UserCheck,
  Users,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  Clock,
  MessageSquare,
  AlertTriangle,
  Award,
  PhoneOff,
  PhoneOutgoing,
  PhoneMissed,
  Filter,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  useConsolidacionLlamadas,
  CODIFICACIONES_LLAMADA,
  CodificacionLlamada,
} from "@/hooks/useConsolidacionLlamadas";
import { RegistrarLlamadaConsolidacionDialog } from "./RegistrarLlamadaConsolidacionDialog";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";

const CODIFICACION_STYLE: Record<
  CodificacionLlamada,
  { badge: string; icon: React.ElementType; barColor: string }
> = {
  "Contestó y atendió": {
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    icon: PhoneCall,
    barColor: "bg-emerald-500",
  },
  "No contestó": {
    badge: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    icon: PhoneMissed,
    barColor: "bg-amber-500",
  },
  "Buzón de mensajes": {
    badge: "bg-slate-500/15 text-slate-700 border-slate-500/30",
    icon: MessageSquare,
    barColor: "bg-slate-500",
  },
  "Fuera de servicio": {
    badge: "bg-rose-500/15 text-rose-700 border-rose-500/30",
    icon: PhoneOff,
    barColor: "bg-rose-500",
  },
  "Número equivocado": {
    badge: "bg-rose-500/15 text-rose-700 border-rose-500/30",
    icon: AlertTriangle,
    barColor: "bg-rose-600",
  },
  "Llamada no efectiva": {
    badge: "bg-orange-500/15 text-orange-700 border-orange-500/30",
    icon: PhoneOutgoing,
    barColor: "bg-orange-500",
  },
  Otro: {
    badge: "bg-sky-500/15 text-sky-700 border-sky-500/30",
    icon: Clock,
    barColor: "bg-sky-500",
  },
};

export function ConsolidacionDashboardTab() {
  const { llamadas, isLoading, stats, eliminarLlamada } = useConsolidacionLlamadas();
  const [openRegistrarDialog, setOpenRegistrarDialog] = useState(false);
  const [selectedCodificacionFilter, setSelectedCodificacionFilter] = useState<string>("todos");

  const filteredLlamadas =
    selectedCodificacionFilter === "todos"
      ? llamadas
      : llamadas.filter((l) => l.codificacion === selectedCodificacionFilter);

  return (
    <div className="space-y-6">
      {/* Header Banner & Main Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Módulo de Consolidación</h2>
              <p className="text-xs text-muted-foreground">
                Seguimiento estandarizado, codificación objetiva de llamadas e informe de los 45 días.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button
            onClick={() => setOpenRegistrarDialog(true)}
            className="gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" /> Registrar Llamada
          </Button>

          <ExportPersonasDialog
            trigger={
              <Button variant="outline" className="gap-2 font-semibold">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar Informe (PDF/Excel)
              </Button>
            }
          />
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Personas Entregadas al Consolidador */}
        <Card className="p-4 bg-gradient-to-br from-card to-muted/40 relative overflow-hidden border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Entregadas al Consolidador
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold mt-2 tabular-nums">
            {stats.personasEntregadasAlConsolidador}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Personas en seguimiento de consolidación
          </p>
        </Card>

        {/* KPI 2: Personas Entregadas a los 45 Días */}
        <Card className="p-4 bg-gradient-to-br from-card to-emerald-500/5 relative overflow-hidden border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Entregadas a 45 Días
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold mt-2 tabular-nums text-emerald-700">
            {stats.personasEntregadas45Dias}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ciclo completo de 45 días finalizado
          </p>
        </Card>

        {/* KPI 3: Tasa de Efectividad */}
        <Card className="p-4 bg-gradient-to-br from-card to-primary/5 relative overflow-hidden border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tasa de Efectividad
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold mt-2 tabular-nums text-primary">
            {stats.tasaEfectividad}%
          </div>
          <Progress value={stats.tasaEfectividad} className="h-1.5 mt-2" />
        </Card>

        {/* KPI 4: Total Llamadas */}
        <Card className="p-4 bg-gradient-to-br from-card to-muted/40 relative overflow-hidden border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Llamadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold mt-2 tabular-nums">
            {stats.totalLlamadas}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Llamadas codificadas registradas</p>
        </Card>
      </div>

      {/* Codificaciones Breakdown */}
      <Card className="p-5">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" /> Estructura y Resultado Objetivos de Llamadas
          </CardTitle>
          <CardDescription className="text-xs">
            Distribución por codificación obligatoria seleccionada en la gestión de consolidación.
          </CardDescription>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CODIFICACIONES_LLAMADA.map((cod) => {
            const count = stats.codificacionCounts[cod] || 0;
            const pct = stats.totalLlamadas > 0 ? Math.round((count / stats.totalLlamadas) * 100) : 0;
            const style = CODIFICACION_STYLE[cod];
            const Icon = style.icon;

            return (
              <div
                key={cod}
                onClick={() =>
                  setSelectedCodificacionFilter(
                    selectedCodificacionFilter === cod ? "todos" : cod
                  )
                }
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedCodificacionFilter === cod
                    ? "ring-2 ring-primary border-primary bg-primary/5 shadow-sm"
                    : "bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold flex items-center gap-1.5 truncate">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{cod}</span>
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${style.badge}`}>
                    {pct}%
                  </Badge>
                </div>
                <div className="text-xl font-bold tabular-nums">{count}</div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${style.barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Llamadas History List */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Historial Reciente de Llamadas ({filteredLlamadas.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Mantiene trazabilidad objetiva para coordinadores y líderes de red.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedCodificacionFilter}
              onChange={(e) => setSelectedCodificacionFilter(e.target.value)}
              className="text-xs rounded-lg border bg-background px-2.5 py-1.5 font-medium"
            >
              <option value="todos">Todas las codificaciones</option>
              {CODIFICACIONES_LLAMADA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="No contestó">No contestó</option>
              <option value="Buzón de mensajes">Buzón de mensajes</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Cargando historial de llamadas...
          </p>
        ) : filteredLlamadas.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20">
            <PhoneCall className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-semibold">Sin llamadas registradas con este filtro</p>
            <p className="text-xs text-muted-foreground mt-1">
              Haz clic en "Registrar Llamada" para ingresar el resultado de seguimiento.
            </p>
            <Button
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => setOpenRegistrarDialog(true)}
            >
              <Plus className="h-4 w-4" /> Registrar Primera Llamada
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLlamadas.map((llamada) => {
              const style = CODIFICACION_STYLE[llamada.codificacion];
              const Icon = style?.icon || PhoneCall;

              return (
                <div key={llamada.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${style.badge}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {llamada.persona_nombre || "Discípulo"}
                        </span>
                        <Badge variant="outline" className={`text-xs font-semibold ${style.badge}`}>
                          {llamada.codificacion}
                        </Badge>
                        {llamada.completo_45_dias && (
                          <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                            <Award className="h-3 w-3" /> 45 Días Completados
                          </Badge>
                        )}
                      </div>

                      {llamada.observacion && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded-lg border border-border/50">
                          {llamada.observacion}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                        <span>
                          Consolidador: <strong>{llamada.consolidador_email || "Sistema"}</strong>
                        </span>
                        {llamada.red && <span>• Red: {llamada.red}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1 text-xs text-muted-foreground tabular-nums">
                    <div>
                      {format(parseISO(llamada.fecha_llamada), "dd MMM yyyy", { locale: es })}
                      <div className="text-[10.5px] opacity-75">
                        {format(parseISO(llamada.fecha_llamada), "HH:mm")}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-medium"
                      onClick={() => {
                        if(window.confirm("¿Estás seguro de que deseas eliminar este registro de llamada?")) {
                          eliminarLlamada(llamada.id);
                        }
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Registrar Llamada */}
      <RegistrarLlamadaConsolidacionDialog
        open={openRegistrarDialog}
        onOpenChange={setOpenRegistrarDialog}
      />
    </div>
  );
}
