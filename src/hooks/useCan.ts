import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { canPerformWithOverrides, type ActionPermission } from "@/lib/permissions";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export function useCan() {
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const { data: overrides } = useRolePermissions();
  const activeRoleList = activeRole ? [activeRole as any] : [];

  return (action: ActionPermission) =>
    canPerformWithOverrides(roles, action, overrides?.[action]) ||
    canPerformWithOverrides(activeRoleList, action, overrides?.[action]);
}
