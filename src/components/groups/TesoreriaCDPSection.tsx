import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft, ChevronRight, CalendarIcon, FileDown, AlertTriangle,
  DollarSign, CheckCircle2, Clock, History, Upload, Lock, Unlock, FileText, ExternalLink,
  Replace, Timer, Save,
} from "lucide-react";
import {
  useTesoreriaSemana, useUpsertTesoreriaCDP, useTesoreriaMora,
  useUploadSoporteConsignacion,
  useConsignacionSemanal, useUpsertConsignacionSemanal,
  useReemplazarSoporteSemanal, useHistorialSemanal,
  useReabrirConsignacionSemanal,
  getSemanaRange, type FilaTesoreriaCDP, type EstadoTesoreria, type ConsignacionSemanal,
} from "@/hooks/useTesoreriaCDP";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { exportTesoreriaSemanalPDF, exportConsignacionSemanalPDF } from "@/lib/exportTesoreriaCDPPdf";
import { format, parseISO, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const estadoBadge: Record<EstadoTesoreria, { className: string; label: string }> = {
  "Conciliado":  { className: "bg-success text-success-foreground border-transparent", label: "Conciliado" },
  "Sobrante":    { className: "bg-info text-info-foreground border-transparent", label: "Sobrante" },
  "Parcial":     { className: "bg-amber-500 text-white border-transparent", label: "Parcial" },
  "En mora":     { className: "bg-destructive text-destructive-foreground border-transparent", label: "En mora" },
  "Pendiente":   { className: "bg-muted text-muted-foreground border-transparent", label: "Pendiente" },
  "Sin reporte": { className: "bg-muted/50 text-muted-foreground border-transparent", label: "Sin reporte" },
};

const fmt = (n: number) =>
  `$${Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function TesoreriaCDPSection() {
  const [fechaSemana, setFechaSemana] = useState<Date>(new Date());
  const [showMora, setShowMora] = useState(false);
  const [showConsignacion, setShowConsignacion] = useState(false);
  const [showReemplazar, setShowReemplazar] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showReabrir, setShowReabrir] = useState(false);
  const semana = useMemo(() => getSemanaRange(fechaSemana), [fechaSemana]);

  const { data: filas, isLoading } = useTesoreriaSemana(semana.inicio, semana.fin);
  const { data: consignacion } = useConsignacionSemanal(semana.inicio);
  const { data: morosos } = useTesoreriaMora();
  const { data: config } = useConfiguracion();
  const { user } = useAuth();
  const { hasRole } = useUserRoles();
  const upsert = useUpsertTesoreriaCDP();

  // Agrupar por red
  const porRed = useMemo(() => {
    const map: Record<string, FilaTesoreriaCDP[]> = {};
    (filas || []).forEach((f) => {
      if (!map[f.red]) map[f.red] = [];
      map[f.red].push(f);
    });
    return map;
  }, [filas]);

  const totales = useMemo(() => {
    const arr = filas || [];
    return {
      reportado: arr.reduce((s, f) => s + f.valor_reportado, 0),
      entregado: arr.reduce((s, f) => s + f.valor_entregado, 0),
      enMora: arr.filter((f) => f.estado === "En mora").length,
      conciliados: arr.filter((f) => f.estado === "Conciliado" || f.estado === "Sobrante").length,
    };
  }, [filas]);

  const cerrada = !!consignacion?.consignacion_completada;
  const consignado = consignacion?.valor_consignado || 0;
  const porConsignar = totales.entregado - consignado;

  const handleSave = async (
    fila: FilaTesoreriaCDP,
    patch: { valor_entregado?: number; fecha_entrega?: string | null; observacion?: string | null }
  ) => {
    if (cerrada) {
      toast.error("La consignación de la semana ya fue cerrada.");
      return;
    }
    try {
      await upsert.mutateAsync({
        grupo_id: fila.grupo_id,
        semana_inicio: semana.inicio,
        semana_fin: semana.fin,
        valor_entregado: patch.valor_entregado ?? fila.valor_entregado,
        fecha_entrega: patch.fecha_entrega !== undefined ? patch.fecha_entrega : fila.fecha_entrega,
        observacion: patch.observacion !== undefined ? patch.observacion : fila.observacion,
      });
    } catch (e: any) {
      toast.error("No se pudo guardar: " + (e.message || ""));
    }
  };

  const handleDownloadPDF = async () => {
    if (!filas || filas.length === 0) {
      toast.error("No hay datos para exportar.");
      return;
    }
    try {
      await exportTesoreriaSemanalPDF({
        semanaInicio: semana.inicio,
        semanaFin: semana.fin,
        filas,
        configIglesia: config,
        elaboradoPor: user?.email || "",
        revisadoPor: config?.pastor_principal || "",
      });
      toast.success("PDF descargado.");
    } catch (e: any) {
      toast.error("Error al generar PDF: " + (e.message || ""));
    }
  };

  const handleDownloadConsignacionPDF = async () => {
    if (!consignacion) {
      toast.error("Aún no hay consignación cerrada esta semana.");
      return;
    }
    try {
      await exportConsignacionSemanalPDF({
        consignacion,
        filas: filas || [],
        semanaInicio: semana.inicio,
        semanaFin: semana.fin,
        configIglesia: config,
        elaboradoPor: user?.email || "",
        revisadoPor: config?.pastor_principal || "",
      });
      toast.success("PDF descargado.");
    } catch (e: any) {
      toast.error("Error al generar PDF: " + (e.message || ""));
    }
  };

  const canManageSoporte = hasRole("admin") || hasRole("super_admin") || hasRole("pastor") || hasRole("tesoreria");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Tesorería · Ofrendas Casas de Paz
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Conciliación semanal entre lo reportado por el líder y lo entregado en físico
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowMora(true)}>
            <History className="h-4 w-4" /> Mora histórica
            {(morosos?.length || 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {morosos!.length}
              </Badge>
            )}
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} className="gap-1">
            <FileDown className="h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </div>

      {/* Selector de semana */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFechaSemana(subDays(fechaSemana, 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 text-sm font-medium min-w-[200px] text-center">
            {format(semana.inicioDate, "dd MMM", { locale: es })} —{" "}
            {format(semana.finDate, "dd MMM yyyy", { locale: es })}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFechaSemana(addDays(fechaSemana, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" /> Elegir fecha
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaSemana}
              onSelect={(d) => d && setFechaSemana(d)}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="sm" onClick={() => setFechaSemana(new Date())}>
          Hoy
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Reportado</p>
          <p className="text-xl font-bold mt-1">{fmt(totales.reportado)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Entregado físico</p>
          <p className="text-xl font-bold mt-1 text-success">{fmt(totales.entregado)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Consignado banco</p>
          <p className="text-xl font-bold mt-1 text-primary">{fmt(consignado)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Por consignar</p>
          <p className={cn(
            "text-xl font-bold mt-1",
            porConsignar > 0 ? "text-amber-600" : "text-success"
          )}>
            {fmt(porConsignar)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">CDP en mora</p>
          <p className={cn(
            "text-xl font-bold mt-1",
            totales.enMora > 0 ? "text-destructive" : "text-success"
          )}>
            {totales.enMora}
          </p>
        </div>
      </div>

      {/* Banner mora histórica */}
      {(morosos?.length || 0) > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {morosos!.length} {morosos!.length === 1 ? "Casa de Paz tiene" : "Casas de Paz tienen"} ofrendas pendientes de entregar
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total adeudado: {fmt(morosos!.reduce((s, m) => s + m.diferencia, 0))}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowMora(true)}>
            Ver detalle
          </Button>
        </div>
      )}

      {/* Tabla agrupada por red */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando…</div>
      ) : (filas || []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay Casas de Paz activas registradas.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[110px]">Red</TableHead>
                <TableHead>Casa de Paz</TableHead>
                <TableHead className="text-right">Reportado</TableHead>
                <TableHead className="w-[140px]">Entregado</TableHead>
                <TableHead className="w-[150px]">Fecha entrega</TableHead>
                <TableHead className="min-w-[180px]">Observación</TableHead>
                <TableHead className="w-[120px] text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(porRed).map(([red, items]) => {
                const subRep = items.reduce((s, f) => s + f.valor_reportado, 0);
                const subEnt = items.reduce((s, f) => s + f.valor_entregado, 0);
                return (
                  <>
                    {items.map((f, idx) => (
                      <FilaEditable
                        key={f.grupo_id}
                        fila={f}
                        showRed={idx === 0}
                        red={red}
                        bloqueado={cerrada}
                        onSave={handleSave}
                      />
                    ))}
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell colSpan={2} className="text-right text-xs">Subtotal {red}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(subRep)}</TableCell>
                      <TableCell className="text-xs">{fmt(subEnt)}</TableCell>
                      <TableCell colSpan={3} className="text-xs text-muted-foreground">
                        Diferencia: {fmt(subRep - subEnt)}
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
              <TableRow className="bg-primary/10 font-bold">
                <TableCell colSpan={2} className="text-right">TOTAL GENERAL</TableCell>
                <TableCell className="text-right">{fmt(totales.reportado)}</TableCell>
                <TableCell>{fmt(totales.entregado)}</TableCell>
                <TableCell colSpan={3}>
                  Diferencia: <span className={totales.reportado - totales.entregado > 0 ? "text-destructive" : "text-success"}>
                    {fmt(totales.reportado - totales.entregado)}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bloque consignación semanal */}
      <ConsignacionSemanalBlock
        consignacion={consignacion || null}
        totalEntregado={totales.entregado}
        canManage={canManageSoporte}
        onCerrar={() => setShowConsignacion(true)}
        onReemplazar={() => setShowReemplazar(true)}
        onHistorial={() => setShowHistorial(true)}
        onReabrir={() => setShowReabrir(true)}
        onDownloadPDF={handleDownloadConsignacionPDF}
      />

      {/* Modal cerrar consignación semanal */}
      <ConsignacionSemanalDialog
        open={showConsignacion}
        consignacion={consignacion || null}
        totalEntregado={totales.entregado}
        semanaInicio={semana.inicio}
        semanaFin={semana.fin}
        config={config}
        canBypass={hasRole("admin") || hasRole("super_admin")}
        onClose={() => setShowConsignacion(false)}
      />

      {/* Modal reemplazar soporte semanal */}
      <ReemplazarSoporteSemanalDialog
        open={showReemplazar}
        consignacion={consignacion || null}
        semanaInicio={semana.inicio}
        onClose={() => setShowReemplazar(false)}
      />

      {/* Modal historial semanal */}
      <HistorialSemanalDialog
        open={showHistorial}
        consignacion={consignacion || null}
        onClose={() => setShowHistorial(false)}
      />

      {/* Modal reabrir semana */}
      <ReabrirSemanaDialog
        open={showReabrir}
        consignacion={consignacion || null}
        semanaInicio={semana.inicio}
        onClose={() => setShowReabrir(false)}
      />

      {/* Modal mora histórica */}
      <Dialog open={showMora} onOpenChange={setShowMora}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Mora histórica de ofrendas
            </DialogTitle>
          </DialogHeader>
          {(morosos || []).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p>¡No hay ofrendas pendientes!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Red</TableHead>
                  <TableHead>Casa de Paz</TableHead>
                  <TableHead>Semana</TableHead>
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead className="text-right">Reportado</TableHead>
                  <TableHead className="text-right">Entregado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {morosos!.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{m.red}</TableCell>
                    <TableCell className="text-xs font-medium">{m.grupo_nombre}</TableCell>
                    <TableCell className="text-xs">
                      {format(parseISO(m.semana_inicio), "dd/MM")} – {format(parseISO(m.semana_fin), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <Timer className="h-3 w-3" /> {m.dias_mora}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmt(m.reportado)}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(m.entregado)}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-destructive">{fmt(m.diferencia)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6} className="text-right">Total adeudado</TableCell>
                  <TableCell className="text-right text-destructive">
                    {fmt(morosos!.reduce((s, m) => s + m.diferencia, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------- FILA POR CDP (entrega física) ----------------------- */

function FilaEditable({
  fila,
  showRed,
  red,
  bloqueado,
  onSave,
}: {
  fila: FilaTesoreriaCDP;
  showRed: boolean;
  red: string;
  bloqueado: boolean;
  onSave: (f: FilaTesoreriaCDP, patch: any) => void;
}) {
  const [entregado, setEntregado] = useState(String(fila.valor_entregado || ""));
  const [fechaEntrega, setFechaEntrega] = useState(fila.fecha_entrega || "");
  const [obs, setObs] = useState(fila.observacion || "");
  const badge = estadoBadge[fila.estado];
  const enMora = fila.dias_mora > 0;

  return (
    <TableRow className={cn(enMora && "bg-destructive/5")}>
      <TableCell className="text-xs text-muted-foreground">{showRed ? red : ""}</TableCell>
      <TableCell>
        <p className="text-sm font-medium">{fila.grupo_nombre}</p>
        {fila.lider_nombre && (
          <p className="text-xs text-muted-foreground">{fila.lider_nombre}</p>
        )}
        {fila.reportes_count === 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" /> Sin reporte semanal
          </span>
        )}
      </TableCell>
      <TableCell className="text-right text-sm font-medium">
        {fmt(fila.valor_reportado)}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={entregado}
          disabled={bloqueado}
          onChange={(e) => setEntregado(e.target.value)}
          onBlur={() => {
            const num = parseFloat(entregado) || 0;
            if (num !== fila.valor_entregado) onSave(fila, { valor_entregado: num });
          }}
          className="h-8 text-sm"
          placeholder="0"
        />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          value={fechaEntrega}
          disabled={bloqueado}
          onChange={(e) => setFechaEntrega(e.target.value)}
          onBlur={() => {
            if (fechaEntrega !== (fila.fecha_entrega || "")) {
              onSave(fila, { fecha_entrega: fechaEntrega || null });
            }
          }}
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell>
        <Input
          value={obs}
          disabled={bloqueado}
          onChange={(e) => setObs(e.target.value)}
          onBlur={() => {
            if (obs !== (fila.observacion || "")) onSave(fila, { observacion: obs || null });
          }}
          className="h-8 text-sm"
          placeholder="Observación…"
        />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Badge className={cn("text-[10px]", badge.className)}>{badge.label}</Badge>
          {enMora && (
            <Badge variant="destructive" className="text-[10px] gap-0.5 h-5 px-1.5">
              <Timer className="h-3 w-3" /> {fila.dias_mora}d
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ----------------------- BLOQUE CONSIGNACIÓN SEMANAL ----------------------- */

function ConsignacionSemanalBlock({
  consignacion,
  totalEntregado,
  canManage,
  onCerrar,
  onReemplazar,
  onHistorial,
  onReabrir,
  onDownloadPDF,
}: {
  consignacion: ConsignacionSemanal | null;
  totalEntregado: number;
  canManage: boolean;
  onCerrar: () => void;
  onReemplazar: () => void;
  onHistorial: () => void;
  onReabrir: () => void;
  onDownloadPDF: () => void;
}) {
  const cerrada = !!consignacion?.consignacion_completada;
  const consignado = consignacion?.valor_consignado || 0;
  const diff = totalEntregado - consignado;

  return (
    <div className={cn(
      "rounded-xl border p-4",
      cerrada ? "bg-success/5 border-success/30" : "bg-card"
    )}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "rounded-lg p-2",
            cerrada ? "bg-success/20 text-success" : "bg-primary/10 text-primary"
          )}>
            {cerrada ? <Lock className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              Consignación bancaria de la semana
              {cerrada && (
                <Badge className="bg-success text-success-foreground border-transparent text-[10px] gap-1">
                  <Lock className="h-3 w-3" /> Cerrada
                </Badge>
              )}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Una sola consignación con la suma del recaudo físico de todas las Casas de Paz.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!cerrada ? (
            <Button
              size="sm"
              className="gap-1"
              disabled={totalEntregado <= 0 || !canManage}
              onClick={onCerrar}
              title={
                !canManage ? "Solo tesorería puede cerrar" :
                totalEntregado <= 0 ? "Registra primero las entregas físicas" :
                "Cerrar consignación de la semana"
              }
            >
              <Upload className="h-4 w-4" /> Registrar consignación
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={onDownloadPDF}>
                <FileDown className="h-4 w-4" /> PDF cierre
              </Button>
              {consignacion?.soporte_consignacion_url && (
                <Button size="sm" variant="ghost" asChild className="gap-1">
                  <a href={consignacion.soporte_consignacion_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4" /> Ver soporte
                  </a>
                </Button>
              )}
              {canManage && (
                <>
                  <Button size="sm" variant="outline" className="gap-1" onClick={onReemplazar}>
                    <Replace className="h-4 w-4" /> Reemplazar soporte
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                    onClick={onReabrir}
                    title="Reabrir la semana para registrar entregas que llegaron después"
                  >
                    <Unlock className="h-4 w-4" /> Reabrir semana
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={onHistorial}>
                    <History className="h-4 w-4" /> Historial
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total recaudado</p>
          <p className="text-lg font-bold">{fmt(totalEntregado)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Consignado</p>
          <p className="text-lg font-bold text-primary">{fmt(consignado)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Diferencia</p>
          <p className={cn(
            "text-lg font-bold",
            Math.abs(diff) < 0.01 ? "text-success" : "text-destructive"
          )}>
            {fmt(diff)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Fecha</p>
          <p className="text-lg font-bold">
            {consignacion?.fecha_consignacion
              ? format(parseISO(consignacion.fecha_consignacion), "dd MMM yyyy", { locale: es })
              : "—"}
          </p>
        </div>
      </div>

      {consignacion?.observacion && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Observación</p>
          <p className="text-sm whitespace-pre-line">{consignacion.observacion}</p>
        </div>
      )}
    </div>
  );
}

/* ----------------------- DIÁLOGO REGISTRAR CONSIGNACIÓN SEMANAL ----------------------- */

function ConsignacionSemanalDialog({
  open,
  consignacion,
  totalEntregado,
  semanaInicio,
  semanaFin,
  config,
  canBypass,
  onClose,
}: {
  open: boolean;
  consignacion: ConsignacionSemanal | null;
  totalEntregado: number;
  semanaInicio: string;
  semanaFin: string;
  config: any;
  canBypass: boolean;
  onClose: () => void;
}) {
  const upsert = useUpsertConsignacionSemanal();
  const upload = useUploadSoporteConsignacion();
  const fileRef = useRef<HTMLInputElement>(null);

  const [valorConsignado, setValorConsignado] = useState("");
  const [fechaCons, setFechaCons] = useState(format(new Date(), "yyyy-MM-dd"));
  const [obs, setObs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [autorizar, setAutorizar] = useState(false);
  const [justificacion, setJustificacion] = useState("");

  useEffect(() => {
    if (open) {
      setValorConsignado(String(consignacion?.valor_consignado || totalEntregado || ""));
      setFechaCons(consignacion?.fecha_consignacion || format(new Date(), "yyyy-MM-dd"));
      setObs(consignacion?.observacion || "");
      setFile(null);
      setAutorizar(false);
      setJustificacion("");
    }
  }, [open, consignacion, totalEntregado]);

  const tolPct = Number(config?.tesoreria_cdp_tolerancia_pct ?? 0);
  const tolAbs = Number(config?.tesoreria_cdp_tolerancia_abs ?? 0);

  const num = parseFloat(valorConsignado) || 0;
  const diferencia = Math.abs(num - totalEntregado);
  const diferenciaPct = totalEntregado > 0 ? (diferencia / totalEntregado) * 100 : 0;

  let excedeTolerancia = false;
  if (num > 0 && totalEntregado > 0) {
    const excedePct = tolPct > 0 ? diferenciaPct > tolPct : false;
    const excedeAbs = tolAbs > 0 ? diferencia > tolAbs : false;
    if (tolPct > 0 && tolAbs > 0) excedeTolerancia = excedePct && excedeAbs;
    else if (tolPct > 0) excedeTolerancia = excedePct;
    else if (tolAbs > 0) excedeTolerancia = excedeAbs;
  }

  const bloqueado = excedeTolerancia && !(canBypass && autorizar && justificacion.trim().length > 0);

  const handleConfirm = async (cerrarSemana: boolean) => {
    if (num <= 0) {
      toast.error("Ingresa el valor consignado.");
      return;
    }
    if (cerrarSemana && !file && !consignacion?.soporte_consignacion_url) {
      toast.error("Adjunta el soporte de la consignación para cerrar.");
      return;
    }
    if (cerrarSemana && bloqueado) {
      toast.error("La diferencia supera la tolerancia configurada.");
      return;
    }
    setSaving(true);
    try {
      let url = consignacion?.soporte_consignacion_url || null;
      if (file) {
        url = await upload.mutateAsync({ file, semanaInicio });
      }
      let observacionFinal = obs || null;
      if (cerrarSemana && excedeTolerancia && canBypass && autorizar) {
        observacionFinal = `${observacionFinal ? observacionFinal + "\n\n" : ""}[AUTORIZACIÓN ADMIN]: ${justificacion.trim()}`;
      }
      await upsert.mutateAsync({
        semana_inicio: semanaInicio,
        semana_fin: semanaFin,
        valor_total_entregado: totalEntregado,
        valor_consignado: num,
        fecha_consignacion: fechaCons || null,
        soporte_consignacion_url: url,
        observacion: observacionFinal,
        consignacion_completada: cerrarSemana,
      });
      toast.success(
        cerrarSemana
          ? "Consignación registrada y semana cerrada."
          : "Consignación guardada. La semana sigue abierta para conciliar entregas pendientes."
      );
      onClose();
    } catch (e: any) {
      toast.error("Error: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Registrar consignación semanal
          </DialogTitle>
          <DialogDescription>
            Semana del <strong>{format(parseISO(semanaInicio), "dd MMM", { locale: es })}</strong> al{" "}
            <strong>{format(parseISO(semanaFin), "dd MMM yyyy", { locale: es })}</strong>
            <br />
            Total recaudado físico de todas las Casas de Paz: <strong>{fmt(totalEntregado)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="valor-cons">Valor total consignado al banco *</Label>
            <Input
              id="valor-cons"
              type="number"
              step="0.01"
              value={valorConsignado}
              onChange={(e) => setValorConsignado(e.target.value)}
              placeholder="0"
            />
            {num > 0 && diferencia > 0 && !excedeTolerancia && (
              <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Diferencia: <strong>{fmt(diferencia)}</strong> ({diferenciaPct.toFixed(2)}%) — dentro de la tolerancia.
                </p>
              </div>
            )}
            {num > 0 && excedeTolerancia && (
              <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
                <p className="text-xs text-destructive font-medium">
                  ⛔ Diferencia ({fmt(diferencia)} / {diferenciaPct.toFixed(2)}%) supera la tolerancia configurada
                  {tolPct > 0 && ` (${tolPct}%)`}{tolPct > 0 && tolAbs > 0 && " /"}{tolAbs > 0 && ` ${fmt(tolAbs)}`}.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajusta el valor o {canBypass ? "autoriza la diferencia abajo" : "solicita autorización a un administrador"}.
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="fecha-cons">Fecha de consignación *</Label>
            <Input
              id="fecha-cons"
              type="date"
              value={fechaCons}
              onChange={(e) => setFechaCons(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="soporte">Soporte de consignación * (foto / PDF)</Label>
            <Input
              id="soporte"
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {consignacion?.soporte_consignacion_url && !file && (
              <a
                href={consignacion.soporte_consignacion_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" /> Soporte actual
              </a>
            )}
          </div>

          <div>
            <Label htmlFor="obs-cons">Observación</Label>
            <Textarea
              id="obs-cons"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Notas adicionales sobre la consignación…"
              rows={2}
            />
          </div>

          {excedeTolerancia && canBypass && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="autorizar"
                  checked={autorizar}
                  onCheckedChange={(v) => setAutorizar(!!v)}
                />
                <Label htmlFor="autorizar" className="text-xs font-medium cursor-pointer">
                  Autorizar diferencia (rol administrador)
                </Label>
              </div>
              {autorizar && (
                <Textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Justificación obligatoria de la diferencia…"
                  rows={2}
                  className="text-xs"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            variant="secondary"
            onClick={() => handleConfirm(false)}
            disabled={saving}
            className="gap-1"
            title="Guardar la consignación parcial sin cerrar la semana, para poder seguir conciliando entregas que lleguen después."
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar sin cerrar"}
          </Button>
          <Button
            onClick={() => handleConfirm(true)}
            disabled={saving || bloqueado}
            className="gap-1"
          >
            <Lock className="h-4 w-4" />
            {saving ? "Guardando…" : "Cerrar semana"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- DIÁLOGO REEMPLAZAR SOPORTE SEMANAL ----------------------- */

function ReemplazarSoporteSemanalDialog({
  open,
  consignacion,
  semanaInicio,
  onClose,
}: {
  open: boolean;
  consignacion: ConsignacionSemanal | null;
  semanaInicio: string;
  onClose: () => void;
}) {
  const reemplazar = useReemplazarSoporteSemanal();
  const [file, setFile] = useState<File | null>(null);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && consignacion) {
      setFile(null);
      setValor(String(consignacion.valor_consignado || ""));
      setFecha(consignacion.fecha_consignacion || "");
      setMotivo("");
    }
  }, [open, consignacion]);

  if (!consignacion) return null;

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      toast.error("Indica el motivo del cambio.");
      return;
    }
    if (!file && Number(valor) === consignacion.valor_consignado && fecha === (consignacion.fecha_consignacion || "")) {
      toast.error("Selecciona un nuevo archivo o cambia algún dato.");
      return;
    }
    setSaving(true);
    try {
      await reemplazar.mutateAsync({
        consignacion_id: consignacion.id,
        semana_inicio: semanaInicio,
        file,
        valor_consignado: Number(valor) || consignacion.valor_consignado,
        fecha_consignacion: fecha || consignacion.fecha_consignacion,
        motivo: motivo.trim(),
        soporte_anterior_url: consignacion.soporte_consignacion_url,
        valor_anterior: consignacion.valor_consignado,
        fecha_anterior: consignacion.fecha_consignacion,
      });
      toast.success("Soporte reemplazado y registrado en historial.");
      onClose();
    } catch (e: any) {
      toast.error("Error: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Replace className="h-5 w-5 text-primary" /> Reemplazar soporte semanal
          </DialogTitle>
          <DialogDescription>
            La consignación permanece <strong>cerrada</strong>; el cambio queda en el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nuevo archivo de soporte (opcional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {consignacion.soporte_consignacion_url && (
              <a
                href={consignacion.soporte_consignacion_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" /> Soporte actual
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Valor consignado</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha consignación</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Motivo del cambio *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Soporte original ilegible, reemplazo con nueva imagen…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving} className="gap-1">
            <Upload className="h-4 w-4" />
            {saving ? "Guardando…" : "Subir y registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- DIÁLOGO HISTORIAL ----------------------- */

function HistorialSemanalDialog({
  open,
  consignacion,
  onClose,
}: {
  open: boolean;
  consignacion: ConsignacionSemanal | null;
  onClose: () => void;
}) {
  const { data: historial, isLoading } = useHistorialSemanal(consignacion?.id || null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Historial de cambios — Consignación semanal
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando…</div>
        ) : (historial || []).length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <FileText className="h-10 w-10 opacity-40" />
            <p>Sin cambios registrados aún.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha cambio</TableHead>
                <TableHead className="text-right">Valor anterior</TableHead>
                <TableHead>Fecha anterior</TableHead>
                <TableHead>Soporte anterior</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial!.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">
                    {format(parseISO(h.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {fmt(Number(h.valor_consignado || 0))}
                  </TableCell>
                  <TableCell className="text-xs">
                    {h.fecha_consignacion ? format(parseISO(h.fecha_consignacion), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {h.soporte_url ? (
                      <a
                        href={h.soporte_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{h.motivo_cambio || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- DIÁLOGO REABRIR SEMANA ----------------------- */

function ReabrirSemanaDialog({
  open,
  consignacion,
  semanaInicio,
  onClose,
}: {
  open: boolean;
  consignacion: ConsignacionSemanal | null;
  semanaInicio: string;
  onClose: () => void;
}) {
  const reabrir = useReabrirConsignacionSemanal();
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setMotivo("");
  }, [open]);

  if (!consignacion) return null;

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      toast.error("Indica el motivo de la reapertura.");
      return;
    }
    setSaving(true);
    try {
      await reabrir.mutateAsync({
        consignacion_id: consignacion.id,
        semana_inicio: semanaInicio,
        motivo: motivo.trim(),
        soporte_url: consignacion.soporte_consignacion_url,
        valor_consignado: consignacion.valor_consignado,
        fecha_consignacion: consignacion.fecha_consignacion,
      });
      toast.success("Semana reabierta. Ya puedes registrar entregas pendientes y volver a cerrarla.");
      onClose();
    } catch (e: any) {
      toast.error("Error: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-amber-600" /> Reabrir semana
          </DialogTitle>
          <DialogDescription>
            La semana volverá a estar <strong>editable</strong> para registrar entregas que llegaron después.
            Podrás cerrarla nuevamente cuando termines la conciliación. El evento queda en el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ Al reabrir, los líderes de tesorería podrán modificar nuevamente los valores entregados,
            fechas y observaciones de cada Casa de Paz de esta semana.
          </div>
          <div>
            <Label htmlFor="motivo-reapertura">Motivo de la reapertura *</Label>
            <Textarea
              id="motivo-reapertura"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: La CDP X entregó la ofrenda 2 semanas después; falta conciliar $50.000."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Unlock className="h-4 w-4" />
            {saving ? "Reabriendo…" : "Reabrir semana"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
