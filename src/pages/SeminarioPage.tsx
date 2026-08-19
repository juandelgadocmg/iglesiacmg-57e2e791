import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import ModuleHero from "@/components/shell/ModuleHero";
import PageSkeleton from "@/components/shared/PageSkeleton";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useProgramas, usePeriodos, useDocentes } from "@/hooks/useSeminario";
import {
  LayoutDashboard, BookOpen, Layers, FileText, Video, ClipboardCheck,
  BarChart3, UserCheck, Library, Award, Users, FileBarChart2, CalendarClock,
  GraduationCap, ShieldCheck, Settings2, Sparkles,
} from "lucide-react";
import ProgramasSection from "@/components/seminario/ProgramasSection";
import PensumSection from "@/components/seminario/PensumSection";
import MateriasSection from "@/components/seminario/MateriasSection";
import ZoomConfigSection from "@/components/seminario/ZoomConfigSection";
import HorariosSection from "@/components/seminario/HorariosSection";
import EstudiantesSection from "@/components/seminario/EstudiantesSection";
import AuditoriaSection from "@/components/seminario/AuditoriaSection";
import DashboardSection from "@/components/seminario/DashboardSection";
import DocentesSection from "@/components/seminario/DocentesSection";
import EvaluacionesSection from "@/components/seminario/EvaluacionesSection";
import CalificacionesSection from "@/components/seminario/CalificacionesSection";
import AsistenciaSection from "@/components/seminario/AsistenciaSection";
import AulaVirtualSection from "@/components/seminario/AulaVirtualSection";
import BibliotecaSection from "@/components/seminario/BibliotecaSection";
import CertificadosSection from "@/components/seminario/CertificadosSection";
import ReportesSection from "@/components/seminario/ReportesSection";
import MiAulaSection from "@/components/seminario/MiAulaSection";

import TallerNeumatologiaPage from "@/pages/TallerNeumatologiaPage";

type NavItem = { id: string; label: string; icon: any; group: string };

const SIDEBAR: NavItem[] = [
  { id: "dashboard",           label: "Dashboard",           icon: LayoutDashboard, group: "Visión general" },
  { id: "taller-neumatologia", label: "Taller Neumatología", icon: Sparkles,        group: "Académico" },
  { id: "programas",           label: "Programas",           icon: BookOpen,        group: "Académico" },
  { id: "pensum",              label: "Pensum",              icon: Layers,          group: "Académico" },
  { id: "materias",            label: "Materias",            icon: FileText,        group: "Académico" },
  { id: "horarios",            label: "Horarios",            icon: CalendarClock,   group: "Académico" },
  { id: "estudiantes",         label: "Estudiantes",         icon: GraduationCap,   group: "Comunidad" },
  { id: "docentes",            label: "Docentes",            icon: Users,           group: "Comunidad" },
  { id: "aula-virtual",        label: "Aula Virtual",        icon: Video,           group: "Operación" },
  { id: "evaluaciones",        label: "Evaluaciones",        icon: ClipboardCheck,  group: "Operación" },
  { id: "calificaciones",      label: "Calificaciones",      icon: BarChart3,       group: "Operación" },
  { id: "asistencia",          label: "Asistencia",          icon: UserCheck,       group: "Operación" },
  { id: "biblioteca",          label: "Biblioteca",          icon: Library,         group: "Recursos" },
  { id: "certificados",        label: "Certificados",        icon: Award,           group: "Recursos" },
  { id: "reportes",            label: "Reportes",            icon: FileBarChart2,   group: "Analítica" },
  { id: "auditoria",           label: "Auditoría",           icon: ShieldCheck,     group: "Sistema" },
  { id: "zoom-config",         label: "Zoom",                icon: Settings2,       group: "Sistema" },
];

const SECTION_META: Record<string, { title: string; description: string }> = {
  dashboard:            { title: "Dashboard académico",       description: "Métricas en vivo del seminario, promociones y actividad de aula." },
  "taller-neumatologia":{ title: "Taller Final de Neumatología",description: "Evaluación práctica interactiva 'El Espíritu en operación'." },
  programas:            { title: "Programas académicos",      description: "Diseña currículos, ciclos y planes de estudio." },
  pensum:               { title: "Pensum académico",          description: "Malla curricular por semestre y créditos." },
  materias:             { title: "Materias",                  description: "Catálogo maestro de asignaturas con áreas y horas." },
  horarios:             { title: "Horarios y ofertas",        description: "Programación de clases por periodo y docente." },
  estudiantes:          { title: "Estudiantes",               description: "Matrícula, seguimiento académico y notas históricas." },
  docentes:             { title: "Docentes",                  description: "Cuerpo académico, asignaciones y hoja de vida." },
  "aula-virtual": { title: "Aula Virtual",              description: "Clases en Zoom, grabaciones y materiales por sesión." },
  evaluaciones:   { title: "Evaluaciones",              description: "Cortes, pesos y esquema de calificación por oferta." },
  calificaciones: { title: "Calificaciones",            description: "Matriz de notas, recalculo y publicación oficial." },
  asistencia:     { title: "Asistencia",                description: "Registro diario por oferta con control de aforo." },
  biblioteca:     { title: "Biblioteca digital",        description: "Recursos, PDFs y bibliografía por materia." },
  certificados:   { title: "Certificados académicos",   description: "Emisión, verificación pública y trazabilidad." },
  reportes:       { title: "Reportes académicos",       description: "KPIs, deserción, promedio ponderado y cohortes." },
  auditoria:      { title: "Auditoría del seminario",   description: "Registro inmutable de cambios sensibles." },
  "zoom-config":  { title: "Configuración de Zoom",     description: "Cuenta institucional, licencias y credenciales OAuth." },
};

export default function SeminarioPage() {
  const [params, setParams] = useSearchParams();
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const { activeRole } = useActiveRole();
  const { data: programas } = useProgramas();
  const { data: periodos } = usePeriodos();
  const { data: docentes } = useDocentes();

  const STAFF_ROLES = ["admin", "super_admin", "pastor", "seminario_admin", "maestro"];
  const effectiveRoles = activeRole ? [activeRole] : roles;
  const waitingForActiveRole = roles.length > 0 && !activeRole;
  const isStaff = effectiveRoles.some((r) => STAFF_ROLES.includes(r));
  const isDocenteOnly = !isStaff && effectiveRoles.includes("seminario_docente" as any);
  const isEstudianteOnly = !isStaff && !isDocenteOnly && effectiveRoles.includes("seminario_estudiante" as any);
  const DOCENTE_TABS = ["horarios", "aula-virtual", "evaluaciones", "calificaciones", "asistencia", "biblioteca"];
  const ESTUDIANTE_TABS = ["pensum", "aula-virtual", "calificaciones", "biblioteca"];

  const sidebar = useMemo(() => {
    if (isEstudianteOnly) return SIDEBAR.filter((s) => ESTUDIANTE_TABS.includes(s.id));
    if (isDocenteOnly) return SIDEBAR.filter((s) => DOCENTE_TABS.includes(s.id));
    return SIDEBAR;
  }, [isDocenteOnly, isEstudianteOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    sidebar.forEach((it) => {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    });
    return Array.from(map.entries());
  }, [sidebar]);

  const validIds = sidebar.map((s) => s.id);
  const urlTab = params.get("tab");
  const defaultTab = isEstudianteOnly ? "aula-virtual" : isDocenteOnly ? "horarios" : "dashboard";
  const section = urlTab && validIds.includes(urlTab) ? urlTab : defaultTab;
  const setSection = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: false });
  };
  useEffect(() => {
    if (!urlTab || !validIds.includes(urlTab)) {
      const next = new URLSearchParams(params);
      next.set("tab", defaultTab);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDocenteOnly, isEstudianteOnly, activeRole]);

  const meta = SECTION_META[section] ?? SECTION_META.dashboard;
  const periodoActivo = (periodos || []).find((p: any) => p.activo) || (periodos || [])[0];

  const heroKpis = useMemo(() => ([
    { label: "Programas", value: programas?.length ?? "—", hint: "Currículos activos", tone: "info" as const },
    { label: "Periodo",   value: periodoActivo?.codigo || periodoActivo?.nombre || "—", hint: "Ciclo académico vigente" },
    { label: "Docentes",  value: docentes?.length ?? "—", hint: "Cuerpo académico" },
    { label: "Módulo",    value: meta.title.split(" ")[0], hint: "Sección actual", tone: "ok" as const },
  ]), [programas, docentes, periodoActivo, meta.title]);

  if (rolesLoading || waitingForActiveRole) {
    return (
      <div className="p-4 md:p-6">
        <PageSkeleton variant="dashboard" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 md:pt-6">
        <ModuleHero
          variant="seminario"
          title={meta.title}
          eyebrow="Seminario Bíblico CMG"
          description={meta.description}
          status={{ label: periodoActivo ? `Periodo ${periodoActivo.codigo || periodoActivo.nombre} activo` : "Sin periodo activo", tone: periodoActivo ? "ok" : "warn" }}
          kpis={heroKpis}
        />
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden overflow-x-auto border-y bg-card/50">
        <div className="flex gap-0.5 px-2 py-1 min-w-max">
          {sidebar.map((it) => (
            <button
              key={it.id}
              onClick={() => setSection(it.id)}
              aria-label={it.label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all",
                section === it.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <it.icon className="h-3.5 w-3.5" />
              {it.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar redesigned */}
        <nav className="w-60 shrink-0 border-r bg-gradient-to-b from-card/60 to-card/20 hidden md:block overflow-y-auto">
          <div className="p-4 space-y-5">
            <div className="flex items-center gap-2 px-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-900 via-indigo-700 to-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider">Seminario</p>
                <p className="text-[10px] text-muted-foreground truncate">SIS · Academic Suite</p>
              </div>
            </div>

            {grouped.map(([group, items]) => (
              <div key={group}>
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((it) => {
                    const active = section === it.id;
                    return (
                      <button
                        key={it.id}
                        onClick={() => setSection(it.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-[0_1px_0_0_hsl(var(--primary)/0.08)]"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-blue-600 to-indigo-500" />
                        )}
                        <it.icon className={cn("h-4 w-4 shrink-0 transition-transform", active ? "scale-110" : "group-hover:scale-105")} />
                        <span className="truncate">{it.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {section === "taller-neumatologia" && <TallerNeumatologiaPage />}
          {section === "programas" && <ProgramasSection />}
          {section === "pensum" && <PensumSection readOnly={isEstudianteOnly} />}
          {section === "materias" && <MateriasSection readOnly={isEstudianteOnly} />}
          {section === "horarios" && <HorariosSection />}
          {section === "estudiantes" && <EstudiantesSection />}
          {section === "auditoria" && <AuditoriaSection />}
          {section === "zoom-config" && <ZoomConfigSection />}
          {section === "dashboard" && <DashboardSection />}
          {section === "aula-virtual" && <AulaVirtualSection />}
          {section === "evaluaciones" && <EvaluacionesSection />}
          {section === "calificaciones" && (isEstudianteOnly ? <MiAulaSection /> : <CalificacionesSection />)}
          {section === "asistencia" && <AsistenciaSection />}
          {section === "biblioteca" && <BibliotecaSection />}
          {section === "certificados" && <CertificadosSection />}
          {section === "docentes" && <DocentesSection />}
          {section === "reportes" && <ReportesSection />}
        </div>
      </div>
    </div>
  );
}
