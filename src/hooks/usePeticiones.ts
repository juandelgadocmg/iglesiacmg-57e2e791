import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePeticiones() {
  return useQuery({
    queryKey: ["peticiones_oracion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peticiones_oracion")
        .select("*, personas(nombres, apellidos, whatsapp, telefono)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePeticion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (peticion: any) => {
      const { data, error } = await supabase.from("peticiones_oracion").insert(peticion).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["peticiones_oracion"] }),
  });
}

export function useUpdatePeticion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("peticiones_oracion").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["peticiones_oracion"] }),
  });
}

export function useDeletePeticion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("peticiones_oracion").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["peticiones_oracion"] }),
  });
}
