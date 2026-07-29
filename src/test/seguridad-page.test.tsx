import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const canMock = vi.fn();
const userRolesMock = vi.fn();
const supabaseQuery = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  then: vi.fn(function (this: any, resolve: any) {
    return resolve({ data: [], error: null });
  }),
};

vi.mock("@/hooks/useCan", () => ({ useCan: () => canMock }));
vi.mock("@/hooks/useUserRoles", () => ({ useUserRoles: () => userRolesMock() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => supabaseQuery) } }));

import RoleGuard from "@/components/auth/RoleGuard";
import SeguridadPage from "@/pages/SeguridadPage";
import ShareLinkButton from "@/components/shared/ShareLinkButton";

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderWithQueryAndRouter(ui: ReactNode, initialEntries: string[] = ["/"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SeguridadPage", () => {
  beforeEach(() => {
    supabaseQuery.select.mockClear();
    supabaseQuery.order.mockClear();
    supabaseQuery.range.mockClear();
    supabaseQuery.then.mockClear();
  });

  it("muestra pantalla de acceso restringido cuando no tiene permiso share:view_audit", () => {
    canMock.mockReturnValue(false);
    renderWithQuery(<SeguridadPage />);

    expect(screen.getByText(/Acceso restringido/i)).toBeInTheDocument();
    expect(screen.getByText(/No tienes permiso para ver esta auditoría/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renderiza el listado de auditoría cuando tiene permiso share:view_audit", async () => {
    canMock.mockReturnValue(true);
    renderWithQuery(<SeguridadPage />);

    expect(await screen.findByText(/Consola de Seguridad/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar PDF/i })).toBeInTheDocument();
  });
});

describe("ShareLinkButton", () => {
  beforeEach(() => {
    canMock.mockClear();
  });

  it("no renderiza cuando no tiene permiso share:link", () => {
    canMock.mockImplementation((permission: string) => permission === "share:qr_download");
    renderWithQuery(<ShareLinkButton />);

    expect(screen.queryByRole("button", { name: /Copiar enlace/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mostrar código QR del enlace/i })).not.toBeInTheDocument();
  });

  it("muestra QR pero oculta el botón de descarga cuando no tiene permiso share:qr_download", async () => {
    canMock.mockImplementation((permission: string) => permission === "share:link");
    renderWithQuery(<ShareLinkButton />);

    const qrButton = screen.getByRole("button", { name: /Mostrar código QR del enlace/i });
    fireEvent.click(qrButton);

    expect(await screen.findByText(/Escanear enlace/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Descargar PNG/i })).not.toBeInTheDocument();
  });

  it("permite descargar QR cuando tiene permiso share:qr_download", async () => {
    canMock.mockImplementation((permission: string) => permission === "share:link" || permission === "share:qr_download");
    renderWithQuery(<ShareLinkButton />);

    const qrButton = screen.getByRole("button", { name: /Mostrar código QR del enlace/i });
    fireEvent.click(qrButton);

    expect(await screen.findByText(/Escanear enlace/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar PNG/i })).toBeInTheDocument();
  });
});

describe("RoleGuard / ruta de seguridad", () => {
  beforeEach(() => {
    userRolesMock.mockClear();
  });

  it("bloquea el acceso a /seguridad para roles sin permiso", () => {
    userRolesMock.mockReturnValue({ roles: ["secretaria"], isLoading: false });

    renderWithQueryAndRouter(
      <Routes>
        <Route path="/seguridad" element={<RoleGuard><div>SEGURIDAD OK</div></RoleGuard>} />
      </Routes>,
      ["/seguridad"],
    );

    expect(screen.getByText(/Acceso restringido/i)).toBeInTheDocument();
    expect(screen.queryByText("SEGURIDAD OK")).not.toBeInTheDocument();
  });

  it("permite el acceso a /seguridad para roles con permiso", () => {
    userRolesMock.mockReturnValue({ roles: ["lider_red"], isLoading: false });

    renderWithQueryAndRouter(
      <Routes>
        <Route path="/seguridad" element={<RoleGuard><div>SEGURIDAD OK</div></RoleGuard>} />
      </Routes>,
      ["/seguridad"],
    );

    expect(screen.getByText("SEGURIDAD OK")).toBeInTheDocument();
  });
});
