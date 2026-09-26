import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePublicEventos() {
  return useQuery({
    queryKey: ["public_eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("tipo", "Evento Abierto")
        .in("estado", ["Próximo", "En curso"])
        .order("fecha_inicio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useRegisterPublicEvent() {
  return useMutation({
    mutationFn: async (payload: {
      evento_id: string;
      nombre: string;
      apellidos: string;
      email: string;
      telefono: string;
      documento: string;
    }) => {
      const { data, error } = await supabase.rpc("register_public_event", {
        p_evento_id: payload.evento_id,
        p_nombre: payload.nombre,
        p_apellidos: payload.apellidos,
        p_email: payload.email,
        p_telefono: payload.telefono,
        p_documento: payload.documento,
      });
      if (error) throw error;
      return data;
    },
  });
}
