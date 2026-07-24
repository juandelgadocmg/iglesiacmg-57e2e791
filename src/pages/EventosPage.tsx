import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, isAfter, isBefore, isThisMonth, isThisWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import EventoFormDialog from "@/components/forms/EventoFormDialog";
import EventCalendar from "@/components/events/EventCalendar";
import EventoDetailView from "@/components/events/EventoDetailView";
import { useEventos } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ExportDropdown from "@/components/shared/ExportDropdown";
import ShareLinkButton from "@/components/shared/ShareLinkButton";
import {
  Calendar as CalIcon, Rows, LayoutGrid, MapPin, Users, Search, Plus,
  Sparkles, Clock, CheckCircle2, Archive, CircleDot, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type View = "calendar" | "timeline" | "grid";
type Bucket = "proximos" | "semana" | "mes" | "pasados" | "todos";

const TIPO_META: Record<string, { label: string; color: string; bg: string }> = {
  gratuito: { label: "Gratuito", color: "#22c55e", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  cerrado:  { label: "Cerrado",  color: "#ef4444", bg: "bg-rose-50 dark:bg-rose-950/30" },
  abierto:  { label: "Abierto",  color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30" },
};

function normTipo(t: string | null | undefined) {
  const k = (t || "").toLowerCase();
  if (k.includes("grat")) return "gratuito";
  if (k.includes("cerr")) return "cerrado";
  return "abierto";
}

export default function EventosPage() {
  const { data: eventos, isLoading } = useEventos();
  const [selectedEvento, setSelectedEventoState] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const isMobileInit = typeof window !== "undefined" && window.innerWidth < 768;

  const LS_VIEW = "eventos.view";
  const LS_BUCKET = "eventos.bucket";
  const LS_TIPOS = "eventos.tipos";
  const storedView = typeof window !== "undefined" ? (localStorage.getItem(LS_VIEW) as View | null) : null;
  const storedBucket = typeof window !== "undefined" ? (localStorage.getItem(LS_BUCKET) as Bucket | null) : null;
  const storedTipos = typeof window !== "undefined" ? localStorage.getItem(LS_TIPOS) : null;

  const initialView = (searchParams.get("view") as View) ||
    storedView ||
    (isMobileInit ? "timeline" : "calendar");
  const initialBucket = (searchParams.get("bucket") as Bucket) || storedBucket || "proximos";
  const initialQ = searchParams.get("q") || "";
  const initialTipos = searchParams.get("tipos") ?? storedTipos;

  const [view, setView] = useState<View>(initialView);
  const [bucket, setBucket] = useState<Bucket>(initialBucket);
  const [tipos, setTipos] = useState<Set<string>>(
    initialTipos
      ? new Set(initialTipos.split(",").filter(Boolean))
      : new Set(["gratuito", "cerrado", "abierto"])
  );
  const [q, setQ] = useState(initialQ);

  // Persist view/filters so returning from another device restores the same UI
  useEffect(() => { try { localStorage.setItem(LS_VIEW, view); } catch {} }, [view]);
  useEffect(() => { try { localStorage.setItem(LS_BUCKET, bucket); } catch {} }, [bucket]);
  useEffect(() => {
    try { localStorage.setItem(LS_TIPOS, Array.from(tipos).sort().join(",")); } catch {}
  }, [tipos]);

  const setSelectedEvento = (ev: any) => {
    setSelectedEventoState(ev);
    const p = new URLSearchParams(searchParams);
    if (ev?.id) p.set("ev", String(ev.id));
    else p.delete("ev");
    setSearchParams(p, { replace: true });
  };

  // Sync filter state -> URL (shareable across devices)
  useEffect(() => {
    const p = new URLSearchParams();
    if (view !== (isMobileInit ? "timeline" : "calendar")) p.set("view", view);
    if (bucket !== "proximos") p.set("bucket", bucket);
    if (q) p.set("q", q);
    const tiposArr = Array.from(tipos).sort();
    if (tiposArr.length !== 3) p.set("tipos", tiposArr.join(","));
    const evId = searchParams.get("ev");
    if (evId) p.set("ev", evId);
    setSearchParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, bucket, q, tipos]);

  // Restore selected evento from URL once data is loaded / shared link opened
  useEffect(() => {
    const evId = searchParams.get("ev");
    if (!evId) {
      if (selectedEvento) setSelectedEventoState(null);
      return;
    }
    if (selectedEvento?.id === evId) return;
    const found = (eventos || []).find((e: any) => String(e.id) === evId);
    if (found) setSelectedEventoState(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, searchParams]);

  // Scroll persistence — restore window scroll for timeline/grid after data loads
  const scrollKey = `eventos.scroll:${view}|${bucket}|${q}`;
  useEffect(() => {
    if (selectedEvento) return;
    if (view === "calendar") return;
    if (isLoading) return;
    // Prefer explicit ?sy= from a shared link, otherwise fall back to session
    const fromUrl = searchParams.get("sy");
    const stored = fromUrl ?? sessionStorage.getItem(scrollKey);
    const y = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isNaN(y)) {
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, bucket, q, isLoading, selectedEvento]);

  useEffect(() => {
    if (selectedEvento) return;
    if (view === "calendar") return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        try { sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY))); } catch {}
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollKey, view, selectedEvento]);




  const now = new Date();

  const enriched = useMemo(
    () =>
      (eventos || []).map((e) => ({
        ...e,
        _date: e.fecha_inicio ? parseISO(e.fecha_inicio) : null,
        _tipo: normTipo(e.tipo as any),
        inscritosCount: (e as any).inscripciones?.[0]?.count || 0,
      })),
    [eventos]
  );

  const buckets = useMemo(() => {
    const acc = { proximos: 0, semana: 0, mes: 0, pasados: 0, todos: enriched.length };
    for (const e of enriched) {
      if (!e._date) continue;
      if (isAfter(e._date, now)) acc.proximos++;
      if (isThisWeek(e._date, { weekStartsOn: 1 })) acc.semana++;
      if (isThisMonth(e._date)) acc.mes++;
      if (isBefore(e._date, now)) acc.pasados++;
    }
    return acc;
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      if (!tipos.has(e._tipo)) return false;
      if (q && !e.nombre?.toLowerCase().includes(q.toLowerCase())) return false;
      if (!e._date) return bucket === "todos";
      if (bucket === "proximos") return isAfter(e._date, now);
      if (bucket === "semana") return isThisWeek(e._date, { weekStartsOn: 1 });
      if (bucket === "mes") return isThisMonth(e._date);
      if (bucket === "pasados") return isBefore(e._date, now);
      return true;
    }).sort((a, b) => (a._date?.getTime() || 0) - (b._date?.getTime() || 0));
  }, [enriched, tipos, bucket, q]);

  const heroNext = useMemo(
    () => enriched.filter((e) => e._date && isAfter(e._date, now)).sort((a, b) => a._date!.getTime() - b._date!.getTime()).slice(0, 3),
    [enriched]
  );

  const toggleTipo = (t: string) => {
    setTipos((prev) => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (selectedEvento) return <EventoDetailView evento={selectedEvento} onBack={() => setSelectedEvento(null)} />;

  const calendarEvents = filtered.map((e) => ({
    id: e.id, nombre: e.nombre, fecha_inicio: e.fecha_inicio, fecha_fin: e.fecha_fin,
    color: TIPO_META[e._tipo].color, tipo: e.tipo, estado: e.estado,
  }));

  const BUCKETS: { id: Bucket; label: string; icon: any }[] = [
    { id: "proximos", label: "Próximos", icon: Clock },
    { id: "semana", label: "Esta semana", icon: Sparkles },
    { id: "mes", label: "Este mes", icon: CalIcon },
    { id: "pasados", label: "Pasados", icon: Archive },
    { id: "todos", label: "Todos", icon: CircleDot },
  ];

  return (
    <div className="animate-fade-in -m-3 md:-m-6 flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
      {/* Rail izquierdo (desktop) */}
      <aside className="hidden md:flex w-60 shrink-0 border-r bg-card/40 flex-col h-[calc(100vh-3.5rem)] sticky top-14">

        <div className="p-4 border-b">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Agenda</p>
          <h2 className="text-sm font-semibold mt-0.5">Actividades</h2>
        </div>
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar evento…" className="pl-8 h-8 text-[13px]" />
          </div>
        </div>
        <nav className="py-2">
          {BUCKETS.map((b) => {
            const c = (buckets as any)[b.id];
            const active = bucket === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBucket(b.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-muted/60",
                  active && "bg-primary/10 text-primary font-medium"
                )}
              >
                <b.icon className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{b.label}</span>
                <span className="text-[10.5px] text-muted-foreground">{c}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-3 px-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Tipo</p>
          <div className="space-y-1">
            {Object.entries(TIPO_META).map(([k, v]) => (
              <button
                key={k}
                onClick={() => toggleTipo(k)}
                className="w-full flex items-center gap-2 text-[13px] hover:bg-muted/60 rounded-md px-2 py-1.5"
              >
                <span
                  className={cn(
                    "h-3 w-3 rounded-sm border-2",
                    tipos.has(k) ? "border-transparent" : "border-muted-foreground/30"
                  )}
                  style={tipos.has(k) ? { background: v.color } : {}}
                />
                <span className="flex-1 text-left">{v.label}</span>
                <span className="text-[10.5px] text-muted-foreground">
                  {enriched.filter((e) => e._tipo === k).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 p-3 md:p-6 space-y-5">
        {/* Mobile filters (search + bucket chips) */}
        <div className="md:hidden space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar evento…"
              className="pl-9 h-11 text-sm"
              aria-label="Buscar evento"
            />
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory"
            role="tablist"
            aria-label="Filtros de eventos"
          >
            {BUCKETS.map((b) => (
              <button
                key={b.id}
                role="tab"
                aria-selected={bucket === b.id}
                tabIndex={bucket === b.id ? 0 : -1}
                onClick={() => setBucket(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const idx = BUCKETS.findIndex((x) => x.id === bucket);
                    const next = e.key === "ArrowRight"
                      ? BUCKETS[(idx + 1) % BUCKETS.length]
                      : BUCKETS[(idx - 1 + BUCKETS.length) % BUCKETS.length];
                    setBucket(next.id);
                  }
                }}
                className={cn(
                  "shrink-0 snap-start inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-sm border whitespace-nowrap",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  bucket === b.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground"
                )}
              >
                <b.icon className="h-4 w-4" />
                {b.label}
                <span className="opacity-70 text-xs">{(buckets as any)[b.id]}</span>
              </button>
            ))}
          </div>
        </div>


        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              {BUCKETS.find((b) => b.id === bucket)?.label}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {filtered.length} eventos · {buckets.proximos} próximos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5"
              role="tablist"
              aria-label="Modo de vista"
            >
              {[
                { id: "calendar", icon: CalIcon, label: "Calendario" },
                { id: "timeline", icon: Rows, label: "Timeline" },
                { id: "grid", icon: LayoutGrid, label: "Grid" },
              ].map((v) => (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={view === v.id}
                  onClick={() => setView(v.id as View)}
                  className={cn(
                    "inline-flex items-center gap-1.5 min-h-9 md:min-h-8 px-3 rounded-md text-[13px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    view === v.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  )}
                  aria-label={v.label}
                >
                  <v.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>

            <ShareLinkButton
              toastMessage="Enlace de Eventos copiado"
              buildUrl={() => {
                const p = new URLSearchParams();
                p.set("view", view);
                p.set("bucket", bucket);
                if (q) p.set("q", q);
                const t = Array.from(tipos).sort();
                if (t.length !== 3) p.set("tipos", t.join(","));
                const evId = searchParams.get("ev");
                if (evId) p.set("ev", evId);
                const sy = Math.round(window.scrollY);
                if (sy > 0 && view !== "calendar") p.set("sy", String(sy));
                return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
              }}
            />
            <ExportDropdown title="Eventos" filename="eventos" columns={[
              { header: "Nombre", key: "nombre" }, { header: "Tipo", key: "tipo" },
              { header: "Fecha Inicio", key: "fecha_inicio" }, { header: "Lugar", key: "lugar" },
              { header: "Estado", key: "estado" },
            ]} data={filtered} />
            <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nuevo evento
            </Button>
          </div>
        </div>

        {/* Hero — próximos destacados */}
        {bucket === "proximos" && heroNext.length > 0 && view !== "calendar" && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {heroNext.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setSelectedEvento(e)}
                className={cn(
                  "text-left rounded-xl border p-4 hover:shadow-md hover:border-primary/40 transition-all relative overflow-hidden",
                  TIPO_META[e._tipo].bg
                )}
              >
                <span className="absolute top-0 left-0 right-0 h-1" style={{ background: TIPO_META[e._tipo].color }} />
                <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground">
                  {i === 0 && <Sparkles className="h-3 w-3" />}
                  {i === 0 ? "Próximo" : `En ${i + 1}º lugar`}
                </div>
                <h3 className="font-semibold text-[15px] mt-1 line-clamp-2">{e.nombre}</h3>
                <p className="text-[12px] text-muted-foreground mt-2">
                  {e._date ? format(e._date, "EEE d MMM · HH:mm", { locale: es }) : "Sin fecha"}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[11.5px] text-muted-foreground">
                  {e.lugar && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.lugar}</span>}
                  {e.inscritosCount > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.inscritosCount}</span>}
                </div>
              </button>
            ))}
          </section>
        )}

        {/* Vista principal */}
        {view === "calendar" && (
          <EventCalendar
            events={calendarEvents}
            onEventClick={(evt) => {
              const full = enriched.find((e) => e.id === evt.id);
              if (full) setSelectedEvento(full);
            }}
            onNewEvent={() => setShowCreate(true)}
          />
        )}

        {view === "timeline" && (
          <section className="rounded-xl border bg-card divide-y">
            {filtered.length === 0 && (
              <div className="p-10 text-center text-muted-foreground text-sm">Sin eventos en esta vista</div>
            )}
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEvento(e)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 text-left"
              >
                <div className="w-16 text-center shrink-0">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    {e._date ? format(e._date, "MMM", { locale: es }) : "—"}
                  </p>
                  <p className="text-2xl font-bold leading-none">
                    {e._date ? format(e._date, "dd") : "?"}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    {e._date ? format(e._date, "HH:mm") : ""}
                  </p>
                </div>
                <div className="w-1 h-10 rounded-full shrink-0" style={{ background: TIPO_META[e._tipo].color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-[14px]">{e.nombre}</h4>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5" style={{ color: TIPO_META[e._tipo].color, borderColor: TIPO_META[e._tipo].color }}>
                      {TIPO_META[e._tipo].label}
                    </Badge>
                    {e.estado && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{e.estado}</Badge>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[11.5px] text-muted-foreground">
                    {e.lugar && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.lugar}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.inscritosCount} inscritos</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </button>
            ))}
          </section>
        )}

        {view === "grid" && (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground text-sm">Sin eventos en esta vista</div>
            )}
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEvento(e)}
                className="text-left rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
              >
                <div className="h-1.5" style={{ background: TIPO_META[e._tipo].color }} />
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[14px] flex-1">{e.nombre}</h3>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5" style={{ color: TIPO_META[e._tipo].color, borderColor: TIPO_META[e._tipo].color }}>
                      {TIPO_META[e._tipo].label}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {e._date ? format(e._date, "EEE d MMM 'a las' HH:mm", { locale: es }) : "Sin fecha"}
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t text-[11.5px] text-muted-foreground">
                    {e.lugar && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.lugar}</span>}
                    <span className="flex items-center gap-1 ml-auto"><Users className="h-3 w-3" />{e.inscritosCount}</span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        {showCreate && <EventoFormDialog initialData={undefined} onClose={() => setShowCreate(false)} />}
      </div>
    </div>
  );
}
