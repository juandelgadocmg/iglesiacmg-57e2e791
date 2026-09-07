import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PersonaAfirmacionRuta } from "@/hooks/useAfirmacionRuta";
import { exportAfirmacionHitosExcel } from "@/lib/exportAfirmacionUtils";

type FilterType = "todos" | "dia" | "anio" | "anio_mes" | "rango";

const MESES = [
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" }, { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" }, { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" }, { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" }, { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

interface Props {
  personas: PersonaAfirmacionRuta[];
  trigger?: React.ReactNode;
}

export default function AfirmacionExportDialog({ personas, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("todos");
  const [dia, setDia] = useState<Date | undefined>();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [desde, setDesde] = useState<Date | undefined>();
  const [hasta, setHasta] = useState<Date | undefined>();

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= 2018; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  // Todo se filtra en memoria sobre los datos ya cargados de la tabla de Afirmación
  // (misma fuente que ves en pantalla) — por eso el filtro y la descarga son instantáneos,
  // sin volver a consultar la base de datos.
  const filteredPersonas = useMemo(() => {
    if (filterType === "todos") return personas;

    return personas.filter((p) => {
      if (!p.fechaIngreso) return false;
      const ing = new Date(p.fechaIngreso);
      if (isNaN(ing.getTime())) return false;

      if (filterType === "dia") {
        return dia ? format(ing, "yyyy-MM-dd") === format(dia, "yyyy-MM-dd") : false;
      }
      if (filterType === "anio") {
        return ing.getFullYear() === Number(year);
      }
      if (filterType === "anio_mes") {
        return ing.getFullYear() === Number(year) && ing.getMonth() + 1 === Number(month);
      }
      if (filterType === "rango") {
        if (desde && ing < desde) return false;
        if (hasta) {
          const hastaEnd = new Date(hasta);
          hastaEnd.setHours(23, 59, 59, 999);
          if (ing > hastaEnd) return false;
        }
        return true;
      }
      return true;
    });
  }, [personas, filterType, dia, year, month, desde, hasta]);

  const rangoLabel = useMemo(() => {
    if (filterType === "todos") return "Todos los registros";
    if (filterType === "anio") return `Año ${year}`;
    if (filterType === "anio_mes") {
      const mLabel = MESES.find((m) => m.value === month)?.label || month;
      return `${mLabel} ${year}`;
    }
    if (filterType === "dia") return dia ? `Día ${format(dia, "dd/MM/yyyy")}` : "Día no seleccionado";
    if (filterType === "rango") {
      const d = desde ? format(desde, "dd/MM/yyyy") : "—";
      const h = hasta ? format(hasta, "dd/MM/yyyy") : "—";
      return `Del ${d} al ${h}`;
    }
    return "";
  }, [filterType, year, month, desde, hasta, dia]);

  const filenameBase = useMemo(() => {
    if (filterType === "todos") return "afirmacion_hitos_todos";
    if (filterType === "anio") return `afirmacion_hitos_${year}`;
    if (filterType === "anio_mes") return `afirmacion_hitos_${year}_${month.padStart(2, "0")}`;
    if (filterType === "dia") return `afirmacion_hitos_${dia ? format(dia, "yyyyMMdd") : "dia"}`;
    if (filterType === "rango") {
      const d = desde ? format(desde, "yyyyMMdd") : "ini";
      const h = hasta ? format(hasta, "yyyyMMdd") : "fin";
      return `afirmacion_hitos_${d}_${h}`;
    }
    return "afirmacion_hitos";
  }, [filterType, year, month, desde, hasta, dia]);

  const handleExcel = () => {
    if (!filteredPersonas.length) {
      toast.error("No hay personas para exportar con este filtro");
      return;
    }
    exportAfirmacionHitosExcel(filteredPersonas, filenameBase, rangoLabel);
    toast.success(`Excel exportado (${filteredPersonas.length} registros)`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Exportar Afirmación</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Exportar Ruta de Afirmación (16 Hitos)</DialogTitle>
          <DialogDescription>
            Descarga en Excel exactamente las personas y los hitos que ves en la tabla de
            Afirmación (visitantes, sin Casas de Paz), filtrando por fecha de ingreso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por fecha de ingreso</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los registros</SelectItem>
                <SelectItem value="dia">Por día específico</SelectItem>
                <SelectItem value="anio_mes">Por año y mes</SelectItem>
                <SelectItem value="anio">Por año</SelectItem>
                <SelectItem value="rango">Por rango de fechas</SelectItem>
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
              <span className="font-semibold text-foreground">{filteredPersonas.length}</span> persona(s) coinciden con: <em>{rangoLabel}</em>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleExcel} disabled={!filteredPersonas.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Descargar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
