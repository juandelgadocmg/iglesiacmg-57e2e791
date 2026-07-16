import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export type PermissionOverrides = Record<string, Partial<Record<AppRole, boolean>>>;

/** Fetch DB overrides for role/action permissions. Missing rows fall back to code defaults. */
export function useRolePermissions() {
  return useQuery({
    queryKey: ["role_permissions"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PermissionOverrides> => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, action_key, allowed");
      if (error) throw error;
      const map: PermissionOverrides = {};
      for (const row of data ?? []) {
        if (!map[row.action_key]) map[row.action_key] = {};
        map[row.action_key][row.role as AppRole] = row.allowed;
      }
      return map;
    },
  });
}

export function useUpsertRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role: AppRole; action_key: string; allowed: boolean }) => {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(input, { onConflict: "role,action_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role_permissions"] }),
  });
}

export function useResetRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { role: AppRole; action_key: string }) => {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .match(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role_permissions"] }),
  });
}
