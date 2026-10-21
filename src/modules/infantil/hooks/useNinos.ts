import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TIPO_GRUPO_INFANTIL, isExcluidoDeInfantil } from "@/hooks/useInfantil";

const LOCAL_NINO_GRUPO_MAP_KEY = "doxa_infantil_nino_grupos";

export function getSavedInfantilGrupoMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_NINO_GRUPO_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return {};
}

export function saveInfantilGrupoForNino(ninoId: string, grupoId: string) {
  if (!ninoId || !grupoId) return;
  try {
    const map = getSavedInfantilGrupoMap();
    map[ninoId] = grupoId;
    localStorage.setItem(LOCAL_NINO_GRUPO_MAP_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Calcula el grupo infantil que corresponde a un niño según su fecha de nacimiento
 * o devuelve el primer grupo infantil disponible como respaldo.
 */
export function matchInfantilGrupoByAge(
  fechaNacimiento?: string | null,
  grupos?: any[] | null
): any | null {
  if (!grupos || grupos.length === 0) return null;

  if (fechaNacimiento) {
    const birth = new Date(fechaNacimiento);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (age >= 0 && age <= 18) {
        for (const g of grupos) {
          const minDet = g.detalles?.edad_minima;
          const maxDet = g.detalles?.edad_maxima;
          if (typeof minDet === "number" && typeof maxDet === "number") {
            if (age >= minDet && age <= maxDet) return g;
          }
          const text = `${g.nombre || ""} ${g.edades || ""} ${g.descripcion || ""}`;
          const rangeMatch = text.match(/(\d+)\s*(?:-|a|–)\s*(\d+)/i);
          if (rangeMatch) {
            const min = parseInt(rangeMatch[1], 10);
            const max = parseInt(rangeMatch[2], 10);
            if (!isNaN(min) && !isNaN(max) && age >= min && age <= max) {
              return g;
            }
          }
        }
      }
    }
  }

  return grupos[0] || null;
}

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
    // 1. Obtener grupos infantiles válidos para verificar/asignar grupo_id correctamente
    const { data: rawGrupos } = await supabase
      .from("grupos")
      .select("*")
      .eq("tipo", TIPO_GRUPO_INFANTIL)
      .order("nombre", { ascending: true });

    const gruposInfantil = (rawGrupos || []).filter(
      (g: any) => !isExcluidoDeInfantil(g.nombre) && !isExcluidoDeInfantil(g.descripcion)
    );
    const infantilGrupoIds = new Set(gruposInfantil.map((g: any) => g.id));
    const localGrupoMap = getSavedInfantilGrupoMap();

    // 2. Obtenemos las personas que tienen 'Niño' en su array de tipos_persona
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

    const toRepair: Array<{ ninoId: string; targetGrupoId: string }> = [];

    const result = (personas || []).map(p => {
      let effectiveGrupoId = p.grupo_id;

      // Si el niño fue vinculado desde la membresía general, su p.grupo_id puede ser null
      // o apuntar a una Casa de Paz (no a un grupo infantil). En ese caso le asignamos su grupo infantil.
      if (!effectiveGrupoId || (infantilGrupoIds.size > 0 && !infantilGrupoIds.has(effectiveGrupoId))) {
        const savedLocal = localGrupoMap[p.id];
        if (savedLocal && infantilGrupoIds.has(savedLocal)) {
          effectiveGrupoId = savedLocal;
        } else {
          const matched = matchInfantilGrupoByAge(p.fecha_nacimiento, gruposInfantil);
          if (matched?.id) {
            effectiveGrupoId = matched.id;
          }
        }

        if (effectiveGrupoId && effectiveGrupoId !== p.grupo_id) {
          saveInfantilGrupoForNino(p.id, effectiveGrupoId);
          toRepair.push({ ninoId: p.id, targetGrupoId: effectiveGrupoId });
        }
      }

      return {
        ...p,
        grupo_id: effectiveGrupoId || p.grupo_id,
        detalles: Array.isArray(p.detalles) ? (p.detalles[0] || {}) : (p.detalles || {})
      };
    }) as Nino[];

    // Reparar en segundo plano los registros de niños vinculados desde membresía y sus asistencias sin grupo infantil
    if (toRepair.length > 0) {
      Promise.allSettled(
        toRepair.map(async ({ ninoId, targetGrupoId }) => {
          await supabase
            .from("personas")
            .update({ grupo_id: targetGrupoId })
            .eq("id", ninoId);

          // Reparar asistencias cuyo grupo_id no sea un grupo infantil válido
          const { data: asisRows } = await supabase
            .from("infantil_asistencia_checkin")
            .select("id, grupo_id")
            .eq("nino_id", ninoId);

          const invalidAsisIds = (asisRows || [])
            .filter((r: any) => !r.grupo_id || !infantilGrupoIds.has(r.grupo_id))
            .map((r: any) => r.id);

          if (invalidAsisIds.length > 0) {
            await supabase
              .from("infantil_asistencia_checkin")
              .update({ grupo_id: targetGrupoId })
              .in("id", invalidAsisIds);
          }
        })
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
        queryClient.invalidateQueries({ queryKey: ["infantil_asistencia"] });
      });
    }

    return result;
  };

  const { data: ninos, isLoading, error } = useQuery({
    queryKey: ["infantil_ninos"],
    queryFn: fetchNinos,
  });

  const registrarNino = useMutation({
    mutationFn: async (nuevoNino: Partial<Nino> & { id?: string; detalles?: any }) => {
      let personaData: any;

      // Resolver grupo infantil si no viene explícito
      let resolvedGrupoId = nuevoNino.grupo_id;
      if (!resolvedGrupoId) {
        const { data: rawGrupos } = await supabase
          .from("grupos")
          .select("*")
          .eq("tipo", TIPO_GRUPO_INFANTIL)
          .order("nombre", { ascending: true });
        const gruposInfantil = (rawGrupos || []).filter(
          (g: any) => !isExcluidoDeInfantil(g.nombre) && !isExcluidoDeInfantil(g.descripcion)
        );
        resolvedGrupoId = matchInfantilGrupoByAge(nuevoNino.fecha_nacimiento, gruposInfantil)?.id;
      }

      if (nuevoNino.id) {
        // Persona existente (llamada desde membresía): agregar 'Niño' a tipos_persona y asignar su grupo infantil
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
            ...(nuevoNino.nombres ? { nombres: nuevoNino.nombres } : {}),
            ...(nuevoNino.apellidos ? { apellidos: nuevoNino.apellidos } : {}),
            ...(nuevoNino.documento ? { documento: nuevoNino.documento } : {}),
            ...(nuevoNino.fecha_nacimiento ? { fecha_nacimiento: nuevoNino.fecha_nacimiento } : {}),
            ...(nuevoNino.sexo ? { sexo: nuevoNino.sexo } : {}),
            ...(nuevoNino.direccion ? { direccion: nuevoNino.direccion } : {}),
            ...(resolvedGrupoId ? { grupo_id: resolvedGrupoId } : {}),
          })
          .eq("id", nuevoNino.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        personaData = updated;
      } else {
        // 1. Crear la persona con tipos_persona: ["Niño"] y su grupo_id infantil
        const payload: Record<string, any> = {
          nombres: nuevoNino.nombres,
          apellidos: nuevoNino.apellidos,
          fecha_nacimiento: nuevoNino.fecha_nacimiento,
          sexo: nuevoNino.sexo,
          direccion: nuevoNino.direccion,
          documento: nuevoNino.documento || null,
          ...(resolvedGrupoId ? { grupo_id: resolvedGrupoId } : {}),
          tipos_persona: ["Niño"],
          estado_iglesia: "Activo"
        };

        const { data: rpcCreated, error: rpcError } = await (supabase.rpc as any)(
          "create_persona_with_permission",
          { _payload: payload }
        );

        if (!rpcError && rpcCreated) {
          personaData = Array.isArray(rpcCreated) ? rpcCreated[0] : rpcCreated;
          if (resolvedGrupoId && personaData?.id && personaData.grupo_id !== resolvedGrupoId) {
            const { data: patched } = await supabase
              .from("personas")
              .update({ grupo_id: resolvedGrupoId })
              .eq("id", personaData.id)
              .select()
              .single();
            if (patched) personaData = patched;
          }
        } else {
          const { data: created, error: personaError } = await supabase
            .from("personas")
            .insert(payload as any)
            .select()
            .single();

          if (personaError) throw personaError;
          personaData = created;
        }
      }

      if (personaData?.id && resolvedGrupoId) {
        saveInfantilGrupoForNino(personaData.id, resolvedGrupoId);
        // Asegurar que cualquier asistencia previa del niño tenga el grupo infantil asignado
        await supabase
          .from("infantil_asistencia_checkin")
          .update({ grupo_id: resolvedGrupoId })
          .eq("nino_id", personaData.id);
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
      toast.success("Niño registrado y asignado al grupo correctamente");
      queryClient.invalidateQueries({ queryKey: ["infantil_ninos"] });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencia"] });
    },
    onError: (error) => {
      toast.error("Error al registrar el niño: " + error.message);
    }
  });

  const actualizarGrupoNino = useMutation({
    mutationFn: async ({ ninoId, grupoId }: { ninoId: string; grupoId: string }) => {
      saveInfantilGrupoForNino(ninoId, grupoId);
      const { error: errPersona } = await supabase
        .from("personas")
        .update({ grupo_id: grupoId })
        .eq("id", ninoId);
      if (errPersona) throw errPersona;

      await supabase
        .from("infantil_asistencia_checkin")
        .update({ grupo_id: grupoId })
        .eq("nino_id", ninoId);

      return { ninoId, grupoId };
    },
    onSuccess: () => {
      toast.success("Grupo infantil actualizado");
      queryClient.invalidateQueries({ queryKey: ["infantil_ninos"] });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencia"] });
    },
    onError: (error: any) => {
      toast.error("Error al actualizar el grupo: " + (error?.message || "Intenta de nuevo"));
    }
  });

  return {
    ninos,
    isLoading,
    error,
    registrarNino,
    actualizarGrupoNino
  };
};
