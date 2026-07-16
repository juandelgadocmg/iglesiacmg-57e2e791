import { useState, useMemo } from "react";
import PeticionFormDialog from "@/components/forms/PeticionFormDialog";
import WhatsAppPeticionDialog from "@/components/peticiones/WhatsAppPeticionDialog";
import PeticionesKanban from "@/components/peticiones/PeticionesKanban";
import PeticionDetailDock from "@/components/peticiones/PeticionDetailDock";
import { usePeticiones } from "@/hooks/usePeticiones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search, Calendar as CalendarIcon, X, MessageCircle, Flame,
  AlertTriangle, Sparkles, HeartHandshake
} from "lucide-react";
import { format, parseISO, isPast, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { cn } from "@/lib/utils";
import { fueContactadoPorWhatsApp, ultimoContactoWhatsApp } from "@/lib/whatsapp";
import { useContextDock } from "@/components/layout/context-dock/ContextDock";

const PRIORIDADES = ["Baja", "Normal", "Alta", "Urgente"];

export default function PeticionesPage() {
  const { data: peticiones, isLoading } = usePeticiones();
  const dock = useContextDock();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [waPeticion, setWaPeticion] = useState<any | null>(null);
  const [soloContactadasWA, setSoloContactadasWA] = useState(false);
  const [prioridadFilter, setPrioridadFilter] = useState<string[]>([]);
  const [smartFilter, setSmartFilter] = useState<"todos" | "urgentes" | "vencidas" | "sin_wa" | "nuevas">("todos");

  const filtered = useMemo(() => {
    if (!peticiones) return [];
    const desde = fechaDesde ? startOfDay(fechaDesde) : null;
    const hasta = fechaHasta ? endOfDay(fechaHasta) : null;
    return peticiones.filter((p: any) => {
      if (search) {
        const q = search.toLowerCase();
        const ok = p.titulo?.toLowerCase().includes(q) ||
          p.personas?.nombres?.toLowerCase().includes(q) ||
          p.personas?.apellidos?.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q);
        if (!ok) return false;
      }
      if (prioridadFilter.length && !prioridadFilter.includes(p.prioridad)) return false;
      if (desde || hasta) {
        if (!p.created_at) return false;
        const f = parseISO(p.created_at);
        if (desde && hasta) { if (!isWithinInterval(f, { start: desde, end: hasta })) return false; }
        else if (desde && f < desde) return false;
        else if (hasta && f > hasta) return false;
      }
      if (soloContactadasWA && !fueContactadoPorWhatsApp(p.notas_seguimiento)) return false;

      if (smartFilter === "urgentes" && p.prioridad !== "Urgente" && p.prioridad !== "Alta") return false;
      if (smartFilter === "vencidas") {
        if (!p.fecha_seguimiento) return false;
        if (!isPast(parseISO(p.fecha_seguimiento))) return false;
        if (p.estado === "Respondida" || p.estado === "Archivada") return false;
      }
      if (smartFilter === "sin_wa" && (fueContactadoPorWhatsApp(p.notas_seguimiento) || p.estado === "Respondida" || p.estado === "Archivada")) return false;
      if (smartFilter === "nuevas") {
        if (!p.created_at) return false;
        const d = (Date.now() - parseISO(p.created_at).getTime()) / (1000 * 3600 * 24);
        if (d > 7) return false;
      }
      return true;
    });
  }, [peticiones, search, fechaDesde, fechaHasta, soloContactadasWA, prioridadFilter, smartFilter]);

  const smartCounts = useMemo(() => {
    if (!peticiones) return { total: 0, urgentes: 0, vencidas: 0, sin_wa: 0, nuevas: 0 };
    const now = Date.now();
    return {
      total: peticiones.length,
      urgentes: peticiones.filter((p: any) => p.prioridad === "Urgente" || p.prioridad === "Alta").length,
      vencidas: peticiones.filter((p: any) => p.fecha_seguimiento && isPast(parseISO(p.fecha_seguimiento)) && p.estado !== "Respondida" && p.estado !== "Archivada").length,
      sin_wa: peticiones.filter((p: any) => !fueContactadoPorWhatsApp(p.notas_seguimiento) && p.estado !== "Respondida" && p.estado !== "Archivada").length,
      nuevas: peticiones.filter((p: any) => p.created_at && (now - parseISO(p.created_at).getTime()) / (1000 * 3600 * 24) <= 7).length,
    };
  }, [peticiones]);

  const openDetail = (p: any) => {
    dock.open(
      p.titulo,
      <PeticionDetailDock
        peticion={p}
        onEdit={(pp) => { dock.close(); setEditing(pp); }}
        onWhatsApp={(pp) => setWaPeticion(pp)}
        onClose={dock.close}
      />
    );
  };

  const togglePrioridad = (p: string) => {
    setPrioridadFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const rangoActivo = fechaDesde || fechaHasta;
  const rangoLabel = useMemo(() => {
    if (!rangoActivo) return "";
    return `${fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "..."} – ${fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "..."}`;
  }, [fechaDesde, fechaHasta, rangoActivo]);

  const exportData = filtered.map((p: any) => ({
    titulo: p.titulo,
    persona: p.personas ? `${p.personas.nombres} ${p.personas.apellidos}` : "Sin asignar",
    tipo: p.tipo || "Sin tipo",
    estado: p.estado,
    prioridad: p.prioridad,
    whatsapp_estado: fueContactadoPorWhatsApp(p.notas_seguimiento) ? "Contactado" : "Pendiente",
    whatsapp_fecha: ultimoContactoWhatsApp(p.notas_seguimiento) || "",
    descripcion: p.descripcion || "",
    fecha_seguimiento: p.fecha_seguimiento || "",
    fecha: p.created_at ? format(parseISO(p.created_at), "dd/MM/yyyy") : "",
  }));

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const smartItems = [
    { id: "todos", label: "Todas", icon: HeartHandshake, count: smartCounts.total, tone: "" },
    { id: "urgentes", label: "Urgentes / Alta", icon: Flame, count: smartCounts.urgentes, tone: "text-destructive" },
    { id: "vencidas", label: "Seguimiento vencido", icon: AlertTriangle, count: smartCounts.vencidas, tone: "text-warning" },
    { id: "sin_wa", label: "Sin contactar por WhatsApp", icon: MessageCircle, count: smartCounts.sin_wa, tone: "text-info" },
    { id: "nuevas", label: "Nuevas esta semana", icon: Sparkles, count: smartCounts.nuevas, tone: "text-success" },
  ] as const;

  return (
    <div className="animate-fade-in flex h-[calc(100vh-56px)] overflow-hidden">
      {/* LEFT RAIL */}
      <aside className="w-60 shrink-0 border-r bg-card/40 p-3 overflow-y-auto hidden lg:block">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 mb-2">Vistas pastorales</p>
          <div className="space-y-0.5">
            {smartItems.map(({ id, label, icon: Icon, count, tone }) => (
              <button
                key={id}
                onClick={() => setSmartFilter(id as any)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                  smartFilter === id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", smartFilter === id ? "text-primary" : tone || "text-muted-foreground")} />
                <span className="flex-1 truncate">{label}</span>
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">{count}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 mb-2">Prioridad</p>
          <div className="space-y-0.5">
            {PRIORIDADES.map(p => (
              <button
                key={p}
                onClick={() => togglePrioridad(p)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                  prioridadFilter.includes(p) ? "bg-muted font-medium" : "hover:bg-muted/60 text-muted-foreground"
                )}
              >
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  p === "Urgente" && "bg-destructive",
                  p === "Alta" && "bg-warning",
                  p === "Normal" && "bg-info",
                  p === "Baja" && "bg-muted-foreground"
                )} />
                {p}
              </button>
            ))}
            {prioridadFilter.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 text-muted-foreground" onClick={() => setPrioridadFilter([])}>
                <X className="h-3 w-3 mr-1" /> Limpiar prioridad
              </Button>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 mb-2">Contacto</p>
          <div className="flex items-center justify-between px-2 py-1.5">
            <Label htmlFor="wa" className="text-sm cursor-pointer flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-success" /> Solo con WA
            </Label>
            <Switch id="wa" checked={soloContactadasWA} onCheckedChange={setSoloContactadasWA} />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card/60 px-6 py-3 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Peticiones de Oración</h1>
            <p className="text-xs text-muted-foreground">Kanban pastoral · arrastra para cambiar estado</p>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar petición, persona o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 h-9", !fechaDesde && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {fechaDesde ? format(fechaDesde, "dd MMM", { locale: es }) : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={fechaDesde} onSelect={setFechaDesde} initialFocus locale={es} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5 h-9", !fechaHasta && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {fechaHasta ? format(fechaHasta, "dd MMM", { locale: es }) : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={fechaHasta} onSelect={setFechaHasta} initialFocus locale={es} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {rangoActivo && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => { setFechaDesde(undefined); setFechaHasta(undefined); }}>
                <X className="h-4 w-4" />
              </Button>
            )}

            <ExportDropdown
              title={rangoActivo ? `Peticiones (${rangoLabel})` : "Peticiones de Oración"}
              filename={rangoActivo ? `peticiones-${fechaDesde ? format(fechaDesde, "yyyyMMdd") : "ini"}-${fechaHasta ? format(fechaHasta, "yyyyMMdd") : "hoy"}` : "peticiones-oracion"}
              columns={[
                { header: "Título", key: "titulo" }, { header: "Persona", key: "persona" },
                { header: "Tipo", key: "tipo" }, { header: "Estado", key: "estado" },
                { header: "Prioridad", key: "prioridad" }, { header: "WhatsApp", key: "whatsapp_estado" },
                { header: "Fecha contacto WA", key: "whatsapp_fecha" }, { header: "Descripción", key: "descripcion" },
                { header: "Seguimiento", key: "fecha_seguimiento" }, { header: "Fecha", key: "fecha" },
              ]}
              data={exportData}
            />
            <PeticionFormDialog />
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-auto p-6 bg-muted/10">
          <PeticionesKanban peticiones={filtered} onOpen={openDetail} onWhatsApp={setWaPeticion} />
        </div>

        {editing && <PeticionFormDialog initialData={editing} onClose={() => setEditing(null)} />}
        <WhatsAppPeticionDialog
          open={!!waPeticion}
          onOpenChange={(v) => !v && setWaPeticion(null)}
          peticion={waPeticion}
        />
      </div>
    </div>
  );
}
