import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { canPerformWithOverrides, type ActionPermission } from "@/lib/permissions";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export function useCan() {
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const { data: overrides } = useRolePermissions();
  const effectiveRoles = activeRole ? [activeRole as any] : roles;
  return (action: ActionPermission) =>
    canPerformWithOverrides(effectiveRoles, action, overrides?.[action]);
}
