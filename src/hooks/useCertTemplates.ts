import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type CertTipo = "lideres_cdp" | "bautismo" | "seminario_diploma" | "academia";

export interface CertTemplate {
  id: string;
  tipo: CertTipo;
  nombre: string;
  descripcion: string | null;
  asset_id: string | null;
  asset_url: string;
  asset_filename: string | null;
  asset_size: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  version: number;
  activo: boolean;
  es_default: boolean;
  preview_url: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export const CERT_TIPO_LABEL: Record<CertTipo, string> = {
  lideres_cdp: "Líderes Casas de Paz",
  bautismo: "Bautismo",
  seminario_diploma: "Diploma Seminario",
  academia: "Academia / Discipulado",
};

export function useCertTemplates(tipo?: CertTipo) {
  return useQuery({
    queryKey: ["cert-templates", tipo || "all"],
    queryFn: async (): Promise<CertTemplate[]> => {
      let q = sb.from("cert_templates").select("*").order("tipo").order("version", { ascending: false });
      if (tipo) q = q.eq("tipo", tipo);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCertTemplateDefault(tipo: CertTipo) {
  const { data, ...rest } = useCertTemplates(tipo);
  const def = (data || []).find((t) => t.es_default && t.activo) || (data || []).find((t) => t.activo);
  return { data: def, all: data || [], ...rest };
}

export function useCreateCertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CertTemplate> & { tipo: CertTipo; nombre: string; asset_url: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const { data: existing } = await sb
        .from("cert_templates")
        .select("version")
        .eq("tipo", input.tipo)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = ((existing?.version as number) || 0) + 1;
      const { data, error } = await sb
        .from("cert_templates")
        .insert({
          ...input,
          version: nextVersion,
          activo: input.activo ?? true,
          es_default: input.es_default ?? false,
          created_by: user?.id ?? null,
          created_by_email: user?.email ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CertTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cert-templates"] }),
  });
}

export function useUpdateCertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CertTemplate> }) => {
      const { error } = await sb.from("cert_templates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cert-templates"] }),
  });
}

export function useSetCertTemplateDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: CertTipo }) => {
      await sb.from("cert_templates").update({ es_default: false }).eq("tipo", tipo);
      const { error } = await sb.from("cert_templates").update({ es_default: true, activo: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cert-templates"] }),
  });
}

export function useDeleteCertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count } = await sb
        .from("cert_export_log")
        .select("id", { count: "exact", head: true })
        .eq("template_id", id);
      if ((count || 0) > 0) throw new Error("No se puede eliminar: la plantilla ya fue usada en descargas. Desactívala en su lugar.");
      const { error } = await sb.from("cert_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cert-templates"] }),
  });
}
