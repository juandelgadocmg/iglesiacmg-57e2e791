import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TIPOS_CERTIFICADO = [
  "Membresía",
  "Bautismo",
  "Líderes de Casas de Paz",
  "Confirmación",
  "Matrimonio",
  "Presentación de niños",
  "Donación",
  "Carta de transferencia",
] as const;

export function useCertificadosIglesia() {
  return useQuery({
    queryKey: ["certificados_iglesia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificados")
        .select("*, personas(nombres, apellidos)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCertificadoIglesia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cert: {
      persona_id: string;
      tipo_certificado: string;
      fecha_emision: string;
    }) => {
      const { data, error } = await supabase
        .from("certificados")
        .insert({
          persona_id: cert.persona_id,
          tipo_certificado: cert.tipo_certificado,
          fecha_emision: cert.fecha_emision,
          curso_id: null as any,
          matricula_id: null as any,
        })
        .select("*, personas(nombres, apellidos)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificados_iglesia"] }),
  });
}

export function useDeleteCertificadoIglesia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificados_iglesia"] }),
  });
}
