import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NOTIF_PREF_KEYS, useNotificationPreferences, useSetNotificationPreference, useRoleNotificationPreferences, useSetRoleNotificationPreference } from "@/hooks/useNotificationPreferences";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Send } from "lucide-react";

const ROLES = ["admin", "super_admin", "pastor", "lider_red", "maestro", "tesoreria", "seminario_admin", "seminario_docente"];

type TestResult = { key: string; target: string; enabled: boolean; ok: boolean; reason: string };

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
  const isAdmin = (roleList || []).some(r => r === "admin" || r === "super_admin");

  const isRoleEnabled = (role: string, key: string) => {
    const r = (rolePrefs || []).find(p => p.role === role && p.pref_key === key);
    return r ? r.enabled : true;
  };

  // Test de notificaciones
  const [testMode, setTestMode] = useState<"rol" | "usuario">("rol");
  const [testRole, setTestRole] = useState<string>("admin");
  const [testEmail, setTestEmail] = useState<string>("");
  const [testKey, setTestKey] = useState<string>(NOTIF_PREF_KEYS[0].key);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    try {
      const sb = supabase as any;
      const results: TestResult[] = [];
      if (testMode === "rol") {
        const { data: users } = await sb.from("user_roles").select("user_id").eq("role", testRole);
        const userIds: string[] = (users || []).map((u: any) => u.user_id);
        if (!userIds.length) {
          results.push({ key: testKey, target: testRole, enabled: false, ok: false, reason: "No hay usuarios con ese rol" });
        } else {
          const roleDefault = isRoleEnabled(testRole, testKey);
          const { data: ownPrefs } = await sb.from("notification_preferences")
            .select("user_id, enabled").eq("pref_key", testKey).in("user_id", userIds);
          const overrides = new Map((ownPrefs || []).map((p: any) => [p.user_id, p.enabled]));
          userIds.forEach(uid => {
            const enabled = overrides.has(uid) ? overrides.get(uid) as boolean : roleDefault;
            results.push({
              key: testKey, target: uid.slice(0, 8), enabled,
              ok: enabled,
              reason: enabled ? "Recibiría la alerta" : (overrides.has(uid) ? "Desactivada por el usuario" : `Desactivada en defaults del rol ${testRole}`),
            });
          });
        }
      } else {
        if (!testEmail.trim()) { toast.error("Ingresa un email"); setTesting(false); return; }
        // Buscar user_id por email en profiles
        const { data: prof } = await sb.from("profiles").select("user_id, display_name").ilike("display_name", `%${testEmail.trim()}%`).limit(5);
        if (!prof?.length) {
          results.push({ key: testKey, target: testEmail, enabled: false, ok: false, reason: "Usuario no encontrado en profiles" });
        } else {
          for (const u of prof) {
            const { data: own } = await sb.from("notification_preferences")
              .select("enabled").eq("user_id", u.user_id).eq("pref_key", testKey).maybeSingle();
            const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", u.user_id);
            const roleEnabled = (roles || []).some((r: any) => isRoleEnabled(r.role, testKey));
            const enabled = own ? own.enabled : roleEnabled;
            results.push({
              key: testKey, target: u.display_name, enabled,
              ok: enabled,
              reason: enabled ? "Recibiría la alerta" : (own ? "Desactivada por el usuario" : "Desactivada en defaults de sus roles"),
            });
          }
        }
      }
      setTestResults(results);
      const okCount = results.filter(r => r.ok).length;
      if (okCount === 0) toast.warning("Ningún destinatario recibiría esta alerta");
      else toast.success(`${okCount} de ${results.length} recibirían la alerta`);
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      <MensajesToastPrefsCard />
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

      <Card>
        <CardHeader>
          <CardTitle>Probar envío de notificaciones</CardTitle>
          <CardDescription>Verifica si una alerta concreta llegaría a los usuarios de un rol o a un usuario específico, según sus preferencias actuales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Modo</Label>
              <Select value={testMode} onValueChange={(v: any) => setTestMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rol">Por rol</SelectItem>
                  <SelectItem value="usuario">Por usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Alerta</Label>
              <Select value={testKey} onValueChange={setTestKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTIF_PREF_KEYS.map(k => <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {testMode === "rol" ? (
              <div>
                <Label className="text-xs">Rol</Label>
                <Select value={testRole} onValueChange={setTestRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="md:col-span-1">
                <Label className="text-xs">Nombre / email</Label>
                <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Buscar usuario..." />
              </div>
            )}
            <div className="flex items-end">
              <Button size="sm" onClick={runTest} disabled={testing} className="w-full">
                <Send className="h-4 w-4 mr-1" />{testing ? "Probando..." : "Probar"}
              </Button>
            </div>
          </div>

          {testResults.length > 0 && (
            <div className="border rounded p-2 max-h-72 overflow-y-auto">
              <p className="text-xs font-semibold mb-2">
                Resultado: {testResults.filter(r => r.ok).length} de {testResults.length} recibirían "{NOTIF_PREF_KEYS.find(k => k.key === testKey)?.label}"
              </p>
              <div className="space-y-1">
                {testResults.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs border-b last:border-0 py-1">
                    <span className="font-medium">{r.target}</span>
                    <span className={r.ok ? "text-green-600 flex items-center gap-1" : "text-destructive flex items-center gap-1"}>
                      {r.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {r.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
