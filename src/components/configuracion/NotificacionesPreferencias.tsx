import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NOTIF_PREF_KEYS, useNotificationPreferences, useSetNotificationPreference, useRoleNotificationPreferences, useSetRoleNotificationPreference } from "@/hooks/useNotificationPreferences";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROLES = ["admin", "super_admin", "pastor", "lider_red", "maestro", "tesoreria", "seminario_admin", "seminario_docente"];

export default function NotificacionesPreferencias() {
  const { data: prefs } = useNotificationPreferences();
  const setPref = useSetNotificationPreference();
  const { data: rolePrefs } = useRoleNotificationPreferences();
  const setRolePref = useSetRoleNotificationPreference();

  const { data: roleList } = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return [] as string[];
      const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", u.user.id);
      return (data || []).map((r: any) => r.role) as string[];
    },
  });

  const isRoleEnabled = (role: string, key: string) => {
    const r = (rolePrefs || []).find(p => p.role === role && p.pref_key === key);
    return r ? r.enabled : true;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mis notificaciones</CardTitle>
          <CardDescription>
            Activa o desactiva las alertas que quieres recibir.
            {roleList?.length ? <> Tu rol: {roleList.map(r => <Badge key={r} variant="outline" className="ml-1">{r}</Badge>)}</> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIF_PREF_KEYS.map(p => (
            <div key={p.key} className="flex items-start justify-between gap-3 border-b last:border-0 pb-3 last:pb-0">
              <div>
                <Label className="font-medium">{p.label}</Label>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
              <Switch
                checked={prefs?.[p.key] ?? true}
                onCheckedChange={async (v) => {
                  try {
                    await setPref.mutateAsync({ key: p.key, enabled: v });
                    toast.success("Preferencia actualizada");
                  } catch (e: any) { toast.error(e.message); }
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Defaults por rol</CardTitle>
            <CardDescription>Configuración aplicada a todos los usuarios de cada rol (puede ser sobreescrita por preferencia personal).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Alerta</th>
                    {ROLES.map(r => <th key={r} className="px-1 text-center font-medium">{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {NOTIF_PREF_KEYS.map(p => (
                    <tr key={p.key} className="border-b">
                      <td className="py-2 pr-2">{p.label}</td>
                      {ROLES.map(r => (
                        <td key={r} className="text-center px-1">
                          <Switch
                            checked={isRoleEnabled(r, p.key)}
                            onCheckedChange={async (v) => {
                              try {
                                await setRolePref.mutateAsync({ role: r, key: p.key, enabled: v });
                              } catch (e: any) { toast.error(e.message); }
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
