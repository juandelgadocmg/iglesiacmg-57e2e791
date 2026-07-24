import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BellRing, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface AlertRule {
  id: string;
  name: string;
  servicio_id: string | null;
  code: string | null;
  window_days: number;
  min_events: number;
  fail_rate_pct: number;
  enabled: boolean;
}

interface Evaluation {
  rule: AlertRule;
  total: number;
  fails: number;
  rate: number;
  triggered: boolean;
}

export default function QrAuditAlertsManager({ servicioId }: { servicioId: string | null }) {
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [windowDays, setWindowDays] = useState(7);
  const [minEvents, setMinEvents] = useState(10);
  const [failRate, setFailRate] = useState(20);
  const [scopeToMeeting, setScopeToMeeting] = useState(false);

  const loadRules = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("qr_audit_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRules((data as AlertRule[]) || []);
  };

  useEffect(() => { loadRules(); /* eslint-disable-next-line */ }, [user?.id]);

  // Evaluate rules against qr_scan_log
  useEffect(() => {
    if (!user?.id || rules.length === 0) { setEvals([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results: Evaluation[] = [];
      for (const r of rules.filter((x) => x.enabled)) {
        const since = new Date(Date.now() - r.window_days * 86400_000).toISOString();
        let q = supabase
          .from("qr_scan_log")
          .select("result", { count: "exact", head: false })
          .gte("created_at", since);
        if (r.servicio_id) q = q.eq("servicio_id", r.servicio_id);
        if (r.code) q = q.eq("code", r.code);
        const { data } = await q.limit(5000);
        const rows = (data as { result: string }[]) || [];
        const total = rows.length;
        const fails = rows.filter((x) => x.result !== "ok" && x.result !== "already").length;
        const rate = total ? (fails / total) * 100 : 0;
        const triggered = total >= r.min_events && rate >= r.fail_rate_pct;
        results.push({ rule: r, total, fails, rate, triggered });
      }
      if (!cancelled) setEvals(results);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [rules, user?.id]);

  const triggered = evals.filter((e) => e.triggered);

  const handleCreate = async () => {
    if (!user?.id) return;
    if (!name.trim()) { toast({ title: "Nombre requerido", variant: "destructive" }); return; }
    const { error } = await supabase.from("qr_audit_alerts").insert({
      user_id: user.id,
      name: name.trim(),
      servicio_id: scopeToMeeting ? servicioId : null,
      code: code.trim() || null,
      window_days: windowDays,
      min_events: minEvents,
      fail_rate_pct: failRate,
      enabled: true,
    });
    if (error) { toast({ title: "No se pudo crear la alerta", description: error.message, variant: "destructive" }); return; }
    setName(""); setCode("");
    toast({ title: "Alerta creada" });
    loadRules();
  };

  const handleToggle = async (r: AlertRule) => {
    await supabase.from("qr_audit_alerts").update({ enabled: !r.enabled }).eq("id", r.id);
    loadRules();
  };
  const handleDelete = async (id: string) => {
    await supabase.from("qr_audit_alerts").delete().eq("id", id);
    loadRules();
  };

  const label = useMemo(() => triggered.length > 0 ? `Alertas (${triggered.length})` : "Alertas", [triggered.length]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={triggered.length > 0 ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
          title="Alertas de tasa de fallos"
        >
          {triggered.length > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-3">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold mb-1">Reglas activas</div>
            {loading && <p className="text-[11px] text-muted-foreground">Evaluando…</p>}
            {rules.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Sin reglas configuradas.</p>
            )}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {evals.map((e) => (
                <div
                  key={e.rule.id}
                  className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 border ${
                    e.triggered ? "border-destructive/40 bg-destructive/5" : "border-border/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate flex items-center gap-1">
                      {e.rule.name}
                      {e.triggered && <Badge variant="destructive" className="h-4 px-1 text-[9px]">disparada</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {e.rule.window_days}d · {e.rule.code ? `code=${e.rule.code} · ` : ""}
                      {e.rule.servicio_id ? "reunión específica · " : "todas las reuniones · "}
                      ≥{e.rule.min_events} eventos · {e.rule.fail_rate_pct}%
                    </div>
                    <div className="text-[10px]">
                      Actual: <span className="font-mono">{e.fails}/{e.total}</span> ({e.rate.toFixed(1)}%)
                    </div>
                  </div>
                  <Switch checked={e.rule.enabled} onCheckedChange={() => handleToggle(e.rule)} />
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDelete(e.rule.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {rules.filter((r) => !r.enabled).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 border border-border/60 opacity-60">
                  <div className="text-xs truncate">{r.name}</div>
                  <Switch checked={false} onCheckedChange={() => handleToggle(r)} />
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-2">
            <div className="text-xs font-semibold mb-2">Nueva regla</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px]">Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" placeholder="Ej: Fallos altos QR" />
              </div>
              <div>
                <Label className="text-[10px]">Ventana (días)</Label>
                <Input type="number" min={1} max={90} value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Mín. eventos</Label>
                <Input type="number" min={1} value={minEvents} onChange={(e) => setMinEvents(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">% fallos ≥</Label>
                <Input type="number" min={0} max={100} value={failRate} onChange={(e) => setFailRate(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Código (opcional)</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-xs" placeholder="qr_inactive…" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={scopeToMeeting} onCheckedChange={setScopeToMeeting} disabled={!servicioId} />
                <span className="text-[11px] text-muted-foreground">
                  Limitar a esta reunión {servicioId ? "" : "(selecciona una reunión primero)"}
                </span>
              </div>
              <Button size="sm" onClick={handleCreate} className="col-span-2 h-8 gap-1">
                <Plus className="h-3.5 w-3.5" /> Crear regla
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
