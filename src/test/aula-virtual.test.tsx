import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rolesMock = vi.fn();
const authMock = vi.fn();
const miPersonaMock = vi.fn();
const misOfertasMock = vi.fn();
const isStaffMock = vi.fn();

// Staff hook mocks
const programasData: any[] = [{ id: "prog1", nombre: "Teología" }];
const periodosData: any[] = [{ id: "per1", nombre: "2026-1" }];
const ofertasData: any[] = [{
  id: "of1",
  materia_id: "mat1",
  periodo_id: "per1",
  docente_nombre: "Pastor X",
  horario: "Lun 18:00",
  aula: "A1",
  modalidad: "presencial",
  sem_materias: { id: "mat1", codigo: "T101", nombre: "Biblia", creditos: 3, color: "#3b82f6" },
}];
const evalsData: any[] = [{ id: "ev1", nombre: "Parcial 1", tipo: "parcial", peso: 30, fecha: "2026-06-30" }];
const recursosData: any[] = [];
const anunciosData: any[] = [];
const matrizData = { estudiantes: [{ id: "im1", nota_final: null, estado: "activa", sem_inscripciones: { personas: { nombres: "Ana", apellidos: "P", documento: "123" } } }] };

const upsertAnuncio = vi.fn().mockResolvedValue({});
const upsertRecurso = vi.fn().mockResolvedValue({});
const upsertEvaluacion = vi.fn().mockResolvedValue({});

vi.mock("@/hooks/useUserRoles", () => ({ useUserRoles: () => rolesMock() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authMock() }));
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
  useProgramas: () => ({ data: programasData }),
  usePeriodos: () => ({ data: periodosData }),
  useOfertas: () => ({ data: ofertasData }),
  useCalificacionesMatriz: () => ({ data: matrizData }),
  useEvaluaciones: () => ({ data: evalsData }),
  useRecursos: () => ({ data: recursosData }),
  useAnuncios: () => ({ data: anunciosData }),
  useUpsertAnuncio: () => ({ mutateAsync: upsertAnuncio, isPending: false }),
  useDeleteAnuncio: () => ({ mutateAsync: vi.fn() }),
  useUpsertRecurso: () => ({ mutateAsync: upsertRecurso, isPending: false }),
  useDeleteRecurso: () => ({ mutateAsync: vi.fn() }),
  useUpsertEvaluacion: () => ({ mutateAsync: upsertEvaluacion, isPending: false }),
  useDeleteEvaluacion: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { refreshSession: vi.fn().mockResolvedValue({}) },
    from: () => ({}),
    storage: { from: () => ({ upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: "x" } }) }) },
  },
}));

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
    upsertAnuncio.mockClear();
    upsertRecurso.mockClear();
    upsertEvaluacion.mockClear();
    rolesMock.mockReturnValue({ roles: [], isLoading: false });
    authMock.mockReturnValue({ user: { id: "u1", email: "test@cmg.org" }, loading: false });
    miPersonaMock.mockReturnValue({ data: null, isLoading: false, error: null });
    misOfertasMock.mockReturnValue({ data: [], isLoading: false, error: null });
    isStaffMock.mockReturnValue({ data: false });
  });

  // ─── Guards & routing ───────────────────────────────────────────
  it("shows loading while auth resolves", () => {
    authMock.mockReturnValue({ user: null, loading: true });
    renderIt();
    expect(screen.getByTestId("aula-loading")).toBeInTheDocument();
  });

  it("redirects to login state when no session (never renders incomplete view)", () => {
    authMock.mockReturnValue({ user: null, loading: false });
    renderIt();
    expect(screen.getByTestId("aula-no-session")).toBeInTheDocument();
    expect(screen.queryByTestId("aula-student")).not.toBeInTheDocument();
    expect(screen.queryByTestId("aula-staff")).not.toBeInTheDocument();
  });

  it("shows loading skeleton while roles load", () => {
    rolesMock.mockReturnValue({ roles: [], isLoading: true });
    renderIt();
    expect(screen.getByTestId("aula-loading")).toBeInTheDocument();
  });

  it("renders student view with diagnostic for non-staff", () => {
    renderIt();
    expect(screen.getByTestId("aula-student")).toBeInTheDocument();
    expect(screen.getByTestId("aula-diagnostic")).toBeInTheDocument();
  });

  it("renders staff view with view-toggle for staff users", () => {
    rolesMock.mockReturnValue({ roles: ["seminario_admin"], isLoading: false });
    renderIt();
    expect(screen.getByTestId("aula-staff")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vista docente/i })).toBeInTheDocument();
  });

  it("toggles between staff and student preview without crashing", () => {
    rolesMock.mockReturnValue({ roles: ["admin"], isLoading: false });
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: /Vista estudiante/i }));
    expect(screen.getByTestId("aula-diagnostic")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Vista docente/i }));
    expect(screen.getByText(/Aula Virtual · Docente/i)).toBeInTheDocument();
  });

  // ─── Diagnostic panel ───────────────────────────────────────────
  it("diagnostic panel exposes role, persona id and export button", () => {
    miPersonaMock.mockReturnValue({ data: { id: "p123", nombres: "Ana", apellidos: "Ruiz" }, isLoading: false, error: null });
    misOfertasMock.mockReturnValue({
      data: [{
        id: "im1", oferta_id: "of1", materia_id: "mat1", estado: "activa",
        sem_materias: { codigo: "T101", nombre: "Biblia" },
        sem_ofertas: { periodo_id: "per1", sem_periodos: { nombre: "2026-1" } },
        sem_inscripciones: { sem_programas: { nombre: "Teología" } },
      }],
      isLoading: false, error: null,
    });
    rolesMock.mockReturnValue({ roles: ["estudiante"], isLoading: false });
    renderIt();
    fireEvent.click(screen.getByTestId("aula-diagnostic-toggle"));
    const body = screen.getByTestId("aula-diagnostic-body");
    expect(within(body).getByText(/estudiante/i)).toBeInTheDocument();
    expect(within(body).getByText(/p123/)).toBeInTheDocument();
    expect(within(body).getByText(/Teología/)).toBeInTheDocument();
    expect(screen.getByTestId("aula-diagnostic-export")).toBeInTheDocument();
  });

  // ─── Error boundary + retry ─────────────────────────────────────
  it("error boundary shows retry button instead of blank screen", () => {
    miPersonaMock.mockImplementation(() => { throw new Error("rls denied"); });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderIt();
    expect(screen.getByTestId("aula-error-boundary")).toBeInTheDocument();
    expect(screen.getByTestId("aula-error-retry")).toBeInTheDocument();
    spy.mockRestore();
  });

  // ─── Staff tabs / actions ───────────────────────────────────────
  it("staff view: all 5 tabs are rendered for the docente", () => {
    rolesMock.mockReturnValue({ roles: ["admin"], isLoading: false });
    renderIt();
    const tabs = screen.getAllByRole("tab");
    const names = tabs.map((t) => t.textContent || "");
    expect(names.some((n) => /Material/i.test(n))).toBe(true);
    expect(names.some((n) => /Trabajos/i.test(n))).toBe(true);
    expect(names.some((n) => /Estudiantes/i.test(n))).toBe(true);
    expect(names.some((n) => /Anuncios/i.test(n))).toBe(true);
    expect(names.some((n) => /Foros/i.test(n))).toBe(true);
    // El contenedor de staff sigue montado (no blank)
    expect(screen.getByTestId("aula-staff")).toBeInTheDocument();
  });

  it("staff view: default Material tab shows 'Subir material' (no blank tab)", () => {
    rolesMock.mockReturnValue({ roles: ["admin"], isLoading: false });
    renderIt();
    expect(screen.getByRole("button", { name: /Subir material/i })).toBeInTheDocument();
    expect(screen.getByTestId("aula-staff")).toBeInTheDocument();
  });

  it("staff view: quick-jump shortcuts (Notas / Asistencia / Biblioteca) are present", () => {
    rolesMock.mockReturnValue({ roles: ["admin"], isLoading: false });
    renderIt();
    expect(screen.getByRole("button", { name: /^Notas$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Asistencia$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Biblioteca$/i })).toBeInTheDocument();
  });
});
