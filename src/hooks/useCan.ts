import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveRole } from "@/hooks/useActiveRole";
import { canPerform, type ActionPermission } from "@/lib/permissions";

export function useCan() {
  const { roles } = useUserRoles();
  const { activeRole } = useActiveRole();
  const effectiveRoles = activeRole ? [activeRole as any] : roles;
  return (action: ActionPermission) => canPerform(effectiveRoles, action);
}
