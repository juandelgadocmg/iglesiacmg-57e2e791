import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, ShieldCheck, Search } from "lucide-react";
import {
  ACTION_GROUPS, ACTION_PERMISSIONS, ALL_ROLES, ROLE_LABELS, type ActionPermission,
} from "@/lib/permissions";
import type { Database } from "@/integrations/supabase/types";
import {
  useRolePermissions, useUpsertRolePermission, useResetRolePermission,
} from "@/hooks/useRolePermissions";

type AppRole = Database["public"]["Enums"]["app_role"];

function isAllowed(
  role: AppRole,
  action: ActionPermission,
  overrides: Partial<Record<AppRole, boolean>> | undefined,
): boolean {
  if (role === "admin" || role === "super_admin") return true;
  const override = overrides?.[role];
  if (typeof override === "boolean") return override;
  return (ACTION_PERMISSIONS[action] ?? []).includes(role);
}

function hasOverride(
  role: AppRole,
  overrides: Partial<Record<AppRole, boolean>> | undefined,
): boolean {
  return typeof overrides?.[role] === "boolean";
}

export default function PermisosMatriz() {
  const { data: overrides, isLoading } = useRolePermissions();
  const upsert = useUpsertRolePermission();
  const reset = useResetRolePermission();
  const [q, setQ] = useState("");

  const filteredGroups = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ACTION_GROUPS;
    return ACTION_GROUPS
      .map((g) => ({
        ...g,
        actions: g.actions.filter(
          (a) => a.label.toLowerCase().includes(query) || g.module.toLowerCase().includes(query),
        ),
      }))
      .filter((g) => g.actions.length > 0);
  }, [q]);

  const toggle = async (role: AppRole, action: ActionPermission, next: boolean) => {
    try {
      await upsert.mutateAsync({ role, action_key: action, allowed: next });
      toast.success("Permiso actualizado", {
        description: `${ROLE_LABELS[role]} · ${action} → ${next ? "permitido" : "denegado"}`,
      });
    } catch (e: any) {
      toast.error("No se pudo actualizar", { description: e?.message });
    }
  };

  const resetOne = async (role: AppRole, action: ActionPermission) => {
    try {
      await reset.mutateAsync({ role, action_key: action });
      toast.success("Restaurado al valor por defecto");
    } catch (e: any) {
      toast.error("No se pudo restaurar", { description: e?.message });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Matriz de Permisos
              </CardTitle>
              <CardDescription className="mt-1">
                Personaliza qué acciones puede ejecutar cada rol. <strong>Admin</strong> y{" "}
                <strong>Super Admin</strong> siempre tienen acceso completo. Los cambios se aplican en
                tiempo real a toda la plataforma.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar acción o módulo…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="text-sm text-muted-foreground p-8 text-center">Cargando matriz…</div>
      )}

      {!isLoading && filteredGroups.map((group) => (
        <Card key={group.module}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.module}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-y">
                <tr>
                  <th className="text-left px-3 py-2 font-medium sticky left-0 bg-muted/40 min-w-[220px]">
                    Acción
                  </th>
                  {ALL_ROLES.map((r) => (
                    <th key={r} className="px-2 py-2 font-medium text-center min-w-[90px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{ROLE_LABELS[r]}</span>
                        {(r === "admin" || r === "super_admin") && (
                          <Badge variant="secondary" className="text-[9px] py-0 px-1">full</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.actions.map((a) => {
                  const actionOverrides = overrides?.[a.key];
                  return (
                    <tr key={a.key} className="border-b hover:bg-muted/20">
                      <td className="px-3 py-2 sticky left-0 bg-background">
                        <div className="font-medium">{a.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{a.key}</div>
                      </td>
                      {ALL_ROLES.map((r) => {
                        const locked = r === "admin" || r === "super_admin";
                        const checked = isAllowed(r, a.key, actionOverrides);
                        const overridden = hasOverride(r, actionOverrides);
                        return (
                          <td key={r} className="px-2 py-2 text-center">
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <Checkbox
                                checked={checked}
                                disabled={locked || upsert.isPending}
                                onCheckedChange={(v) => toggle(r, a.key, Boolean(v))}
                              />
                              {overridden && !locked && (
                                <button
                                  type="button"
                                  onClick={() => resetOne(r, a.key)}
                                  className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                                  title="Restaurar al valor por defecto"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" /> reset
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
