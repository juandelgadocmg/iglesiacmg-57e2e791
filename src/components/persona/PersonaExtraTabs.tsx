import { useMemo, useState, useEffect } from "react";
import { format, isAfter, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Target, HandHeart, Heart, TrendingUp, TrendingDown, Church, Users,
  Calendar, ClipboardCheck, FileText, Layers, Upload, MessageSquareText,
  CheckCircle2, Clock, Award, Sparkles, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";

/* =========================================================
   SEGUIMIENTO — resumen pastoral (peticiones, consejería, salud)
   ========================================================= */
import { useConsolidacionLlamadas } from "@/hooks/useConsolidacionLlamadas";
import { RegistrarLlamadaConsolidacionDialog } from "./RegistrarLlamadaConsolidacionDialog";
import { PhoneCall, Plus } from "lucide-react";

export function SeguimientoTab({
  persona, peticiones = [], consejerias = [], progresoPct, asistenciaPct,
}: any) {
  const abiertas = peticiones.filter((p: any) => p.estado !== "cerrada").length;
  const consejeriasCount = consejerias.length;
  const trendUp = asistenciaPct >= 70;
  const [openCallModal, setOpenCallModal] = useState(false);

  const { llamadas } = useConsolidacionLlamadas(persona?.id);

  const salud = useMemo(() => {
    const s = Math.round((progresoPct * 0.5) + (asistenciaPct * 0.5));
    if (s >= 80) return { pct: s, label: "Excelente", tone: "text-emerald-600", bg: "bg-emerald-500" };
    if (s >= 55) return { pct: s, label: "Saludable", tone: "text-primary", bg: "bg-primary" };
    if (s >= 30) return { pct: s, label: "En riesgo", tone: "text-amber-600", bg: "bg-amber-500" };
    return { pct: s, label: "Atención urgente", tone: "text-rose-600", bg: "bg-rose-500" };
  }, [progresoPct, asistenciaPct]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Salud pastoral */}
      <Card className="lg:col-span-2 overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            <Target className="h-3.5 w-3.5" /> Índice de salud pastoral
          </div>
          <div className="flex items-end gap-3">
            <div className={cn("text-5xl font-bold tabular-nums", salud.tone)}>{salud.pct}%</div>
            <div className={cn("text-lg font-semibold mb-1", salud.tone)}>{salud.label}</div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full transition-all", salud.bg)} style={{ width: `${salud.pct}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border bg-card">
              <div className="text-xs uppercase text-muted-foreground font-semibold">Discipulado</div>
              <div className="text-xl font-bold mt-1">{progresoPct}%</div>
              <Progress value={progresoPct} className="h-1 mt-2" />
            </div>
            <div className="p-3 rounded-xl border bg-card">
              <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
                Asistencia
                {trendUp ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-rose-500" />}
              </div>
              <div className="text-xl font-bold mt-1">{asistenciaPct}%</div>
              <Progress value={asistenciaPct} className="h-1 mt-2" />
            </div>
          </div>
        </div>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="space-y-3">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-card border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <PhoneCall className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold">Llamadas Consolidación</div>
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setOpenCallModal(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar
            </Button>
          </div>
          <div className="text-2xl font-bold">{llamadas.length}</div>
          <p className="text-xs text-muted-foreground">llamadas codificadas</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-500/8 to-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <HandHeart className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold">Peticiones activas</div>
          </div>
          <div className="text-2xl font-bold">{abiertas}</div>
          <p className="text-xs text-muted-foreground">de {peticiones.length} totales</p>
        </Card>
      </div>

      {/* Historial de Llamadas de Consolidación */}
      <Card className="lg:col-span-3 p-5">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" /> Llamadas y Gestión de Consolidación
          </CardTitle>
          <Button size="sm" onClick={() => setOpenCallModal(true)} className="gap-1.5 font-bold">
            <Plus className="h-3.5 w-3.5" /> Registrar Llamada
          </Button>
        </div>

        {llamadas.length === 0 ? (
          <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20">
            <PhoneCall className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium">Sin llamadas registradas para este discípulo</p>
            <Button size="sm" variant="outline" className="mt-2 text-xs gap-1" onClick={() => setOpenCallModal(true)}>
              <Plus className="h-3 w-3" /> Registrar primera llamada
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {llamadas.map((ll) => (
              <div key={ll.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-semibold text-xs bg-primary/10 text-primary border-primary/30">
                      {ll.codificacion}
                    </Badge>
                    {ll.completo_45_dias && (
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        🎉 45 Días Completados
                      </Badge>
                    )}
                  </div>
                  {ll.observacion && (
                    <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md border">
                      {ll.observacion}
                    </p>
                  )}
                  <div className="text-[11px] text-muted-foreground">
                    Consolidador: {ll.consolidador_email || "Sistema"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {format(parseISO(ll.fecha_llamada), "dd MMM yyyy · HH:mm", { locale: es })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Peticiones listado */}
      <Card className="lg:col-span-2 p-5">
        <CardTitle className="text-base flex items-center gap-2 mb-3">
          <HandHeart className="h-4 w-4 text-primary" /> Peticiones y seguimiento
        </CardTitle>
        {peticiones.length === 0 ? (
          <EmptyPastoral text="Sin peticiones registradas." icon={HandHeart} />
        ) : (
          <ul className="divide-y">
            {peticiones.slice(0, 8).map((p: any) => (
              <li key={p.id} className="py-2.5 flex items-start gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-2 shrink-0",
                  p.estado === "cerrada" ? "bg-muted-foreground/40" : "bg-rose-500"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.titulo || p.descripcion?.slice(0, 60) || "Sin título"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.fecha_creacion ? format(parseISO(p.fecha_creacion), "d MMM yyyy", { locale: es }) : ""} · {p.estado || "abierta"}
                  </div>
                </div>
                <Badge variant={p.estado === "cerrada" ? "secondary" : "outline"} className="text-xs">
                  {p.estado || "abierta"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Consejerías listado */}
      <Card className="p-5">
        <CardTitle className="text-base flex items-center gap-2 mb-3">
          <MessageSquareText className="h-4 w-4 text-primary" /> Consejerías
        </CardTitle>
        {consejerias.length === 0 ? (
          <EmptyPastoral text="Sin consejerías registradas." icon={MessageSquareText} />
        ) : (
          <ul className="space-y-2.5">
            {consejerias.slice(0, 6).map((c: any) => (
              <li key={c.id} className="p-2.5 rounded-lg border bg-muted/30">
                <div className="text-sm font-medium">{c.tipo || "Consejería"}</div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5">
                  {c.fecha ? format(parseISO(c.fecha), "d MMM yyyy", { locale: es }) : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Modal Registrar Llamada */}
      <RegistrarLlamadaConsolidacionDialog
        open={openCallModal}
        onOpenChange={setOpenCallModal}
        persona={persona}
      />
    </div>
  );
}

/* =========================================================
   MINISTERIOS — roles y áreas de servicio
   ========================================================= */
export function MinisteriosTab({ persona, tipos = [], grupoMiembros = [] }: any) {
  const ministeriosMap: Record<string, { color: string; desc: string }> = {
    "Líder": { color: "from-primary/20 to-primary/5", desc: "Liderazgo pastoral" },
    "Servidor": { color: "from-emerald-500/20 to-emerald-500/5", desc: "Área de servicio" },
    "Maestro Seminario": { color: "from-accent/20 to-accent/5", desc: "Enseñanza académica" },
    "Líder Casa de Paz": { color: "from-primary/20 to-primary/5", desc: "Anfitrión Casa de Paz" },
    "Líder de Red": { color: "from-accent/20 to-accent/5", desc: "Coordinación de red" },
    "Discípulo": { color: "from-amber-500/20 to-amber-500/5", desc: "Discipulado activo" },
    "CDP": { color: "from-emerald-500/20 to-emerald-500/5", desc: "Casa de paz" },
  };

  const ministerios = tipos.filter((t: string) => t !== "Miembro" && t !== "Visitante");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ministerios.length === 0 ? (
        <div className="md:col-span-2 lg:col-span-3">
          <EmptyState
            icon={Church}
            title="Sin ministerios asignados"
            description="Aún no participa en un área ministerial. Edita el perfil para asignar tipos."
          />
        </div>
      ) : (

        ministerios.map((tipo: string) => {
          const meta = ministeriosMap[tipo] || { color: "from-muted to-card", desc: "Servicio ministerial" };
          return (
            <Card key={tipo} className={cn("p-5 bg-gradient-to-br border overflow-hidden relative", meta.color)}>
              <div className="w-10 h-10 rounded-xl bg-card border shadow-sm flex items-center justify-center mb-3">
                <Church className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-bold">{tipo}</h3>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">{meta.desc}</p>
              <div className="mt-3 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Activo</span>
              </div>
            </Card>
          );
        })
      )}

      {grupoMiembros.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3 p-5">
          <CardTitle className="text-base flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" /> Grupos donde sirve
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {grupoMiembros.map((gm: any) => (
              <div key={gm.id} className="p-3 rounded-lg border bg-muted/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{gm.grupos?.nombre || "—"}</div>
                  <div className="text-[10.5px] text-muted-foreground truncate">
                    {gm.rol || "Miembro"} · {gm.grupos?.tipo || ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========================================================
   PRÓXIMAS REUNIONES — servicios/reuniones futuros
   ========================================================= */
export function ProximasReunionesTab({ servicios = [], grupoMiembros = [], onRegistrar }: any) {
  const now = new Date();
  const proximos = useMemo(() => {
    return servicios
      .map((s: any) => ({ ...s, _date: s.fecha ? parseISO(s.fecha) : null }))
      .filter((s: any) => s._date && isAfter(s._date, now))
      .sort((a: any, b: any) => a._date.getTime() - b._date.getTime())
      .slice(0, 12);
  }, [servicios]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 p-5">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Próximas reuniones
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRegistrar}>
            <ClipboardCheck className="h-3.5 w-3.5" /> Registrar asistencia
          </Button>
        </div>
        {proximos.length === 0 ? (
          <EmptyPastoral text="Sin reuniones programadas." icon={Calendar} />
        ) : (
          <div className="space-y-2">
            {proximos.map((s: any) => {
              const days = Math.round((s._date.getTime() - now.getTime()) / 86400000);
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border hover:border-primary/40 hover:bg-muted/30 transition-all">
                  <div className="w-12 text-center shrink-0">
                    <div className="text-[9.5px] uppercase text-muted-foreground leading-none">
                      {format(s._date, "MMM", { locale: es })}
                    </div>
                    <div className="text-xl font-bold leading-none mt-1">{format(s._date, "dd")}</div>
                    <div className="text-xs text-muted-foreground mt-1">{format(s._date, "EEE", { locale: es })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">{s.nombre}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      {s.hora && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.hora}</span>}
                      {s.tipo && <span>· {s.tipo}</span>}
                    </div>
                  </div>
                  <Badge variant={days === 0 ? "default" : "secondary"} className="text-xs">
                    {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `en ${days}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5 bg-gradient-to-br from-primary/8 to-card">
        <CardTitle className="text-base flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" /> Reuniones habituales
        </CardTitle>
        {grupoMiembros.length === 0 ? (
          <EmptyPastoral text="No pertenece a ningún grupo con reunión regular." icon={Users} />
        ) : (
          <ul className="space-y-2">
            {grupoMiembros.map((gm: any) => (
              <li key={gm.id} className="p-3 rounded-lg bg-card border">
                <div className="text-sm font-semibold truncate">{gm.grupos?.nombre || "Grupo"}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {gm.grupos?.dia_reunion || "—"} {gm.grupos?.hora_reunion || ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* =========================================================
   NOTAS — anotaciones pastorales (localStorage por ahora)
   ========================================================= */
export function NotasTab({ persona }: any) {
  const storageKey = `persona_notas_${persona.id}`;
  const [notes, setNotes] = useState<Array<{ id: string; text: string; date: string }>>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setNotes(raw ? JSON.parse(raw) : []);
    } catch { setNotes([]); }
  }, [storageKey]);

  const save = (next: typeof notes) => {
    setNotes(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  const addNote = () => {
    if (!draft.trim()) return;
    const n = { id: crypto.randomUUID(), text: draft.trim(), date: new Date().toISOString() };
    save([n, ...notes]);
    setDraft("");
    toast.success("Nota agregada");
  };

  const removeNote = (id: string) => save(notes.filter((n) => n.id !== id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 p-5 h-fit sticky top-16">
        <CardTitle className="text-base flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-primary" /> Nueva nota
        </CardTitle>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Anota una observación pastoral, un pedido de oración, un compromiso adquirido…"
          rows={6}
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">Las notas se guardan localmente en este dispositivo.</p>
          <Button size="sm" onClick={addNote} disabled={!draft.trim()} className="gap-1.5">
            Guardar
          </Button>
        </div>
      </Card>

      <div className="lg:col-span-3 space-y-3">
        {notes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin notas todavía"
            description="Empieza a documentar el acompañamiento pastoral."
          />
        ) : (

          notes.map((n) => (
            <Card key={n.id} className="p-4 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {format(new Date(n.date), "d MMM yyyy · HH:mm", { locale: es })}
                  </div>
                  <p className="text-sm mt-1.5 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                </div>
                <button
                  onClick={() => removeNote(n.id)}
                  className="text-[10.5px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* =========================================================
   ARCHIVOS — repositorio (placeholder profesional)
   ========================================================= */
export function ArchivosTab({ persona }: any) {
  const secciones = [
    { titulo: "Documentos personales", desc: "Cédula, actas, autorizaciones", icon: FileText, color: "from-primary/10 to-card" },
    { titulo: "Certificados", desc: "Bautismo, matrimonio, membresía", icon: Award, color: "from-accent/10 to-card" },
    { titulo: "Multimedia", desc: "Fotos y videos personales", icon: Layers, color: "from-emerald-500/10 to-card" },
  ];
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-primary/8 via-card to-card border-dashed">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Upload className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">Repositorio de archivos</h3>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Este módulo estará disponible próximamente. Podrás subir, organizar y compartir documentos vinculados a cada persona con permisos granulares.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Subir archivo
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {secciones.map((s) => (
          <Card key={s.titulo} className={cn("p-5 bg-gradient-to-br border", s.color)}>
            <div className="w-9 h-9 rounded-xl bg-card border shadow-sm text-primary flex items-center justify-center mb-3">
              <s.icon className="h-4 w-4" />
            </div>
            <h4 className="text-[13.5px] font-semibold">{s.titulo}</h4>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{s.desc}</p>
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10.5px] text-muted-foreground">0 archivos</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyPastoral({ text, icon: Icon }: { text: string; icon: any }) {
  return (
    <div className="py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
