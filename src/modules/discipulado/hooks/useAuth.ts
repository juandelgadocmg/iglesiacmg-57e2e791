import { useAuth as useDoxaAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type UserRole = "ADMIN" | "LIDER" | null;

export function useAuth() {
  const { session, user, loading, signOut } = useDoxaAuth();
  const { roles, isLoading: rolesLoading } = useUserRoles();

  // Map DOXA roles to Discipulando expected uppercase roles
  const role: UserRole =
    roles.includes("admin") || roles.includes("super_admin") || roles.includes("pastor")
      ? "ADMIN"
      : roles.includes("lider")
      ? "LIDER"
      : null;

  // Query leaderProfile from leaders table using auth user id
  const leaderQuery = useQuery({
    queryKey: ["discipulado_leader_profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("id, full_name, email")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    user,
    session,
    role,
    leaderProfile: leaderQuery.data ?? (user ? {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Administrador",
      email: user.email ?? null,
    } : null),
    loading: loading || rolesLoading || (user ? leaderQuery.isLoading : false),
    signOut,
  };
}
