import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  LayoutDashboard, BookOpen, Layers, FileText, Video, ClipboardCheck,
  BarChart3, UserCheck, Library, Award, Users, FileBarChart2, CalendarClock, GraduationCap, ShieldCheck, Settings2,
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

const SIDEBAR = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "programas", label: "Programas", icon: BookOpen },
  { id: "pensum", label: "Pensum Académico", icon: Layers },
  { id: "materias", label: "Materias", icon: FileText },
  { id: "horarios", label: "Horarios", icon: CalendarClock },
  { id: "estudiantes", label: "Estudiantes", icon: GraduationCap },
  { id: "aula-virtual", label: "Aula Virtual", icon: Video },
  { id: "evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
  { id: "calificaciones", label: "Calificaciones", icon: BarChart3 },
  { id: "asistencia", label: "Asistencia", icon: UserCheck },
  { id: "biblioteca", label: "Biblioteca Digital", icon: Library },
  { id: "certificados", label: "Certificados", icon: Award },
  { id: "docentes", label: "Docentes", icon: Users },
  { id: "reportes", label: "Reportes", icon: FileBarChart2 },
  { id: "auditoria", label: "Auditoría", icon: ShieldCheck },
  { id: "zoom-config", label: "Configuración Zoom", icon: Settings2 },
];

export default function SeminarioPage() {
  const [params, setParams] = useSearchParams();
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const { activeRole } = useActiveRole();

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
  }, [isDocenteOnly, isEstudianteOnly, activeRole]); // eslint-disable-line

  if (rolesLoading || waitingForActiveRole) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Seminario Bíblico CMG"
          description="Sistema de gestión académica · Teología Bíblica y Ministerial"
        />
        <div className="flex flex-1 min-h-0">
          <div className="w-56 shrink-0 border-r bg-card/50 hidden md:block" />
          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-40 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Seminario Bíblico CMG"
        description="Sistema de gestión académica · Teología Bíblica y Ministerial"
      />

      {/* Mobile tabs */}
      <div className="md:hidden overflow-x-auto border-b bg-card/50">
        <div className="flex gap-0.5 px-2 py-1 min-w-max">
          {sidebar.map((it) => (
            <button key={it.id} onClick={() => setSection(it.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                section === it.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <it.icon className="h-3.5 w-3.5" />
              {it.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 border-r bg-card/50 hidden md:block overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Seminario</h2>
            <div className="space-y-0.5">
              {sidebar.map((it) => (
                <button key={it.id} onClick={() => setSection(it.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    section === it.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                  <it.icon className="h-4 w-4 shrink-0" />
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
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
