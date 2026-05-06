import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePersonasParaExport, useProcesosCrecimiento, type PersonaExportFiltros } from "@/hooks/useDatabase";
import {
  exportPersonasInformeConsolidacionExcel,
  exportPersonasInformeConsolidacionPDF,
} from "@/lib/exportPersonasUtils";

type FilterType = "todos" | "dia" | "anio" | "anio_mes" | "rango";

const MESES = [
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" }, { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" }, { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" }, { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" }, { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

interface Props {
  trigger?: React.ReactNode;
}

export default function ExportPersonasDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [campoFecha, setCampoFecha] = useState<"fecha_ingreso" | "created_at" | "ingreso_proceso">("created_at");
  const [filterType, setFilterType] = useState<FilterType>("todos");
  const [dia, setDia] = useState<Date | undefined>();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [desde, setDesde] = useState<Date | undefined>();
  const [hasta, setHasta] = useState<Date | undefined>();

  // Build filtros
  const filtros: PersonaExportFiltros = useMemo(() => {
    const f: PersonaExportFiltros = { campo: campoFecha };
    if (filterType === "anio") {
      f.from = `${year}-01-01`;
      f.to = `${Number(year) + 1}-01-01`;
    } else if (filterType === "anio_mes") {
      const m = Number(month);
      const y = Number(year);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      f.from = `${y}-${String(m).padStart(2, "0")}-01`;
      f.to = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
    } else if (filterType === "dia" && dia) {
      const next = new Date(dia);
      next.setDate(next.getDate() + 1);
      f.from = format(dia, "yyyy-MM-dd");
      f.to = format(next, "yyyy-MM-dd");
    } else if (filterType === "rango") {
      if (desde) f.from = format(desde, "yyyy-MM-dd");
      if (hasta) {
        // include end day
        const next = new Date(hasta);
        next.setDate(next.getDate() + 1);
        f.to = format(next, "yyyy-MM-dd");
      }
    }
    return f;
  }, [filterType, year, month, desde, hasta, campoFecha, dia]);

  const { data: personas = [], isLoading } = usePersonasParaExport(filtros, open);
  const { data: procesos = [] } = useProcesosCrecimiento();

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= 2018; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const rangoLabel = useMemo(() => {
    if (filterType === "todos") return "Todos los registros";
    if (filterType === "anio") return `Año ${year}`;
    if (filterType === "anio_mes") {
      const mLabel = MESES.find((m) => m.value === month)?.label || month;
      return `${mLabel} ${year}`;
    }
    if (filterType === "dia") {
      return dia ? `Día ${format(dia, "dd/MM/yyyy")}` : "Día no seleccionado";
    }
    if (filterType === "rango") {
      const d = desde ? format(desde, "dd/MM/yyyy") : "—";
      const h = hasta ? format(hasta, "dd/MM/yyyy") : "—";
      return `Del ${d} al ${h}`;
    }
    return "";
  }, [filterType, year, month, desde, hasta, dia]);

  const filenameBase = useMemo(() => {
    if (filterType === "todos") return "informe_consolidacion_todos";
    if (filterType === "anio") return `informe_consolidacion_${year}`;
    if (filterType === "anio_mes") return `informe_consolidacion_${year}_${month.padStart(2, "0")}`;
    if (filterType === "dia") return `informe_consolidacion_${dia ? format(dia, "yyyyMMdd") : "dia"}`;
    if (filterType === "rango") {
      const d = desde ? format(desde, "yyyyMMdd") : "ini";
      const h = hasta ? format(hasta, "yyyyMMdd") : "fin";
      return `informe_consolidacion_${d}_${h}`;
    }
    return "informe_consolidacion";
  }, [filterType, year, month, desde, hasta, dia]);

  const handleExcel = () => {
    if (!personas.length) {
      toast.error("No hay personas para exportar con este filtro");
      return;
    }
    exportPersonasInformeConsolidacionExcel(personas, procesos, filenameBase);
    toast.success(`Excel exportado (${personas.length} registros)`);
  };

  const handlePDF = () => {
    if (!personas.length) {
      toast.error("No hay personas para exportar con este filtro");
      return;
    }
    exportPersonasInformeConsolidacionPDF(personas, procesos, filenameBase, rangoLabel);
    toast.success(`PDF exportado (${personas.length} registros)`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button variant="outline" size="sm">Informe de Consolidación</Button>}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Exportar Informe de Consolidación</DialogTitle>
          <DialogDescription>
            Descarga la información completa de personas (datos básicos + 25 procesos) en el formato de la plantilla. Filtra por fecha de creación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por</Label>
            <Select value={campoFecha} onValueChange={(v) => setCampoFecha(v as "fecha_ingreso" | "created_at")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Fecha de creación del registro (recomendado)</SelectItem>
                <SelectItem value="fecha_ingreso">Fecha de ingreso a la iglesia</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {campoFecha === "created_at"
                ? "Recomendado para seguimiento: filtra por la fecha en que se creó el registro en el sistema."
                : "Filtra por la fecha real en que la persona ingresó a la iglesia (puede estar vacía en algunos registros)."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de filtro</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los registros</SelectItem>
                <SelectItem value="dia">Por día específico</SelectItem>
                <SelectItem value="anio_mes">Por año y mes</SelectItem>
                <SelectItem value="anio">Por año</SelectItem>
                <SelectItem value="rango">Por rango de días</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === "dia" && (
            <div className="space-y-2">
              <Label>Día</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dia && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dia ? format(dia, "dd MMM yyyy", { locale: es }) : "Seleccionar día"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dia} onSelect={setDia} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {filterType === "anio" && (
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === "anio_mes" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {filterType === "rango" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !desde && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {desde ? format(desde, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={desde} onSelect={setDesde} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !hasta && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {hasta ? format(hasta, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={hasta} onSelect={setHasta} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="font-medium">Vista previa</div>
            <div className="text-muted-foreground mt-1">
              {isLoading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Calculando...</span>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{personas.length}</span> persona(s) coinciden con: <em>{rangoLabel}</em>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="outline" onClick={handlePDF} disabled={isLoading || !personas.length}>
            <FileText className="h-4 w-4 mr-2" /> PDF resumen
          </Button>
          <Button onClick={handleExcel} disabled={isLoading || !personas.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (plantilla)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
