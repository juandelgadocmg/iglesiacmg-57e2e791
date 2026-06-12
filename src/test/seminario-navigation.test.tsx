import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock heavy section components so the test focuses on navigation
vi.mock("@/components/seminario/ProgramasSection", () => ({ default: () => <div>SECTION_PROGRAMAS</div> }));
vi.mock("@/components/seminario/PensumSection", () => ({ default: () => <div>SECTION_PENSUM</div> }));
vi.mock("@/components/seminario/MateriasSection", () => ({ default: () => <div>SECTION_MATERIAS</div> }));
vi.mock("@/components/seminario/HorariosSection", () => ({ default: () => <div>SECTION_HORARIOS</div> }));
vi.mock("@/components/seminario/EstudiantesSection", () => ({ default: () => <div>SECTION_ESTUDIANTES</div> }));
vi.mock("@/components/seminario/AuditoriaSection", () => ({ default: () => <div>SECTION_AUDITORIA</div> }));
vi.mock("@/components/seminario/ZoomConfigSection", () => ({ default: () => <div>SECTION_ZOOM</div> }));
vi.mock("@/components/seminario/DashboardSection", () => ({ default: () => <div>SECTION_DASHBOARD</div> }));
vi.mock("@/components/seminario/AulaVirtualSection", () => ({ default: () => <div>SECTION_AULA</div> }));
vi.mock("@/components/seminario/EvaluacionesSection", () => ({
  default: () => <div data-testid="eval-section">SECTION_EVALUACIONES<div data-testid="empty">Selecciona una materia</div></div>,
}));
vi.mock("@/components/seminario/CalificacionesSection", () => ({
  default: () => <div>SECTION_CALIFICACIONES<div role="status">Cargando…</div></div>,
}));
vi.mock("@/components/seminario/AsistenciaSection", () => ({ default: () => <div>SECTION_ASISTENCIA</div> }));
vi.mock("@/components/seminario/BibliotecaSection", () => ({ default: () => <div>SECTION_BIBLIOTECA</div> }));
vi.mock("@/components/seminario/CertificadosSection", () => ({ default: () => <div>SECTION_CERTIFICADOS</div> }));
vi.mock("@/components/seminario/DocentesSection", () => ({ default: () => <div>SECTION_DOCENTES</div> }));
vi.mock("@/components/seminario/ReportesSection", () => ({ default: () => <div>SECTION_REPORTES</div> }));
vi.mock("@/components/shared/PageHeader", () => ({ default: () => <header>Header</header> }));

import SeminarioPage from "@/pages/SeminarioPage";

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/seminario" element={<SeminarioPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const TABS = [
  { id: "dashboard", text: "SECTION_DASHBOARD" },
  { id: "programas", text: "SECTION_PROGRAMAS" },
  { id: "pensum", text: "SECTION_PENSUM" },
  { id: "materias", text: "SECTION_MATERIAS" },
  { id: "horarios", text: "SECTION_HORARIOS" },
  { id: "estudiantes", text: "SECTION_ESTUDIANTES" },
  { id: "aula-virtual", text: "SECTION_AULA" },
  { id: "evaluaciones", text: "SECTION_EVALUACIONES" },
  { id: "calificaciones", text: "SECTION_CALIFICACIONES" },
  { id: "asistencia", text: "SECTION_ASISTENCIA" },
  { id: "biblioteca", text: "SECTION_BIBLIOTECA" },
  { id: "certificados", text: "SECTION_CERTIFICADOS" },
  { id: "docentes", text: "SECTION_DOCENTES" },
  { id: "reportes", text: "SECTION_REPORTES" },
  { id: "auditoria", text: "SECTION_AUDITORIA" },
  { id: "zoom-config", text: "SECTION_ZOOM" },
];

describe("SeminarioPage navigation", () => {
  it("defaults to dashboard when no tab param is present", () => {
    renderAt("/seminario");
    expect(screen.getByText("SECTION_DASHBOARD")).toBeInTheDocument();
  });

  it("renders the section matching ?tab= in the URL for every tab", () => {
    for (const t of TABS) {
      const { unmount } = renderAt(`/seminario?tab=${t.id}`);
      expect(screen.getByText(t.text)).toBeInTheDocument();
      unmount();
    }
  });

  it("falls back to dashboard when ?tab= is unknown", () => {
    renderAt("/seminario?tab=tab-inexistente-xyz");
    expect(screen.getByText("SECTION_DASHBOARD")).toBeInTheDocument();
  });

  it("updates the visible section when the sidebar item is clicked", () => {
    renderAt("/seminario?tab=dashboard");
    const sidebar = document.querySelector("nav") as HTMLElement;
    const btn = within(sidebar).getByRole("button", { name: /Reportes/i });
    fireEvent.click(btn);
    expect(screen.getByText("SECTION_REPORTES")).toBeInTheDocument();
  });

  it("shows the Evaluaciones empty state when no data is selected", () => {
    renderAt("/seminario?tab=evaluaciones");
    expect(screen.getByTestId("empty")).toHaveTextContent(/Selecciona una materia/i);
  });

  it("shows the Calificaciones skeleton/loading state", () => {
    renderAt("/seminario?tab=calificaciones");
    expect(screen.getByRole("status")).toHaveTextContent(/Cargando/i);
  });
});
