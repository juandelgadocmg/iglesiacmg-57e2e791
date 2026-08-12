import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  INITIAL_REDES,
  INITIAL_CASAS,
  INITIAL_LEADERS,
  INITIAL_DISCIPULOS,
  INITIAL_PROGRESO,
  INITIAL_ETAPAS,
} from "@/data/discipulandoInitialData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calcularSemaforo, ETAPAS_ORDER, SemaforoColor } from "@/modules/discipulado/utils/semaforo";
import { SemaforoDot } from "@/modules/discipulado/components/SemaforoDot";
import {
  Search,
  Users,
  Home,
  Network,
  UserCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useDiscipulando } from "@/hooks/useDiscipulando";

export default function DiscipuladoPage() {
  const { url: discipulandoExtUrl, open: openExtDiscipulando } = useDiscipulando();

  const [redes, setRedes] = useState<any[]>(INITIAL_REDES);
  const [casas, setCasas] = useState<any[]>(INITIAL_CASAS);
  const [leaders, setLeaders] = useState<any[]>(INITIAL_LEADERS);
  const [discipulos, setDiscipulos] = useState<any[]>(INITIAL_DISCIPULOS);
  const [progreso, setProgreso] = useState<any[]>(INITIAL_PROGRESO);
  const [etapas] = useState<any[]>(INITIAL_ETAPAS);

  const [search, setSearch] = useState("");
  const [filterRed, setFilterRed] = useState("all");
  const [filterCasa, setFilterCasa] = useState("all");
  const [filterLider, setFilterLider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSemaforo, setFilterSemaforo] = useState("all");

  // Attempt live Supabase fetch if available, fallback to initial dataset
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const [rRes, cRes, lRes, dRes, pRes] = await Promise.allSettled([
          supabase.from("redes" as any).select("*").order("name"),
          supabase.from("casas_de_paz" as any).select("*, redes(name)").order("name"),
          supabase.from("leaders" as any).select("id, full_name, casa_de_paz_id").order("full_name"),
          supabase.from("discipulos" as any).select("*").order("full_name"),
          supabase.from("progreso_discipulo" as any).select("*"),
        ]);

        if (!isMounted) return;

        if (rRes.status === "fulfilled" && rRes.value.data && rRes.value.data.length > 0) {
          setRedes(rRes.value.data);
        }
        if (cRes.status === "fulfilled" && cRes.value.data && cRes.value.data.length > 0) {
          setCasas(cRes.value.data);
        }
        if (lRes.status === "fulfilled" && lRes.value.data && lRes.value.data.length > 0) {
          setLeaders(lRes.value.data);
        }
        if (dRes.status === "fulfilled" && dRes.value.data && dRes.value.data.length > 0) {
          setDiscipulos(dRes.value.data);
        }
        if (pRes.status === "fulfilled" && pRes.value.data && pRes.value.data.length > 0) {
          setProgreso(pRes.value.data);
        }
      } catch (err) {
        console.warn("Using offline/pre-loaded Discipulando dataset", err);
      }
    }
    loadLiveData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick lookup maps
  const redesMap = useMemo(() => new Map(redes.map((r) => [r.id, r])), [redes]);
  const casasMap = useMemo(() => new Map(casas.map((c) => [c.id, c])), [casas]);
  const leadersMap = useMemo(() => new Map(leaders.map((l) => [l.id, l])), [leaders]);

  // Houses filtered by red
  const casasFiltradas = useMemo(() => {
    if (filterRed === "all") return casas;
    return casas.filter((c) => c.red_id === filterRed);
  }, [casas, filterRed]);

  // Filtered discipulos
  const filteredDiscipulos = useMemo(() => {
    return discipulos.filter((d) => {
      const casa = casasMap.get(d.casa_de_paz_id);
      const redId = casa?.red_id;

      if (filterRed !== "all" && redId !== filterRed) return false;
      if (filterCasa !== "all" && d.casa_de_paz_id !== filterCasa) return false;
      if (filterLider !== "all" && d.lider_id !== filterLider) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;

      if (search) {
        const query = search.toLowerCase();
        const discName = (d.full_name || "").toLowerCase();
        const casaName = (casa?.name || "").toLowerCase();
        const liderName = (leadersMap.get(d.lider_id)?.full_name || "").toLowerCase();
        if (!discName.includes(query) && !casaName.includes(query) && !liderName.includes(query)) {
          return false;
        }
      }

      if (filterSemaforo !== "all") {
        const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
        const sem = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });
        if (sem !== filterSemaforo) return false;
      }

      return true;
    });
  }, [discipulos, casasMap, leadersMap, progreso, search, filterRed, filterCasa, filterLider, filterStatus, filterSemaforo]);

  // Stats calculation
  const stats = useMemo(() => {
    const counts: Record<SemaforoColor, number> = { verde: 0, amarillo: 0, rojo: 0, gris: 0, azul: 0 };
    discipulos.forEach((d) => {
      const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
      const c = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });
      counts[c]++;
    });
    return counts;
  }, [discipulos, progreso]);

  // Grouping by Red -> Casa -> Leader -> Discipulos for Hierarchy tab
  const hierarchy = useMemo(() => {
    const leaderDiscMap = new Map<string, any[]>();
    filteredDiscipulos.forEach((d) => {
      const arr = leaderDiscMap.get(d.lider_id) || [];
      arr.push(d);
      leaderDiscMap.set(d.lider_id, arr);
    });

    const result: any[] = [];
    const usedLeaders = new Set<string>();

    const targetRedes = filterRed !== "all" ? redes.filter((r) => r.id === filterRed) : redes;

    targetRedes.forEach((red) => {
      const redCasas = casas.filter((c) => c.red_id === red.id);
      const redData: any = { ...red, casas: [] };

      redCasas.forEach((casa) => {
        const casaLeaders = leaders.filter((l) => l.casa_de_paz_id === casa.id);
        const casaData: any = { ...casa, leaders: [] };

        casaLeaders.forEach((leader) => {
          const discs = leaderDiscMap.get(leader.id) || [];
          if (discs.length > 0 || filterRed !== "all") {
            casaData.leaders.push({ ...leader, discipulos: discs });
            usedLeaders.add(leader.id);
          }
        });

        if (casaData.leaders.length > 0) {
          redData.casas.push(casaData);
        }
      });

      if (redData.casas.length > 0) {
        result.push(redData);
      }
    });

    // Unassigned leaders
    const unassignedLeaders = leaders.filter((l) => !usedLeaders.has(l.id));
    const unassignedWithDiscs = unassignedLeaders
      .map((l) => ({ ...l, discipulos: leaderDiscMap.get(l.id) || [] }))
      .filter((l) => l.discipulos.length > 0);

    return { redes: result, unassigned: unassignedWithDiscs };
  }, [redes, casas, leaders, filteredDiscipulos, filterRed]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" /> Discipulando Naciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de seguimiento integral y desarrollo de discípulos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openExtDiscipulando()} className="gap-2">
            <ExternalLink size={15} /> Abrir App Externa
          </Button>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{discipulos.length}</div>
              <div className="text-xs text-muted-foreground">Discípulos</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{casas.length}</div>
              <div className="text-xs text-muted-foreground">Casas de Paz</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{redes.length}</div>
              <div className="text-xs text-muted-foreground">Redes</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{leaders.length}</div>
              <div className="text-xs text-muted-foreground">Líderes</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{stats.amarillo + stats.rojo}</div>
              <div className="text-xs text-muted-foreground">Requieren Atención</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{stats.verde}</div>
              <div className="text-xs text-muted-foreground">Al Día</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Semáforo quick filter bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(["verde", "amarillo", "rojo", "gris", "azul"] as SemaforoColor[]).map((c) => (
          <Button
            key={c}
            variant={filterSemaforo === c ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterSemaforo(filterSemaforo === c ? "all" : c)}
            className="flex items-center justify-between px-3 py-2 h-auto text-xs"
          >
            <div className="flex items-center gap-2">
              <SemaforoDot color={c} size="md" />
              <span className="capitalize font-medium">
                {c === "verde" ? "Al día" : c === "amarillo" ? "Atención" : c === "rojo" ? "Crítico" : c === "gris" ? "Pausa" : "Completo"}
              </span>
            </div>
            <Badge variant="secondary" className="ml-2 font-bold">
              {stats[c]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="discipulos" className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="discipulos" className="gap-2">
              <Users size={16} /> Listado de Discípulos ({filteredDiscipulos.length})
            </TabsTrigger>
            <TabsTrigger value="jerarquia" className="gap-2">
              <Network size={16} /> Estructura por Redes
            </TabsTrigger>
            <TabsTrigger value="casas" className="gap-2">
              <Home size={16} /> Casas de Paz ({casas.length})
            </TabsTrigger>
            <TabsTrigger value="redes" className="gap-2">
              <Network size={16} /> Redes ({redes.length})
            </TabsTrigger>
          </TabsList>

          {filterSemaforo !== "all" && (
            <Badge variant="outline" className="cursor-pointer gap-1" onClick={() => setFilterSemaforo("all")}>
              Filtro semáforo: <span className="capitalize font-bold">{filterSemaforo}</span> ✕
            </Badge>
          )}
        </div>

        {/* TAB 1: DISCIPULOS LIST */}
        <TabsContent value="discipulos" className="space-y-4 pt-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de discípulo, casa o líder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterRed} onValueChange={(val) => { setFilterRed(val); setFilterCasa("all"); }}>
              <SelectTrigger><SelectValue placeholder="Todas las redes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las redes</SelectItem>
                {redes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCasa} onValueChange={setFilterCasa}>
              <SelectTrigger><SelectValue placeholder="Todas las casas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las casas</SelectItem>
                {casasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="En pausa">En pausa</SelectItem>
                <SelectItem value="Completado">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Discípulos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiscipulos.map((d) => {
              const casa = casasMap.get(d.casa_de_paz_id);
              const red = casa ? redesMap.get(casa.red_id) : null;
              const lider = leadersMap.get(d.lider_id);
              const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
              const colorSem = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });

              // Completed stages count
              const completedCount = discProgreso.filter((p) => p.completed).length;

              return (
                <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      colorSem === "verde"
                        ? "bg-emerald-500"
                        : colorSem === "amarillo"
                        ? "bg-amber-500"
                        : colorSem === "rojo"
                        ? "bg-rose-500"
                        : colorSem === "azul"
                        ? "bg-blue-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {d.full_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <UserCheck size={12} className="text-primary" /> Líder: <span className="font-medium text-foreground">{lider?.full_name || "Sin asignar"}</span>
                        </p>
                      </div>
                      <SemaforoDot color={colorSem} size="md" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">CASA DE PAZ</span>
                        <span className="font-semibold text-foreground truncate block">{casa?.name || "Sin casa"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">RED</span>
                        <span className="font-semibold text-foreground truncate block">{red?.name || "Sin red"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-primary" />
                        <span className="text-muted-foreground">Progreso Etapas:</span>
                        <span className="font-bold text-foreground">{completedCount} / {etapas.length}</span>
                      </div>
                      <Badge
                        variant={d.status === "Activo" ? "default" : d.status === "Completado" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {d.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredDiscipulos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed p-6">
              No se encontraron discípulos que coincidan con la búsqueda o filtros aplicados.
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HIERARCHY (RED -> CASA -> LIDER -> DISCIPULOS) */}
        <TabsContent value="jerarquia" className="space-y-6 pt-4">
          {hierarchy.redes.map((red: any) => (
            <Card key={red.id} className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-bold">Red: {red.name}</CardTitle>
                    {red.lider_red && <span className="text-xs text-muted-foreground">({red.lider_red})</span>}
                  </div>
                  <Badge variant="secondary">{red.casas.length} Casas de Paz</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {red.casas.map((casa: any) => (
                  <div key={casa.id} className="border rounded-lg p-3 bg-card space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Home size={16} className="text-emerald-600" />
                        <span className="font-semibold text-sm">{casa.name}</span>
                        {casa.city && <span className="text-xs text-muted-foreground">({casa.city})</span>}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {casa.leaders.reduce((sum: number, l: any) => sum + l.discipulos.length, 0)} discípulos
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pl-2">
                      {casa.leaders.map((leader: any) => (
                        <div key={leader.id} className="bg-muted/30 p-2.5 rounded-md space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-xs flex items-center gap-1.5">
                              <Users size={13} className="text-primary" /> {leader.full_name}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {leader.discipulos.length}
                            </Badge>
                          </div>
                          <div className="pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                            {leader.discipulos.map((d: any) => (
                              <div key={d.id} className="truncate hover:text-foreground">
                                • {d.full_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 3: CASAS DE PAZ */}
        <TabsContent value="casas" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {casas.map((c) => {
              const red = redesMap.get(c.red_id);
              const discCount = discipulos.filter((d) => d.casa_de_paz_id === c.id).length;
              return (
                <Card key={c.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Home size={15} className="text-emerald-600 shrink-0" /> {c.name}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {discCount} disc.
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Red: <span className="font-medium text-foreground">{red?.name || "Sin red"}</span></div>
                      <div>Ciudad: <span className="font-medium text-foreground">{c.city || "N/A"}</span></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 4: REDES */}
        <TabsContent value="redes" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {redes.map((r) => {
              const redCasas = casas.filter((c) => c.red_id === r.id);
              const redDiscs = discipulos.filter((d) => {
                const c = casasMap.get(d.casa_de_paz_id);
                return c?.red_id === r.id;
              });

              return (
                <Card key={r.id} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Network className="h-5 w-5 text-primary" /> {r.name}
                    </CardTitle>
                    {r.lider_red && (
                      <p className="text-xs text-muted-foreground">Líder: {r.lider_red}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-muted/40 p-2 rounded">
                      <span className="text-muted-foreground">Casas de Paz:</span>
                      <span className="font-bold text-foreground">{redCasas.length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-muted/40 p-2 rounded">
                      <span className="text-muted-foreground">Discípulos en Red:</span>
                      <span className="font-bold text-primary">{redDiscs.length}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
