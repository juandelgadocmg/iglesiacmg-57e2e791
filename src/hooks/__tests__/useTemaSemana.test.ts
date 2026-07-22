import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { useTemaSemanaVigente } from "@/hooks/useTemaSemana";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useTemaSemanaVigente", () => {
  beforeEach(() => rpcMock.mockReset());

  it("returns the first row from tema_semana_vigente RPC", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ id: "1", titulo: "Lección semana", pdf_url: "/x.pdf" }],
      error: null,
    });
    const { result } = renderHook(() => useTemaSemanaVigente(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("tema_semana_vigente");
    expect(result.current.data?.titulo).toBe("Lección semana");
  });

  it("surfaces RPC errors so the UI can retry", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useTemaSemanaVigente(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.message).toBe("boom");
  });
});
