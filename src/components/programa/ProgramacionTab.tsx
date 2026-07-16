import { useState, useMemo } from "react";
import { LayoutDashboard, Calendar, Users, Briefcase, BarChart3, CalendarClock } from "lucide-react";
import SectionHero from "@/components/shell/SectionHero";
import DashboardProgPanel from "./DashboardProgPanel";
import CalendarioPanel from "./CalendarioPanel";
import MinisteriosPanel from "./MinisteriosPanel";
import ServidoresPanel from "./ServidoresPanel";
import ReportesProgPanel from "./ReportesProgPanel";
import EventoDetailPanel from "./EventoDetailPanel";
import { useProgEventos, useDeleteEvento } from "@/hooks/usePrograma";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { id: "calendario",  label: "Calendario",  icon: Calendar },
  { id: "ministerios", label: "Ministerios", icon: Briefcase },
  { id: "servidores",  label: "Servidores",  icon: Users },
  { id: "reportes",    label: "Reportes",    icon: BarChart3 },
];

export default function ProgramacionTab() {
  const [tab, setTab] = useState("dashboard");
  const [openEventoId, setOpenEventoId] = useState<string | null>(null);
  const { data: eventos = [] } = useProgEventos();
  const delEv = useDeleteEvento();

  const stats = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const futuros = eventos.filter((e: any) => (e.fecha || "") >= hoy).length;
    return [
      { label: "Eventos", value: eventos.length, tone: "info" as const },
      { label: "Próximos", value: futuros, tone: "ok" as const },
      { label: "Pasados", value: Math.max(0, eventos.length - futuros) },
      { label: "Vista", value: TABS.find(t => t.id === tab)?.label ?? "—" },
    ];
  }, [eventos, tab]);

  if (openEventoId) {
    const ev = eventos.find((e) => e.id === openEventoId);
    if (ev) return <EventoDetailPanel evento={ev} onBack={() => setOpenEventoId(null)} onDelete={() => { delEv.mutate(ev.id); setOpenEventoId(null); }} />;
  }

  return (
    <div className="space-y-4">
      <SectionHero
        icon={CalendarClock}
        eyebrow="Worship Ops · Scheduling"
        title="Programación ministerial"
        description="Planifica servicios, asigna equipos, gestiona reemplazos y publica el calendario de la iglesia."
        gradient="from-blue-700 via-indigo-600 to-violet-500"
        stats={stats}
      />

      {/* Pill tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl border bg-card/60 w-fit">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardProgPanel onOpenEvento={setOpenEventoId} />}
      {tab === "calendario" && <CalendarioPanel />}
      {tab === "ministerios" && <MinisteriosPanel />}
      {tab === "servidores" && <ServidoresPanel />}
      {tab === "reportes" && <ReportesProgPanel />}
    </div>
  );
}
