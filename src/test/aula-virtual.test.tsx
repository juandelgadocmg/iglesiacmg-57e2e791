import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mocks for hooks
const rolesMock = vi.fn();
const miPersonaMock = vi.fn();
const misOfertasMock = vi.fn();
const isStaffMock = vi.fn();

vi.mock("@/hooks/useUserRoles", () => ({ useUserRoles: () => rolesMock() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", email: "test@cmg.org" } }) }));
vi.mock("@/hooks/useCan", () => ({ useCan: () => () => true }));
vi.mock("@/hooks/useSeminarioStudent", () => ({
  useMiPersona: () => miPersonaMock(),
  useMisOfertas: () => misOfertasMock(),
  useIsSeminarioStaff: () => isStaffMock(),
  useMiCurso: () => ({ data: null, isLoading: false }),
  useSubirEntrega: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useForos: () => ({ data: [], isLoading: false }),
  useCrearForo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useForoMensajes: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  useEnviarMensajeForo: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEliminarMensajeForo: () => ({ mutateAsync: vi.fn() }),
  useMarcarAnuncioLeido: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleForoCerrado: () => ({ mutateAsync: vi.fn() }),
  useSignedUrl: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/useSeminario", () => ({
  useProgramas: () => ({ data: [] }),
  usePeriodos: () => ({ data: [] }),
  useOfertas: () => ({ data: [] }),
  useCalificacionesMatriz: () => ({ data: null }),
  useEvaluaciones: () => ({ data: [] }),
  useRecursos: () => ({ data: [] }),
  useAnuncios: () => ({ data: [] }),
  useUpsertAnuncio: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAnuncio: () => ({ mutateAsync: vi.fn() }),
  useUpsertRecurso: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRecurso: () => ({ mutateAsync: vi.fn() }),
  useUpsertEvaluacion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteEvaluacion: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}) } }));

import AulaVirtualSection from "@/components/seminario/AulaVirtualSection";

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><AulaVirtualSection /></MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AulaVirtualSection E2E", () => {
  beforeEach(() => {
    rolesMock.mockReturnValue({ roles: [], isLoading: false });
    miPersonaMock.mockReturnValue({ data: null, isLoading: false, error: null });
    misOfertasMock.mockReturnValue({ data: [], isLoading: false, error: null });
    isStaffMock.mockReturnValue({ data: false });
  });

  it("shows loading skeleton while roles load", () => {
    rolesMock.mockReturnValue({ roles: [], isLoading: true });
    renderIt();
    expect(screen.getByTestId("aula-loading")).toBeInTheDocument();
  });

  it("renders student view (with diagnostic) for non-staff users", () => {
    renderIt();
    expect(screen.getByTestId("aula-student")).toBeInTheDocument();
    expect(screen.getByTestId("aula-diagnostic")).toBeInTheDocument();
  });

  it("shows 'no persona' empty state instead of going blank", () => {
    renderIt();
    expect(screen.getByText(/No encontramos tu ficha/i)).toBeInTheDocument();
  });

  it("renders staff view with view-toggle for staff users", () => {
    rolesMock.mockReturnValue({ roles: ["seminario_admin"], isLoading: false });
    renderIt();
    expect(screen.getByTestId("aula-staff")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vista docente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vista estudiante/i })).toBeInTheDocument();
  });

  it("toggles between staff and student preview without crashing", () => {
    rolesMock.mockReturnValue({ roles: ["admin"], isLoading: false });
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Vista estudiante/i }));
    expect(screen.getByTestId("aula-diagnostic")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Vista docente/i }));
    expect(screen.getByText(/Aula Virtual · Docente/i)).toBeInTheDocument();
  });

  it("renders persona + empty courses without a blank screen", () => {
    miPersonaMock.mockReturnValue({ data: { id: "p1", nombres: "Ana", apellidos: "Pérez" }, isLoading: false, error: null });
    renderIt();
    expect(screen.getByText(/Hola, Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Aún no tienes materias matriculadas/i)).toBeInTheDocument();
  });

  it("error boundary catches render failures (no blank screen)", () => {
    miPersonaMock.mockImplementation(() => { throw new Error("boom"); });
    // Silence expected error noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderIt();
    expect(screen.getByTestId("aula-error-boundary")).toBeInTheDocument();
    spy.mockRestore();
  });
});
