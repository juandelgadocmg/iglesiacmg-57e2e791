import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMsgToastPrefs } from "@/hooks/useMensajes";
import { Bell } from "lucide-react";

export default function MensajesToastPrefsCard() {
  const [prefs, setPrefs] = useMsgToastPrefs();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" /> Notificaciones internas de Mensajes
        </CardTitle>
        <CardDescription>
          Configura los avisos emergentes (toast) que aparecen en este navegador cuando llega un nuevo mensaje.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="msg-toast-enabled" className="text-sm font-medium">Activar notificaciones internas</Label>
            <p className="text-xs text-muted-foreground">Muestra un aviso emergente al recibir un mensaje nuevo.</p>
          </div>
          <Switch
            id="msg-toast-enabled"
            checked={prefs.enabled}
            onCheckedChange={(v) => setPrefs({ ...prefs, enabled: v })}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="msg-toast-inbox" className="text-sm font-medium">Sólo notificar mensajes de Entrada</Label>
            <p className="text-xs text-muted-foreground">
              Omite hilos archivados, eliminados o donde tú eres el remitente.
            </p>
          </div>
          <Switch
            id="msg-toast-inbox"
            checked={prefs.onlyInbox}
            disabled={!prefs.enabled}
            onCheckedChange={(v) => setPrefs({ ...prefs, onlyInbox: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
