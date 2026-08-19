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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  calcularSemaforo,
  calcularEstadoEtapas,
  ETAPAS_ORDER,
  ETAPAS_LABELS,
  formatDuracion,
  SemaforoColor,
} from "@/modules/discipulado/utils/semaforo";
import { SemaforoDot } from "@/modules/discipulado/components/SemaforoDot";
import { generateRedPdf } from "@/modules/discipulado/utils/generateRedPdf";

import {
  Search,
  Users,
  Home,
  Network,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  Download,
  Layers,
  Check,
} from "lucide-react";
import { useDiscipulando } from "@/hooks/useDiscipulando";
import { toast } from "sonner";

export default function DiscipuladoPage() {
  const { open: openExtDiscipulando } = useDiscipulando();

  // State initialization
  const [redes, setRedes] = useState<any[]>(INITIAL_REDES);
  const [casas, setCasas] = useState<any[]>(INITIAL_CASAS);
  const [leaders, setLeaders] = useState<any[]>(INITIAL_LEADERS);
  const [discipulos, setDiscipulos] = useState<any[]>(INITIAL_DISCIPULOS);
  const [progreso, setProgreso] = useState<any[]>(INITIAL_PROGRESO);
  const [etapas] = useState<any[]>(INITIAL_ETAPAS);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRed, setFilterRed] = useState("all");
  const [filterCasa, setFilterCasa] = useState("all");
  const [filterLider, setFilterLider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSemaforo, setFilterSemaforo] = useState("all");

  // Selected disciple modal
  const [selectedDiscipulo, setSelectedDiscipulo] = useState<any | null>(null);

  // Live Supabase sync fallback
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

        if (rRes.status === "fulfilled" && rRes.value.data && rRes.value.data.length > 0) setRedes(rRes.value.data);
        if (cRes.status === "fulfilled" && cRes.value.data && cRes.value.data.length > 0) setCasas(cRes.value.data);
        if (lRes.status === "fulfilled" && lRes.value.data && lRes.value.data.length > 0) setLeaders(lRes.value.data);
        if (dRes.status === "fulfilled" && dRes.value.data && dRes.value.data.length > 0) setDiscipulos(dRes.value.data);
        if (pRes.status === "fulfilled" && pRes.value.data && pRes.value.data.length > 0) setProgreso(pRes.value.data);
      } catch (err) {
        console.warn("Utilizando dataset pre-cargado de Discipulando Naciones", err);
      }
    }
    loadLiveData();
    return () => { isMounted = false; };
  }, []);

  // Quick Map Lookups
  const redesMap = useMemo(() => new Map(redes.map((r) => [r.id, r])), [redes]);
  const casasMap = useMemo(() => new Map(casas.map((c) => [c.id, c])), [casas]);
  const leadersMap = useMemo(() => new Map(leaders.map((l) => [l.id, l])), [leaders]);

  // Houses filtered by red
  const casasFiltradas = useMemo(() => {
    if (filterRed === "all") return casas;
    return casas.filter((c) => c.red_id === filterRed);
  }, [casas, filterRed]);

  // Discípulos filtered
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

  // Semáforo Stats
  const stats = useMemo(() => {
    const counts: Record<SemaforoColor, number> = { verde: 0, amarillo: 0, rojo: 0, gris: 0, azul: 0 };
    discipulos.forEach((d) => {
      const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
      const c = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });
      counts[c]++;
    });
    return counts;
  }, [discipulos, progreso]);

  // Hierarchy structure (Red -> Casa -> Leader -> Discipulos)
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

    const unassignedLeaders = leaders.filter((l) => !usedLeaders.has(l.id));
    const unassignedWithDiscs = unassignedLeaders
      .map((l) => ({ ...l, discipulos: leaderDiscMap.get(l.id) || [] }))
      .filter((l) => l.discipulos.length > 0);

    return { redes: result, unassigned: unassignedWithDiscs };
  }, [redes, casas, leaders, filteredDiscipulos, filterRed]);

  // Toggle stage completion for local interactive experience
  const handleToggleEtapa = (discipuloId: string, etapaCode: string) => {
    setProgreso((prev) => {
      const index = prev.findIndex((p) => p.discipulo_id === discipuloId && p.etapa_code === etapaCode);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], completed: !updated[index].completed };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            discipulo_id: discipuloId,
            etapa_code: etapaCode,
            completed: true,
            completed_at: new Date().toISOString(),
          },
        ];
      }
    });
    toast.success(`Etapa ${etapaCode} actualizada`);
  };

  // Generate PDF report for selected network
  const handleExportPdf = () => {
    try {
      const redObj = filterRed !== "all" ? redesMap.get(filterRed) : redes[0];
      const redCasas = filterRed !== "all" ? casas.filter((c) => c.red_id === filterRed) : casas;

      const html = generateRedPdf(
        {
          id: filterRed !== "all" ? filterRed : "",
          name: redObj?.name || "Redes Globales",
          lider_red: redObj?.lider_red || "Coordinación General",
        },
        leaders,
        filteredDiscipulos,
        progreso,
        casas
      );
      if (html) {
        import("./../modules/discipulado/utils/generateRedPdf").then(m => {
          m.downloadHtmlAsPdf(html, `Reporte_Red_${redObj?.name || "Global"}.pdf`);
        });
      }
      toast.success("Reporte PDF generado exitosamente");
    } catch (e) {
      toast.error("No se pudo generar el PDF");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* ── DOXA HERO BANNER ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-primary/80 text-primary-foreground p-6 sm:p-8 shadow-xl border border-primary-glow/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-glow/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-semibold text-accent-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Sistema Oficial de Discipulado DOXA
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-tight">
              Discipulando Naciones
            </h1>
            <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed font-sans">
              Seguimiento estratégico del proceso de consolidación, escuelas bíblicas y multiplicación de discípulos en la iglesia local.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExportPdf}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg shadow-accent/20 rounded-xl px-4 gap-2"
            >
              <Download className="h-4 w-4" /> Exportar Reporte PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => openExtDiscipulando()}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur rounded-xl px-4 gap-2"
            >
              <ExternalLink className="h-4 w-4" /> App Externa
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI METRICS CARDS (DOXA Elevate Style) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground">{discipulos.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Discípulos</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground">{casas.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Casas de Paz</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-accent/15 text-accent-foreground shrink-0">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground">{redes.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Redes</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground">{leaders.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Líderes</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground">{stats.amarillo + stats.rojo}</div>
              <div className="text-xs text-muted-foreground font-medium">Atención Pendiente</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground">{stats.verde}</div>
              <div className="text-xs text-muted-foreground font-medium">Al Día</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SEMÁFORO FILTER PILLS ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-card/60 p-3 rounded-2xl border border-border/60 shadow-sm">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
          Estado Semáforo:
        </span>
        {(["verde", "amarillo", "rojo", "gris", "azul"] as SemaforoColor[]).map((c) => {
          const isActive = filterSemaforo === c;
          return (
            <button
              key={c}
              onClick={() => setFilterSemaforo(isActive ? "all" : c)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background/80 text-foreground border-border hover:bg-muted/80"
              }`}
            >
              <SemaforoDot color={c} size="sm" />
              <span className="capitalize">
                {c === "verde" ? "Al día" : c === "amarillo" ? "Atención" : c === "rojo" ? "Crítico" : c === "gris" ? "Pausa" : "Completo"}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-muted/60 text-[11px]">
                {stats[c]}
              </span>
            </button>
          );
        })}
        {filterSemaforo !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterSemaforo("all")}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            Limpiar filtro ✕
          </Button>
        )}
      </div>

      {/* ── MAIN TABS SYSTEM ────────────────────────────────────────── */}
      <Tabs defaultValue="discipulos" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          <TabsList className="bg-muted/70 p-1 rounded-2xl">
            <TabsTrigger value="discipulos" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users size={15} /> Discípulos ({filteredDiscipulos.length})
            </TabsTrigger>
            <TabsTrigger value="jerarquia" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Network size={15} /> Estructura por Redes
            </TabsTrigger>
            <TabsTrigger value="casas" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Home size={15} /> Casas de Paz ({casas.length})
            </TabsTrigger>
            <TabsTrigger value="redes" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Layers size={15} /> Redes ({redes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: LISTADO DE DISCÍPULOS ────────────────────────────── */}
        <TabsContent value="discipulos" className="space-y-6 m-0">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
            <div className="relative lg:col-span-2">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por discípulo, casa o líder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl bg-background border-border/70 text-sm"
              />
            </div>

            <Select value={filterRed} onValueChange={(val) => { setFilterRed(val); setFilterCasa("all"); }}>
              <SelectTrigger className="rounded-xl bg-background border-border/70 text-xs font-medium">
                <SelectValue placeholder="Todas las redes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las redes</SelectItem>
                {redes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCasa} onValueChange={setFilterCasa}>
              <SelectTrigger className="rounded-xl bg-background border-border/70 text-xs font-medium">
                <SelectValue placeholder="Todas las casas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las casas</SelectItem>
                {casasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="rounded-xl bg-background border-border/70 text-xs font-medium">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="En pausa">En pausa</SelectItem>
                <SelectItem value="Completado">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDiscipulos.map((d) => {
              const casa = casasMap.get(d.casa_de_paz_id);
              const red = casa ? redesMap.get(casa.red_id) : null;
              const lider = leadersMap.get(d.lider_id);
              const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
              const colorSem = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });

              const completadas = discProgreso.filter((p) => p.completed).length;
              const porcentaje = Math.round((completadas / ETAPAS_ORDER.length) * 100);

              // Initials for avatar
              const initials = (d.full_name || "")
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <Card
                  key={d.id}
                  onClick={() => setSelectedDiscipulo(d)}
                  className="border-border/70 bg-card hover:bg-card/90 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 rounded-2xl overflow-hidden cursor-pointer group relative"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 transition-all ${
                      colorSem === "verde"
                        ? "bg-emerald-500"
                        : colorSem === "amarillo"
                        ? "bg-amber-500"
                        : colorSem === "rojo"
                        ? "bg-rose-500"
                        : colorSem === "azul"
                        ? "bg-blue-500"
                        : "bg-slate-400"
                    }`}
                  />

                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 border border-primary/20 bg-primary/5 text-primary font-bold">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {d.full_name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Líder: <span className="font-semibold text-foreground">{lider?.full_name || "Sin asignar"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <SemaforoDot color={colorSem} size="md" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl border border-border/40">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Casa de Paz</span>
                        <span className="font-bold text-foreground truncate block">{casa?.name || "Sin casa"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wider">Red</span>
                        <span className="font-bold text-foreground truncate block">{red?.name || "Sin red"}</span>
                      </div>
                    </div>

                    {/* Progress Bar & Etapas Badge Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <BookOpen size={13} className="text-primary" /> Progreso ({completadas}/{ETAPAS_ORDER.length})
                        </span>
                        <span className="font-bold text-foreground">{porcentaje}%</span>
                      </div>
                      <Progress value={porcentaje} className="h-2 rounded-full bg-muted" />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {d.start_date || "Fecha no especificada"}
                      </span>
                      <span className="font-semibold text-primary group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                        Ver Ficha <ChevronRight size={14} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredDiscipulos.length === 0 && (
            <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border p-8 space-y-3">
              <Users className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <h3 className="text-lg font-bold text-foreground">No se encontraron discípulos</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No hay registros que coincidan con la búsqueda o los filtros seleccionados. Intenta ajustar el texto o restablecer los filtros de red.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: ESTRUCTURA POR REDES (HERARCHY) ────────────────────── */}
        <TabsContent value="jerarquia" className="space-y-6 m-0">
          {hierarchy.redes.map((red: any) => (
            <Card key={red.id} className="border-border/70 bg-card rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-border/50 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Network className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold font-display text-foreground">
                        Red: {red.name}
                      </CardTitle>
                      {red.lider_red && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Líder Principal: <span className="font-semibold text-foreground">{red.lider_red}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary">
                    {red.casas.length} Casas de Paz
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {red.casas.map((casa: any) => (
                  <div key={casa.id} className="border border-border/60 rounded-xl p-4 bg-background/50 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <Home size={18} className="text-emerald-600" />
                        <h4 className="text-base font-bold text-foreground">{casa.name}</h4>
                        {casa.city && <span className="text-xs text-muted-foreground">({casa.city})</span>}
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">
                        {casa.leaders.reduce((sum: number, l: any) => sum + l.discipulos.length, 0)} discípulos asignados
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {casa.leaders.map((leader: any) => (
                        <div key={leader.id} className="bg-card p-3.5 rounded-xl border border-border/60 space-y-2">
                          <div className="flex items-center justify-between border-b border-border/30 pb-2">
                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <UserCheck size={14} className="text-primary" /> {leader.full_name}
                            </span>
                            <Badge variant="outline" className="text-[11px] font-bold">
                              {leader.discipulos.length} disc.
                            </Badge>
                          </div>
                          <div className="space-y-1 pt-1">
                            {leader.discipulos.map((d: any) => (
                              <div
                                key={d.id}
                                onClick={() => setSelectedDiscipulo(d)}
                                className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors"
                              >
                                <span className="truncate font-medium text-foreground">{d.full_name}</span>
                                <ChevronRight size={12} className="text-muted-foreground shrink-0" />
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

        {/* ── TAB 3: DIRECTORIO CASAS DE PAZ ─────────────────────────── */}
        <TabsContent value="casas" className="space-y-4 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {casas.map((c) => {
              const red = redesMap.get(c.red_id);
              const discCount = discipulos.filter((d) => d.casa_de_paz_id === c.id).length;
              return (
                <Card key={c.id} className="border-border/70 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                      <Home size={18} />
                    </div>
                    <Badge variant="secondary" className="font-bold text-xs">
                      {discCount} discípulos
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">{c.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Ubicación: {c.city || "No especificada"}</p>
                  </div>
                  <div className="pt-2 border-t border-border/40 text-xs flex justify-between items-center text-muted-foreground">
                    <span>Red perteneciente:</span>
                    <span className="font-semibold text-foreground">{red?.name || "Sin red"}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TAB 4: DIRECTORIO DE REDES ──────────────────────────────── */}
        <TabsContent value="redes" className="space-y-4 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {redes.map((r) => {
              const redCasas = casas.filter((c) => c.red_id === r.id);
              const redDiscs = discipulos.filter((d) => {
                const c = casasMap.get(d.casa_de_paz_id);
                return c?.red_id === r.id;
              });

              return (
                <Card key={r.id} className="border-border/70 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                      <Network className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg font-display text-foreground">{r.name}</h3>
                      {r.lider_red && <p className="text-xs text-muted-foreground">Líder: {r.lider_red}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Casas de Paz</span>
                      <span className="text-xl font-bold text-foreground mt-0.5 block">{redCasas.length}</span>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/40 text-center">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Discípulos en Red</span>
                      <span className="text-xl font-bold text-primary mt-0.5 block">{redDiscs.length}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: FICHA DEL DISCÍPULO (DETALLE E INTERACCIÓN ETAPAS) ──── */}
      {selectedDiscipulo && (
        <Dialog open={!!selectedDiscipulo} onOpenChange={() => setSelectedDiscipulo(null)}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6">
            {(() => {
              const d = selectedDiscipulo;
              const casa = casasMap.get(d.casa_de_paz_id);
              const red = casa ? redesMap.get(casa.red_id) : null;
              const lider = leadersMap.get(d.lider_id);

              const discProgreso = progreso.filter((p) => p.discipulo_id === d.id);
              const estadoEtapas = calcularEstadoEtapas(d.start_date, discProgreso);
              const semaforo = calcularSemaforo({ status: d.status, startDate: d.start_date, progreso: discProgreso });

              const completadasCount = discProgreso.filter((p) => p.completed).length;
              const porcentajeGlobal = Math.round((completadasCount / ETAPAS_ORDER.length) * 100);

              const initials = (d.full_name || "")
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <>
                  <DialogHeader className="space-y-3 pb-2 border-b border-border/60">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-primary/30 text-primary font-bold">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <DialogTitle className="text-xl font-bold font-display text-foreground">
                            {d.full_name}
                          </DialogTitle>
                          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            Ficha de seguimiento de discipulado
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <SemaforoDot color={semaforo} size="lg" />
                        <Badge variant="outline" className="capitalize text-xs font-bold px-3 py-1">
                          {d.status}
                        </Badge>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-3 gap-3 bg-muted/40 p-4 rounded-2xl border border-border/50 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Casa de Paz</span>
                      <span className="font-bold text-foreground text-sm block mt-0.5">{casa?.name || "Sin casa"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Red</span>
                      <span className="font-bold text-foreground text-sm block mt-0.5">{red?.name || "Sin red"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Líder Responsable</span>
                      <span className="font-bold text-foreground text-sm block mt-0.5">{lider?.full_name || "Sin asignar"}</span>
                    </div>
                  </div>

                  {/* Progress Header */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-foreground">Avance General del Sistema</span>
                      <span className="text-primary font-extrabold">{porcentajeGlobal}% ({completadasCount}/{ETAPAS_ORDER.length} etapas)</span>
                    </div>
                    <Progress value={porcentajeGlobal} className="h-2.5 rounded-full" />
                  </div>

                  {/* 8 Etapas Interactive Grid */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BookOpen size={16} className="text-primary" /> Etapas del Discipulado
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {estadoEtapas.map((etapa) => {
                        const label = ETAPAS_LABELS[etapa.code] || etapa.code;
                        const isDone = etapa.completada;

                        return (
                          <div
                            key={etapa.code}
                            onClick={() => handleToggleEtapa(d.id, etapa.code)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isDone
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                                : etapa.vencida
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
                                : "bg-card border-border/70 hover:border-primary/40"
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">
                                  {etapa.code}
                                </Badge>
                                <span className="font-bold text-xs truncate block">{label}</span>
                              </div>
                              <span className="text-[10px] opacity-75 block">
                                Duración: {formatDuracion(etapa.code)}
                              </span>
                            </div>

                            <button
                              type="button"
                              className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isDone
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-border/80 bg-background hover:bg-primary/10"
                              }`}
                            >
                              {isDone && <Check size={12} strokeWidth={3} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
