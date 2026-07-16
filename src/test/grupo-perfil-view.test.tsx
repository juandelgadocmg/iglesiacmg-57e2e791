import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

/* ------------------------- Hook mocks (before import) ------------------------- */
const detalleState: any = { data: null, isLoading: false, isError: false, error: null, refetch: vi.fn() };
const miembrosState: any = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
const reportesState: any = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
const statsState: any = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };

vi.mock("@/hooks/useGrupoPerfil", () => ({
  useGrupoDetalle: () => detalleState,
  useGrupoMiembrosDetalle: () => miembrosState,
  useGrupoReportes: () => reportesState,
  useGrupoAsistenciaStats: () => statsState,
}));

vi.mock("@/hooks/useGrupoMembers", () => ({
  useAddGrupoMiembro: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMiembroRol: () => ({ mutateAsync: vi.fn() }),
  useRemoveGrupoMiembro: () => ({ mutateAsync: vi.fn() }),
  useSearchPersonas: () => ({ data: [] }),
  ROLES_GRUPO: [{ value: "asistente", label: "Asistente" }],
}));

vi.mock("@/hooks/usePlanificaciones", () => ({
  usePlanificaciones: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() }),
  useDeletePlanificacion: () => ({ mutateAsync: vi.fn() }),
}));

const rpcSpy = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => { rpcSpy(...args); return Promise.resolve({ data: null, error: null }); },
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }) }),
  },
}));

vi.mock("@/lib/exportUtils", () => ({ exportGroupProfilePDF: vi.fn() }));

/* ---------------- Import after mocks ---------------- */
import GrupoPerfilView from "@/components/groups/GrupoPerfilView";

function renderView(props: Partial<React.ComponentProps<typeof GrupoPerfilView>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GrupoPerfilView grupoId="g-1" onBack={null} {...props} />
      <Toaster />
    </QueryClientProvider>
  );
}

const resetStates = () => {
  Object.assign(detalleState, { data: null, isLoading: false, isError: false, error: null });
  Object.assign(miembrosState, { data: [], isLoading: false, isError: false, error: null });
  Object.assign(reportesState, { data: [], isLoading: false, isError: false, error: null });
  Object.assign(statsState, { data: [], isLoading: false, isError: false, error: null });
  rpcSpy.mockClear();
  detalleState.refetch.mockClear();
};

describe("GrupoPerfilView — estados premium", () => {
  beforeEach(resetStates);

  it("muestra skeleton accesible en loading", () => {
    detalleState.isLoading = true;
    renderView();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/Cargando información/i)).toBeInTheDocument();
  });

  it("renderiza ErrorState con botón Reintentar que dispara refetch", () => {
    detalleState.isError = true;
    detalleState.error = new Error("network down");
    renderView();
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/network down/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));
    expect(detalleState.refetch).toHaveBeenCalled();
  });

  it("registra en auditoría cuando el detalle falla", () => {
    detalleState.isError = true;
    detalleState.error = new Error("boom");
    renderView();
    expect(rpcSpy).toHaveBeenCalledWith(
      "log_grupo_load_failure",
      expect.objectContaining({ _grupo_id: "g-1", _section: "detalle", _error: "boom" })
    );
  });

  it("muestra EmptyState 'Grupo no encontrado' cuando no hay data", () => {
    renderView();
    expect(screen.getByText(/Grupo no encontrado/i)).toBeInTheDocument();
  });

  it("oculta acciones de escritura cuando readOnly=true", () => {
    detalleState.data = {
      id: "g-1", nombre: "CDP Norte", red: "Nissi", lider_nombre: "L1",
      latitud: null, longitud: null,
    };
    renderView({ readOnly: true });
    expect(screen.queryByRole("button", { name: /Editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Crear Reporte/i })).not.toBeInTheDocument();
  });

  it("renderiza acciones de escritura cuando readOnly=false", () => {
    detalleState.data = {
      id: "g-1", nombre: "CDP Norte", red: "Nissi", lider_nombre: "L1",
      latitud: null, longitud: null,
    };
    renderView({ readOnly: false });
    expect(screen.getByRole("button", { name: /Editar/i })).toBeInTheDocument();
  });
});
