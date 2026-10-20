import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Nino {
  id: string;
  nombres: string;
  apellidos: string;
  documento?: string;
  fecha_nacimiento?: string;
  sexo?: 'M' | 'F';
  telefono?: string;
  direccion?: string;
  grupo_id?: string;
  estado_iglesia?: string;
  foto_url?: string;
  
  // Detalles específicos
  detalles?: {
    codigo_interno?: string;
    qr_codigo?: string;
    contacto_emergencia?: string;
    info_medica?: string;
    alergias?: string;
    observaciones?: string;
    fecha_primera_asistencia?: string;
  };
}

export const useNinos = () => {
  const queryClient = useQueryClient();

  const fetchNinos = async (): Promise<Nino[]> => {
    // Obtenemos las personas que tienen 'Niño' en su array de tipos_persona
    const { data: personas, error } = await supabase
      .from("personas")
      .select(`
        *,
        detalles:infantil_detalles(*)
      `)
      .contains("tipos_persona", ["Niño"])
      .order('nombres', { ascending: true });

    if (error) {
      console.error("Error al obtener niños:", error);
      throw error;
    }

    return (personas || []).map(p => ({
      ...p,
      detalles: Array.isArray(p.detalles) ? (p.detalles[0] || {}) : (p.detalles || {})
    })) as Nino[];
  };

  const { data: ninos, isLoading, error } = useQuery({
    queryKey: ["infantil_ninos"],
    queryFn: fetchNinos,
  });

  const registrarNino = useMutation({
    mutationFn: async (nuevoNino: Partial<Nino> & { id?: string; detalles?: any }) => {
      let personaData: any;

      if (nuevoNino.id) {
        // Persona existente: asegurarse de agregar 'Niño' a tipos_persona y no duplicar
        const { data: existing, error: getErr } = await supabase
          .from("personas")
          .select("tipos_persona")
          .eq("id", nuevoNino.id)
          .single();

        if (getErr) throw getErr;

        const currentTipos: string[] = Array.isArray(existing?.tipos_persona) ? existing.tipos_persona : [];
        const nextTipos = currentTipos.includes("Niño") ? currentTipos : [...currentTipos, "Niño"];

        const { data: updated, error: updateErr } = await supabase
          .from("personas")
          .update({
            tipos_persona: nextTipos,
            ...(nuevoNino.documento ? { documento: nuevoNino.documento } : {}),
            ...(nuevoNino.fecha_nacimiento ? { fecha_nacimiento: nuevoNino.fecha_nacimiento } : {}),
            ...(nuevoNino.sexo ? { sexo: nuevoNino.sexo } : {}),
            ...(nuevoNino.direccion ? { direccion: nuevoNino.direccion } : {}),
          })
          .eq("id", nuevoNino.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        personaData = updated;
      } else {
        // 1. Crear la persona con tipos_persona: ["Niño"] exclusivamente
        const payload = {
          nombres: nuevoNino.nombres,
          apellidos: nuevoNino.apellidos,
          fecha_nacimiento: nuevoNino.fecha_nacimiento,
          sexo: nuevoNino.sexo,
          direccion: nuevoNino.direccion,
          documento: nuevoNino.documento || null,
          tipos_persona: ["Niño"],
          estado_iglesia: "Activo"
        };

        const { data: rpcCreated, error: rpcError } = await (supabase.rpc as any)(
          "create_persona_with_permission",
          { _payload: payload }
        );

        if (!rpcError && rpcCreated) {
          personaData = Array.isArray(rpcCreated) ? rpcCreated[0] : rpcCreated;
        } else {
          const { data: created, error: personaError } = await supabase
            .from("personas")
            .insert(payload)
            .select()
            .single();

          if (personaError) throw personaError;
          personaData = created;
        }
      }

      // 2. Crear o actualizar los detalles infantiles si existen
      if (nuevoNino.detalles && personaData) {
        const { error: detallesError } = await supabase
          .from("infantil_detalles")
          .upsert({
            persona_id: personaData.id,
            ...nuevoNino.detalles
          });

        if (detallesError) throw detallesError;
      }

      return personaData;
    },
    onSuccess: () => {
      toast.success("Niño registrado correctamente");
      queryClient.invalidateQueries({ queryKey: ["infantil_ninos"] });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
    onError: (error) => {
      toast.error("Error al registrar el niño: " + error.message);
    }
  });

  return {
    ninos,
    isLoading,
    error,
    registrarNino
  };
};
