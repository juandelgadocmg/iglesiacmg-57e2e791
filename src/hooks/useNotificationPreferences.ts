import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotifPrefKey {
  key: string;
  label: string;
  description: string;
}

export const NOTIF_PREF_KEYS: NotifPrefKey[] = [
  { key: "seminario.semestres_vencidos", label: "Seminario: semestres vencidos", description: "Estudiantes con materias pendientes de semestres anteriores" },
  { key: "seminario.pagos_mora", label: "Seminario: pagos en mora", description: "Alertas de pagos del seminario vencidos" },
  { key: "birthdays", label: "Cumpleaños próximos", description: "Avisos de cumpleaños dentro de los próximos 7 días" },
  { key: "events", label: "Eventos próximos", description: "Eventos programados en los próximos 14 días" },
  { key: "services", label: "Servicios y reuniones", description: "Reuniones programadas próximas" },
  { key: "payments", label: "Pagos pendientes", description: "Matrículas o pagos vencidos hace más de 30 días" },
];

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return {} as Record<string, boolean>;
      const sb = supabase as any;
      const [{ data: own }, { data: roles }] = await Promise.all([
        sb.from("notification_preferences").select("pref_key, enabled").eq("user_id", u.user.id),
        sb.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const roleKeys = (roles || []).map((r: any) => r.role);
      let roleDefaults: any[] = [];
      if (roleKeys.length) {
        const { data: rd } = await sb.from("notification_role_preferences")
          .select("pref_key, enabled").in("role", roleKeys);
        roleDefaults = rd || [];
      }
      const map: Record<string, boolean> = {};
      // Defaults: todo habilitado
      NOTIF_PREF_KEYS.forEach(k => { map[k.key] = true; });
      // Aplica defaults por rol
      roleDefaults.forEach((r: any) => { map[r.pref_key] = r.enabled; });
      // Aplica overrides del usuario
      (own || []).forEach((r: any) => { map[r.pref_key] = r.enabled; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("No autenticado");
      const sb = supabase as any;
      const { error } = await sb.from("notification_preferences")
        .upsert({ user_id: u.user.id, pref_key: key, enabled }, { onConflict: "user_id,pref_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
}

export function useRoleNotificationPreferences() {
  return useQuery({
    queryKey: ["role-notification-preferences"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb.from("notification_role_preferences")
        .select("role, pref_key, enabled");
      if (error) throw error;
      return (data || []) as { role: string; pref_key: string; enabled: boolean }[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetRoleNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, key, enabled }: { role: string; key: string; enabled: boolean }) => {
      const sb = supabase as any;
      const { error } = await sb.from("notification_role_preferences")
        .upsert({ role, pref_key: key, enabled }, { onConflict: "role,pref_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-notification-preferences"] });
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
