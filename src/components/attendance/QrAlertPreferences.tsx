import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getQrAlertPrefs, setQrAlertPrefs } from "@/hooks/useQrScanNotifier";

export default function QrAlertPreferences() {
  const [prefs, setPrefs] = useState(getQrAlertPrefs());
  useEffect(() => {
    const onChange = () => setPrefs(getQrAlertPrefs());
    window.addEventListener("qr-alert-prefs-changed", onChange);
    return () => window.removeEventListener("qr-alert-prefs-changed", onChange);
  }, []);

  const update = (patch: Partial<ReturnType<typeof getQrAlertPrefs>>) => {
    setQrAlertPrefs(patch);
    setPrefs({ ...prefs, ...patch });
  };

  const test = () => {
    if (!prefs.enabled) {
      toast.warning("Las alertas están desactivadas");
      return;
    }
    toast.success("Alerta de prueba", {
      description: `Canal: ${prefs.channel === "polling" ? "Polling" : "Tiempo real (WebSocket)"}`,
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          {prefs.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          Alertas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="qr-alert-on" className="text-sm">Alertas en tiempo real</Label>
          <Switch id="qr-alert-on" checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Canal</Label>
          <Select value={prefs.channel} onValueChange={(v) => update({ channel: v as any })} disabled={!prefs.enabled}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="websocket">WebSocket (tiempo real)</SelectItem>
              <SelectItem value="polling">Polling (cada N segundos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {prefs.channel === "polling" && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Intervalo de polling (ms, mín 5000)</Label>
            <Input
              type="number"
              min={5000}
              step={1000}
              value={prefs.pollMs}
              onChange={(e) => update({ pollMs: Math.max(5000, Number(e.target.value) || 15000) })}
              className="h-9"
            />
          </div>
        )}
        <Button size="sm" variant="outline" onClick={test} className="w-full gap-1.5">
          <Send className="h-3.5 w-3.5" /> Enviar notificación de prueba
        </Button>
      </PopoverContent>
    </Popover>
  );
}
