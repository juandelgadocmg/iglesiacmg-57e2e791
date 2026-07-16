import { useMemo, useRef } from "react";
import { format, parseISO, compareDesc } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2, HandHeart, HeartHandshake, DollarSign,
  Award, Heart, MessageSquare, FileText, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";

export type TimelineEvent = {
  id: string;
  type: "asistencia" | "finanza" | "donacion" | "peticion" | "consejeria" | "proceso" | "observacion" | "certificado";
  date: string; // ISO
  title: string;
  description?: string;
  meta?: string;
  positive?: boolean;
};

const typeConfig: Record<TimelineEvent["type"], { icon: any; bg: string; label: string }> = {
  asistencia: { icon: CheckCircle2, bg: "bg-success/10 text-success", label: "Asistencia" },
  finanza: { icon: DollarSign, bg: "bg-primary/8 text-primary", label: "Finanza" },
  donacion: { icon: Heart, bg: "bg-accent/10 text-accent", label: "Donación" },
  peticion: { icon: HandHeart, bg: "bg-accent/10 text-accent", label: "Petición" },
  consejeria: { icon: HeartHandshake, bg: "bg-info/10 text-info", label: "Consejería" },
  proceso: { icon: Award, bg: "bg-success/10 text-success", label: "Crecimiento" },
  observacion: { icon: MessageSquare, bg: "bg-muted text-muted-foreground", label: "Nota pastoral" },
  certificado: { icon: FileText, bg: "bg-primary/8 text-primary", label: "Certificado" },
};

const VIRTUALIZATION_THRESHOLD = 40;

export default function PersonaActivityTimeline({ events }: { events: TimelineEvent[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date))),
    [events]
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Sin actividad registrada aún</p>
      </div>
    );
  }

  if (sorted.length <= VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" aria-hidden />
        <ul className="space-y-4">
          {sorted.map((e) => <TimelineItem key={`${e.type}-${e.id}`} event={e} />)}
        </ul>
      </div>
    );
  }

  return <VirtualTimeline events={sorted} />;
}

function VirtualTimeline({ events }: { events: TimelineEvent[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 112,
    overscan: 8,
    getItemKey: (i) => `${events[i].type}-${events[i].id}`,
  });

  return (
    <div
      ref={parentRef}
      className="relative rounded-lg border bg-background/60"
      style={{ height: 620, overflow: "auto", contain: "strict" }}
    >
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border pointer-events-none" aria-hidden />
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const e = events[v.index];
          return (
            <div
              key={v.key}
              ref={virtualizer.measureElement}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${v.start}px)`,
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              <TimelineItem event={e} />
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none sticky bottom-0 w-full h-6 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

function TimelineItem({ event: e }: { event: TimelineEvent }) {
  const cfg = typeConfig[e.type];
  const Icon = cfg.icon;
  let dateStr = e.date;
  try { dateStr = format(parseISO(e.date), "d MMM yyyy · HH:mm", { locale: es }); } catch { /* keep raw */ }
  return (
    <div className="relative pl-12">
      <div className={cn("absolute left-0 top-0 h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-background", cfg.bg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="surface-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cfg.label}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{e.title}</p>
            {e.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{e.description}</p>
            )}
            {e.meta && (
              <p className="text-[11px] text-muted-foreground mt-1">{e.meta}</p>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{dateStr}</span>
        </div>
      </div>
    </div>
  );
}
