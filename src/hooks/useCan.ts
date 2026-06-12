import { useUserRoles } from "@/hooks/useUserRoles";
import { canPerform, type ActionPermission } from "@/lib/permissions";

export function useCan() {
  const { roles } = useUserRoles();
  return (action: ActionPermission) => canPerform(roles, action);
}
