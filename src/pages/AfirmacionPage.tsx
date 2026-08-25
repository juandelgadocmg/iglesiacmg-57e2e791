import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  INITIAL_REDES,
  INITIAL_CASAS,
  INITIAL_LEADERS,
  INITIAL_DISCIPULOS,
  INITIAL_PROGRESO,
} from "@/data/discipulandoInitialData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Users,
  Home,
  Network,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Download,
  Layers,
  Award,
  Clock,
  Heart,
  TrendingUp,
  Phone,
  PhoneOff,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { ConsolidacionDashboardTab } from "@/components/persona/ConsolidacionDashboardTab";
import { RegistrarLlamadaConsolidacionDialog } from "@/components/persona/RegistrarLlamadaConsolidacionDialog";
import ExportPersonasDialog from "@/components/forms/ExportPersonasDialog";
import { useConsolidacionLlamadas } from "@/hooks/useConsolidacionLlamadas";

const normName = (s: string) =>
  (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function AfirmacionPage() {
  // State initialization
  const [redes, setRedes] = useState<any[]>(INITIAL_REDES);
  const [casas, setCasas] = useState<any[]>(INITIAL_CASAS);
  const [leaders, setLeaders] = useState<any[]>(INITIAL_LEADERS);
  const [discipulos, setDiscipulos] = useState<any[]>(INITIAL_DISCIPULOS);
  const [realPersonas, setRealPersonas] = useState<any[]>([]);
  const [personasPhoneMap, setPersonasPhoneMap] = useState<Map<string, string>>(new Map());
  const [progreso, setProgreso] = useState<any[]>(INITIAL_PROGRESO);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRed, setFilterRed] = useState("all");
  const [filterCasa, setFilterCasa] = useState("all");

  const [openRegistrarDialog, setOpenRegistrarDialog] = useState(false);
  const { stats } = useConsolidacionLlamadas();

  // Fetch Supabase sync fallback
  useEffect(() => {
    let isMounted = true;
    async function loadLiveData() {
      try {
        const [rRes, cRes, lRes, dRes, pRes, personasRes] = await Promise.allSettled([
          supabase.from("redes" as any).select("*").order("name"),
          supabase.from("casas_de_paz" as any).select("*, redes(name)").order("name"),
          supabase.from("leaders" as any).select("id, full_name, casa_de_paz_id").order("full_name"),
          supabase.from("discipulos" as any).select("*").order("full_name"),
          supabase.from("progreso_discipulo" as any).select("*"),
          supabase.from("personas").select("id, nombres, apellidos, telefono, whatsapp").order("nombres"),
        ]);

        if (!isMounted) return;

        if (rRes.status === "fulfilled" && rRes.value.data && rRes.value.data.length > 0) setRedes(rRes.value.data);
        if (cRes.status === "fulfilled" && cRes.value.data && cRes.value.data.length > 0) setCasas(cRes.value.data);
        if (lRes.status === "fulfilled" && lRes.value.data && lRes.value.data.length > 0) setLeaders(lRes.value.data);
        if (dRes.status === "fulfilled" && dRes.value.data && dRes.value.data.length > 0) setDiscipulos(dRes.value.data);
        if (pRes.status === "fulfilled" && pRes.value.data && pRes.value.data.length > 0) setProgreso(pRes.value.data);

        if (personasRes.status === "fulfilled" && personasRes.value.data) {
          const map = new Map<string, string>();
          const fetchedRealPersonas: any[] = [];
          personasRes.value.data.forEach((p: any) => {
            const name = `${p.nombres || ""} ${p.apellidos || ""}`.trim();
            const phoneNum = p.telefono || p.whatsapp;
            if (name && phoneNum) {
              map.set(normName(name), phoneNum);
            }
            if (name) {
              fetchedRealPersonas.push({
                id: p.id,
                full_name: name,
                telefono: p.telefono,
                whatsapp: p.whatsapp,
                phone: p.telefono || p.whatsapp,
              });
            }
          });
          setPersonasPhoneMap(map);
          if (fetchedRealPersonas.length > 0) {
            setRealPersonas(fetchedRealPersonas);
          }
        }
      } catch (err) {
        console.warn("Using local fallback state for Afirmación:", err);
      }
    }
    loadLiveData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Merged and Filtered list
  const combinedPeople = useMemo(() => {
    const list = [...discipulos];
    const existingNames = new Set(list.map((d) => normName(d.full_name || "")));

    realPersonas.forEach((rp) => {
      if (!existingNames.has(normName(rp.full_name))) {
        list.push(rp);
      }
    });

    return list;
  }, [discipulos, realPersonas]);

  const filteredDiscipulos = useMemo(() => {
    const s = search.toLowerCase().trim();
    return combinedPeople.filter((d) => {
      const name = d.full_name || "";
      const phone = d.phone || d.telefono || d.whatsapp || personasPhoneMap.get(normName(name)) || "";
      const matchSearch =
        !s ||
        name.toLowerCase().includes(s) ||
        phone.includes(s);
      return matchSearch;
    });
  }, [combinedPeople, search, personasPhoneMap]);

  return (
    <div className="space-y-8 pb-10">
      {/* ── HERO BANNER AFIRMACIÓN ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-emerald-900 text-primary-foreground p-6 sm:p-8 shadow-xl border border-primary-glow/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Módulo de Afirmación y Consolidación
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-tight">
              Afirmación del Creyente
            </h1>
            <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed font-sans">
              Proceso estratégico de Consolidación (45 Días), seguimiento de llamadas estandarizadas y acompañamiento constante a los nuevos creyentes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setOpenRegistrarDialog(true)}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold shadow-lg rounded-xl px-4 gap-2"
            >
              <PhoneCall className="h-4 w-4" /> Registrar Llamada
            </Button>
            <ExportPersonasDialog
              trigger={
                <Button
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur rounded-xl px-4 gap-2 font-semibold"
                >
                  <Download className="h-4 w-4" /> Informe de Consolidación
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* ── KPI METRICS SUMMARY ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold">{stats.personasEntregadasAlConsolidador}</div>
              <div className="text-xs text-muted-foreground font-medium">Entregadas a Consolidador</div>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-emerald-600">{stats.personasEntregadas45Dias}</div>
              <div className="text-xs text-muted-foreground font-medium">Entregadas a los 45 Días</div>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-sky-600">{stats.tasaEfectividad}%</div>
              <div className="text-xs text-muted-foreground font-medium">Efectividad de Llamadas</div>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-extrabold">{stats.totalLlamadas}</div>
              <div className="text-xs text-muted-foreground font-medium">Llamadas Registradas</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── MAIN TABS SYSTEM ────────────────────────────────────────── */}
      <Tabs defaultValue="consolidacion" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          <TabsList className="bg-muted/70 p-1 rounded-2xl">
            <TabsTrigger value="consolidacion" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <PhoneCall size={15} /> Consolidación (45 Días)
            </TabsTrigger>
            <TabsTrigger value="personas" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users size={15} /> Personas en Afirmación ({filteredDiscipulos.length})
            </TabsTrigger>
            <TabsTrigger value="jerarquia" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Network size={15} /> Estructura por Redes
            </TabsTrigger>
            <TabsTrigger value="casas" className="rounded-xl px-4 py-2 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Home size={15} /> Casas de Paz ({casas.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: CONSOLIDACIÓN & LLAMADAS */}
        <TabsContent value="consolidacion" className="space-y-6 m-0">
          <ConsolidacionDashboardTab />
        </TabsContent>

        {/* TAB 2: PERSONAS EN AFIRMACIÓN */}
        <TabsContent value="personas" className="space-y-6 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
            <div className="relative sm:col-span-2">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl bg-background border-border/70 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiscipulos.map((d) => {
              const name = d.full_name || `${d.nombres || ''} ${d.apellidos || ''}`.trim();
              const phone = d.phone || d.telefono || d.whatsapp || personasPhoneMap.get(normName(name)) || null;
              const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

              return (
                <Card key={d.id} className="p-4 rounded-2xl border hover:shadow-md transition-all bg-card/90">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-primary/20 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {name.slice(0, 2).toUpperCase() || "AF"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-bold text-sm truncate text-foreground">{name}</h3>
                      {phone ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <a
                            href={`tel:${phone}`}
                            className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-primary transition-colors"
                            title="Llamar"
                          >
                            <Phone className="h-3.5 w-3.5 text-primary" /> {phone}
                          </a>
                          {cleanPhone.length >= 7 && (
                            <a
                              href={`https://wa.me/${cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded-full transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageSquare className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/80 italic flex items-center gap-1">
                          <PhoneOff className="h-3 w-3 text-muted-foreground/50" /> Sin teléfono registrado
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shrink-0 font-medium">
                      Afirmación
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: JERARQUÍA */}
        <TabsContent value="jerarquia" className="space-y-6 m-0">
          <Card className="p-6">
            <h3 className="text-base font-bold mb-2">Estructura por Redes de Afirmación</h3>
            <p className="text-xs text-muted-foreground">
              Coordinación por redes para el acompañamiento y supervisión de los consolidadores.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {redes.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border bg-muted/30">
                  <div className="text-sm font-bold">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Líder: {r.lider_red || "Coordinación"}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: CASAS DE PAZ */}
        <TabsContent value="casas" className="space-y-6 m-0">
          <Card className="p-6">
            <h3 className="text-base font-bold mb-2">Casas de Paz y Anfitriones</h3>
            <p className="text-xs text-muted-foreground">
              Puntos de encuentro y afirmación en los hogares de la ciudad.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {casas.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border bg-card">
                  <div className="text-sm font-bold flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" /> {c.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{c.anfitrion || "Anfitrión asignado"}</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <RegistrarLlamadaConsolidacionDialog
        open={openRegistrarDialog}
        onOpenChange={setOpenRegistrarDialog}
      />
    </div>
  );
}
