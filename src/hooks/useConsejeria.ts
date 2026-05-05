import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QK = {
  citas: ["citas_consejeria"] as const,
  horarios: ["consejeros_horarios"] as const,
  obs: (citaId: string) => ["observaciones_consejeria", citaId] as const,
};

// ============ HORARIOS ============
export function useConsejerosHorarios(consejeroId?: string) {
  return useQuery({
    queryKey: [...QK.horarios, consejeroId || "all"],
    queryFn: async () => {
      let q = supabase.from("consejeros_horarios").select("*").eq("activo", true);
      if (consejeroId) q = q.eq("consejero_persona_id", consejeroId);
      const { data, error } = await q.order("dia_semana").order("hora_inicio");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: any) => {
      const { error } = h.id
        ? await supabase.from("consejeros_horarios").update(h).eq("id", h.id)
        : await supabase.from("consejeros_horarios").insert(h);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.horarios });
      toast.success("Horario guardado");
    },
    onError: (e: any) => toast.error("Error", { description: e.message }),
  });
}

export function useDeleteHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consejeros_horarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.horarios });
      toast.success("Horario eliminado");
    },
  });
}

// ============ CITAS ============
export function useCitasConsejeria(filters?: {
  consejeroId?: string;
  modalidad?: string;
  desde?: string;
  hasta?: string;
  miUserId?: string;
}) {
  return useQuery({
    queryKey: [...QK.citas, filters],
    queryFn: async () => {
      let q = supabase.from("citas_consejeria").select("*").order("fecha", { ascending: false }).order("hora_inicio");
      if (filters?.consejeroId) q = q.eq("consejero_persona_id", filters.consejeroId);
      if (filters?.modalidad) q = q.eq("modalidad", filters.modalidad);
      if (filters?.desde) q = q.gte("fecha", filters.desde);
      if (filters?.hasta) q = q.lte("fecha", filters.hasta);
      if (filters?.miUserId) q = q.eq("solicitante_user_id", filters.miUserId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: any) => {
      const { data, error } = c.id
        ? await supabase.from("citas_consejeria").update(c).eq("id", c.id).select().single()
        : await supabase.from("citas_consejeria").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: QK.citas });
      toast.success(vars.id ? "Cita actualizada" : "Cita agendada");
    },
    onError: (e: any) => {
      const msg = String(e.message || "");
      if (msg.includes("uq_cita_slot_activa") || msg.includes("duplicate"))
        toast.error("Horario ocupado", { description: "Ya existe una cita en esa fecha y hora" });
      else toast.error("Error", { description: e.message });
    },
  });
}

export function useDeleteCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("citas_consejeria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.citas });
      toast.success("Cita eliminada");
    },
  });
}

// ============ SLOTS DISPONIBLES ============
export async function getSlotsDisponibles(consejeroId: string, fecha: string, modalidad: "presencial" | "virtual") {
  const date = new Date(fecha + "T00:00:00");
  const dia = date.getDay();
  const [{ data: horarios }, { data: ocupadas }] = await Promise.all([
    supabase.from("consejeros_horarios").select("*").eq("consejero_persona_id", consejeroId).eq("dia_semana", dia).eq("activo", true),
    supabase.from("citas_consejeria").select("hora_inicio,hora_fin").eq("consejero_persona_id", consejeroId).eq("fecha", fecha).neq("estado", "cancelada"),
  ]);
  const ocupadasSet = new Set((ocupadas || []).map((c: any) => c.hora_inicio.slice(0, 5)));
  const slots: { inicio: string; fin: string }[] = [];
  for (const h of horarios || []) {
    if (h.modalidad !== "ambas" && h.modalidad !== modalidad) continue;
    const [hi, mi] = h.hora_inicio.split(":").map(Number);
    const [hf, mf] = h.hora_fin.split(":").map(Number);
    const startMin = hi * 60 + mi;
    const endMin = hf * 60 + mf;
    const dur = h.duracion_minutos || 60;
    for (let s = startMin; s + dur <= endMin; s += dur) {
      const sH = String(Math.floor(s / 60)).padStart(2, "0");
      const sM = String(s % 60).padStart(2, "0");
      const eH = String(Math.floor((s + dur) / 60)).padStart(2, "0");
      const eM = String((s + dur) % 60).padStart(2, "0");
      const inicio = `${sH}:${sM}`;
      if (!ocupadasSet.has(inicio)) slots.push({ inicio, fin: `${eH}:${eM}` });
    }
  }
  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function useSlotsDisponibles(consejeroId?: string, fecha?: string, modalidad?: "presencial" | "virtual") {
  return useQuery({
    queryKey: ["slots", consejeroId, fecha, modalidad],
    enabled: !!consejeroId && !!fecha && !!modalidad,
    queryFn: () => getSlotsDisponibles(consejeroId!, fecha!, modalidad!),
  });
}

// ============ OBSERVACIONES ============
export function useObservaciones(citaId?: string) {
  return useQuery({
    queryKey: QK.obs(citaId || ""),
    enabled: !!citaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("observaciones_consejeria").select("*").eq("cita_id", citaId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertObservacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (o: any) => {
      const { error } = o.id
        ? await supabase.from("observaciones_consejeria").update(o).eq("id", o.id)
        : await supabase.from("observaciones_consejeria").insert(o);
      if (error) throw error;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: QK.obs(vars.cita_id) });
      qc.invalidateQueries({ queryKey: QK.citas });
      toast.success("Observación guardada");
    },
    onError: (e: any) => toast.error("Error", { description: e.message }),
  });
}
