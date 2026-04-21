import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft, ChevronRight, CalendarIcon, FileDown, AlertTriangle,
  DollarSign, CheckCircle2, Clock, History, Upload, Lock, FileText, ExternalLink,
} from "lucide-react";
import {
  useTesoreriaSemana, useUpsertTesoreriaCDP, useTesoreriaMora, useUploadSoporteConsignacion,
  getSemanaRange, type FilaTesoreriaCDP, type EstadoTesoreria,
} from "@/hooks/useTesoreriaCDP";
import { useConfiguracion } from "@/hooks/useConfiguracion";
import { useAuth } from "@/hooks/useAuth";
import { exportTesoreriaSemanalPDF } from "@/lib/exportTesoreriaCDPPdf";
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
  "Cerrado":     { className: "bg-primary text-primary-foreground border-transparent", label: "Cerrado ✓" },
};

const fmt = (n: number) =>
  `$${Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function TesoreriaCDPSection() {
  const [fechaSemana, setFechaSemana] = useState<Date>(new Date());
  const [showMora, setShowMora] = useState(false);
  const [filaConsignacion, setFilaConsignacion] = useState<FilaTesoreriaCDP | null>(null);
  const semana = useMemo(() => getSemanaRange(fechaSemana), [fechaSemana]);

  const { data: filas, isLoading } = useTesoreriaSemana(semana.inicio, semana.fin);
  const { data: morosos } = useTesoreriaMora();
  const { data: config } = useConfiguracion();
  const { user } = useAuth();
  const upsert = useUpsertTesoreriaCDP();
  const uploadSoporte = useUploadSoporteConsignacion();

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
      consignado: arr.reduce((s, f) => s + f.valor_consignado, 0),
      enMora: arr.filter((f) => f.estado === "En mora").length,
      conciliados: arr.filter((f) => f.estado === "Conciliado" || f.estado === "Sobrante").length,
      cerrados: arr.filter((f) => f.consignacion_completada).length,
      pendientesConsignar: arr.filter((f) => f.valor_entregado > 0 && !f.consignacion_completada).length,
    };
  }, [filas]);

  const handleSave = async (
    fila: FilaTesoreriaCDP,
    patch: { valor_entregado?: number; fecha_entrega?: string | null; observacion?: string | null }
  ) => {
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Reportado</p>
          <p className="text-2xl font-bold mt-1">{fmt(totales.reportado)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Entregado</p>
          <p className="text-2xl font-bold mt-1 text-success">{fmt(totales.entregado)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Diferencia</p>
          <p className={cn(
            "text-2xl font-bold mt-1",
            totales.reportado - totales.entregado > 0 ? "text-destructive" : "text-success"
          )}>
            {fmt(totales.reportado - totales.entregado)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">CDP en mora</p>
          <p className={cn(
            "text-2xl font-bold mt-1",
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
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[110px]">Red</TableHead>
                <TableHead>Casa de Paz</TableHead>
                <TableHead className="text-right">Reportado</TableHead>
                <TableHead className="w-[140px]">Entregado</TableHead>
                <TableHead className="w-[150px]">Fecha entrega</TableHead>
                <TableHead className="min-w-[180px]">Observación</TableHead>
                <TableHead className="w-[110px] text-center">Estado</TableHead>
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
                    <TableCell className="text-right text-xs">{fmt(m.reportado)}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(m.entregado)}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-destructive">{fmt(m.diferencia)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={5} className="text-right">Total adeudado</TableCell>
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

function FilaEditable({
  fila,
  showRed,
  red,
  onSave,
}: {
  fila: FilaTesoreriaCDP;
  showRed: boolean;
  red: string;
  onSave: (f: FilaTesoreriaCDP, patch: any) => void;
}) {
  const [entregado, setEntregado] = useState(String(fila.valor_entregado || ""));
  const [fechaEntrega, setFechaEntrega] = useState(fila.fecha_entrega || "");
  const [obs, setObs] = useState(fila.observacion || "");
  const badge = estadoBadge[fila.estado];

  return (
    <TableRow>
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
          onChange={(e) => setObs(e.target.value)}
          onBlur={() => {
            if (obs !== (fila.observacion || "")) onSave(fila, { observacion: obs || null });
          }}
          className="h-8 text-sm"
          placeholder="Observación…"
        />
      </TableCell>
      <TableCell className="text-center">
        <Badge className={cn("text-[10px]", badge.className)}>{badge.label}</Badge>
      </TableCell>
    </TableRow>
  );
}
