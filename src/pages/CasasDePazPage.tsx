import { useState, useMemo } from "react";
import ModuleHero from "@/components/shell/ModuleHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CasaDePazCard, { CasaDePazData } from "@/components/casas-de-paz/CasaDePazCard";
import CasasDePazMapa from "@/components/casas-de-paz/CasasDePazMapa";
import {
  Home,
  Search,
  MapPin,
  Calendar,
  Grid,
  Map as MapIcon,
  Filter,
  Users,
  X,
  Compass,
} from "lucide-react";

const DIAS_SEMANA = [
  "Todos",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function CasasDePazPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRed, setSelectedRed] = useState<string>("todas");
  const [selectedDia, setSelectedDia] = useState<string>("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "mapa">("grid");

  // Query Casas de Paz con sus líderes
  const { data: casas, isLoading } = useQuery({
    queryKey: ["casas-de-paz-directorio"],
    queryFn: async () => {
      // 1. Obtener grupos tipo 'Casas de paz'
      const { data: gruposData, error: gruposErr } = await supabase
        .from("grupos")
        .select("*, personas:lider_id(id, nombres, apellidos, telefono, foto_url)")
        .eq("tipo", "Casas de paz")
        .eq("estado", "Activo")
        .order("nombre");

      if (gruposErr) throw gruposErr;

      return (gruposData || []).map((g: any) => {
        const lider = g.personas;
        const liderNombre = lider
          ? `${lider.nombres || ""} ${lider.apellidos || ""}`.trim()
          : null;

        return {
          id: g.id,
          nombre: g.nombre,
          tipo: g.tipo,
          red: g.red,
          ubicacion: g.ubicacion,
          dia_reunion: g.dia_reunion,
          hora_reunion: g.hora_reunion,
          latitud: g.latitud,
          longitud: g.longitud,
          descripcion: g.descripcion,
          lider_id: g.lider_id,
          lider_nombre: liderNombre,
          lider_telefono: lider?.telefono || null,
          lider_foto_url: lider?.foto_url || null,
        } as CasaDePazData;
      });
    },
  });

  // Lista de redes únicas disponibles
  const redesDisponibles = useMemo(() => {
    if (!casas) return [];
    const set = new Set<string>();
    casas.forEach((c) => {
      if (c.red) set.add(c.red);
    });
    return Array.from(set).sort();
  }, [casas]);

  // Filtrar casas de paz según búsqueda y selectores
  const casasFiltradas = useMemo(() => {
    if (!casas) return [];

    return casas.filter((c) => {
      // Filtro de Red
      if (selectedRed !== "todas" && c.red !== selectedRed) {
        return false;
      }

      // Filtro de Día
      if (selectedDia !== "Todos" && c.dia_reunion?.toLowerCase() !== selectedDia.toLowerCase()) {
        return false;
      }

      // Búsqueda textual
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNombre = c.nombre?.toLowerCase().includes(q);
        const matchUbicacion = c.ubicacion?.toLowerCase().includes(q);
        const matchLider = c.lider_nombre?.toLowerCase().includes(q);
        const matchRed = c.red?.toLowerCase().includes(q);
        if (!matchNombre && !matchUbicacion && !matchLider && !matchRed) {
          return false;
        }
      }

      return true;
    });
  }, [casas, selectedRed, selectedDia, searchTerm]);

  const totalCasas = casas?.length || 0;
  const conUbicacion = (casas || []).filter((c) => c.ubicacion).length;
  const conMapa = (casas || []).filter((c) => c.latitud != null && c.longitud != null).length;

  const hasActiveFilters = searchTerm !== "" || selectedRed !== "todas" || selectedDia !== "Todos";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRed("todas");
    setSelectedDia("Todos");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <ModuleHero
        variant="grupos"
        title="Directorio de Casas de Paz"
        eyebrow="Casas de Paz"
        description="Consulta las direcciones, días de reunión, horarios y líderes de las Casas de Paz. Encuentra tu casa más cercana para integrarte."
        kpis={[
          { label: "Casas de Paz", value: totalCasas, hint: "Registradas activas" },
          { label: "Con Dirección", value: conUbicacion, hint: "Direcciones físicas" },
          { label: "En Mapa", value: conMapa, hint: "Georreferenciadas" },
          { label: "Redes", value: redesDisponibles.length, hint: "Redes ministeriales" },
        ]}
      />

      {/* Barra de Filtros y Búsqueda */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, barrio, dirección o líder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Red */}
          <div className="w-full md:w-48">
            <Select value={selectedRed} onValueChange={setSelectedRed}>
              <SelectTrigger className="text-sm">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Todas las redes" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las Redes</SelectItem>
                {redesDisponibles.map((red) => (
                  <SelectItem key={red} value={red}>
                    Red {red}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Día */}
          <div className="w-full md:w-44">
            <Select value={selectedDia} onValueChange={setSelectedDia}>
              <SelectTrigger className="text-sm">
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Todos los días" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DIAS_SEMANA.map((dia) => (
                  <SelectItem key={dia} value={dia}>
                    {dia === "Todos" ? "Todos los Días" : dia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Modo de Vista */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 shrink-0">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Tarjetas</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "mapa" ? "default" : "ghost"}
              className="h-8 px-2.5 text-xs gap-1.5"
              onClick={() => setViewMode("mapa")}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Mapa ({conMapa})</span>
            </Button>
          </div>
        </div>

        {/* Resumen de Filtros Activos */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t text-xs">
            <span className="text-muted-foreground font-medium">Filtros activos:</span>
            {selectedRed !== "todas" && (
              <Badge variant="secondary" className="gap-1">
                Red: {selectedRed}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedRed("todas")} />
              </Badge>
            )}
            {selectedDia !== "Todos" && (
              <Badge variant="secondary" className="gap-1">
                Día: {selectedDia}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedDia("Todos")} />
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Texto: "{searchTerm}"
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm("")} />
              </Badge>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary ml-auto"
              onClick={clearFilters}
            >
              Limpiar todos
            </Button>
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl w-full" />
          ))}
        </div>
      ) : casasFiltradas.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Compass className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">No se encontraron Casas de Paz</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {hasActiveFilters
              ? "No hay Casas de Paz que coincidan con los filtros seleccionados. Intenta cambiar los términos de búsqueda o limpiar los filtros."
              : "Aún no se han registrado Casas de Paz activas en el sistema."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {casasFiltradas.map((casa) => (
            <CasaDePazCard key={casa.id} casa={casa} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm h-[600px]">
          <CasasDePazMapa casas={casasFiltradas} />
        </div>
      )}
    </div>
  );
}
