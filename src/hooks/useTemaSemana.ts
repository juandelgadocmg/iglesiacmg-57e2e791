import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TemaSemanaVersion {
  id: string;
  titulo: string | null;
  descripcion: string | null;
  url: string | null;
  pdf_url: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: "activo" | "revertido";
  parent_version_id: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemaSemanaVigente {
  id: string | null;
  titulo: string | null;
  descripcion: string | null;
  url: string | null;
  pdf_url: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_by_email: string | null;
  created_at: string | null;
}

const QK_VIGENTE = ["tema_semana", "vigente"];
const QK_HISTORIAL = ["tema_semana", "historial"];

export function useTemaSemanaVigente() {
  return useQuery<TemaSemanaVigente | null>({
    queryKey: QK_VIGENTE,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("tema_semana_vigente");
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[tema_semana_vigente] RPC error:", error);
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useTemaSemanaHistorial() {
  return useQuery<TemaSemanaVersion[]>({
    queryKey: QK_HISTORIAL,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tema_semana_versiones")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TemaSemanaVersion[];
    },
  });
}

export interface NuevaVersionInput {
  titulo: string | null;
  descripcion: string | null;
  url: string | null;
  pdf_url: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export function usePublicarVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NuevaVersionInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? null;
      const payload = {
        ...input,
        created_by: userData.user?.id ?? null,
        created_by_email: email,
      };
      const { data, error } = await (supabase as any)
        .from("tema_semana_versiones")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_VIGENTE });
      qc.invalidateQueries({ queryKey: QK_HISTORIAL });
    },
  });
}

export function useRevertirVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data, error } = await (supabase as any).rpc("tema_semana_revertir", {
        _version_id: versionId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_VIGENTE });
      qc.invalidateQueries({ queryKey: QK_HISTORIAL });
    },
  });
}

export function useEliminarVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await (supabase as any)
        .from("tema_semana_versiones")
        .delete()
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_VIGENTE });
      qc.invalidateQueries({ queryKey: QK_HISTORIAL });
    },
  });
}
