import { useState } from "react";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import {
  LayoutDashboard, BookOpen, Layers, FileText, Video, ClipboardCheck,
  BarChart3, UserCheck, Library, Award, Users, FileBarChart2, CalendarClock, GraduationCap,
} from "lucide-react";
import ProgramasSection from "@/components/seminario/ProgramasSection";
import PensumSection from "@/components/seminario/PensumSection";
import MateriasSection from "@/components/seminario/MateriasSection";
import HorariosSection from "@/components/seminario/HorariosSection";
import EstudiantesSection from "@/components/seminario/EstudiantesSection";
import PlaceholderSection from "@/components/seminario/PlaceholderSection";

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
];

export default function SeminarioPage() {
  const [section, setSection] = useState("programas");

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Seminario Bíblico CMG"
        description="Sistema de gestión académica · Teología Bíblica y Ministerial"
      />

      {/* Mobile tabs */}
      <div className="md:hidden overflow-x-auto border-b bg-card/50">
        <div className="flex gap-0.5 px-2 py-1 min-w-max">
          {SIDEBAR.map((it) => (
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
              {SIDEBAR.map((it) => (
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
          {section === "pensum" && <PensumSection />}
          {section === "materias" && <MateriasSection />}
          {section === "dashboard" && (
            <PlaceholderSection title="Dashboard Académico" phase="Fase 4"
              description="KPIs de matriculados, retención, promedio general, mora, próximas evaluaciones y alertas." />
          )}
          {section === "aula-virtual" && (
            <PlaceholderSection title="Aula Virtual" phase="Fase 2"
              description="Vista por materia con link Zoom (manual + API), recursos, anuncios y lista de estudiantes." />
          )}
          {section === "evaluaciones" && (
            <PlaceholderSection title="Evaluaciones" phase="Fase 3"
              description="Crear quices, parciales, finales y trabajos con peso porcentual y fechas." />
          )}
          {section === "calificaciones" && (
            <PlaceholderSection title="Calificaciones" phase="Fase 3"
              description="Captura de notas, cálculo automático de definitiva, kárdex del estudiante." />
          )}
          {section === "asistencia" && (
            <PlaceholderSection title="Asistencia" phase="Fase 2"
              description="Registro manual o por QR, reporte por materia/estudiante, alertas de inasistencias." />
          )}
          {section === "biblioteca" && (
            <PlaceholderSection title="Biblioteca Digital" phase="Fase 3"
              description="Repositorio de PDFs, videos y enlaces por programa o materia." />
          )}
          {section === "certificados" && (
            <PlaceholderSection title="Certificados Automáticos" phase="Fase 4"
              description="Diploma generado al completar los 8 semestres con todas las materias aprobadas." />
          )}
          {section === "docentes" && (
            <PlaceholderSection title="Docentes" phase="Fase 2"
              description="Gestión de docentes del Seminario y asignación a materias y horarios." />
          )}
          {section === "reportes" && (
            <PlaceholderSection title="Reportes" phase="Fase 4"
              description="Promedio acumulado, retención por semestre, tasas de aprobación, mora y kárdex PDF." />
          )}
        </div>
      </div>
    </div>
  );
}
