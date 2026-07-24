import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BellRing, Plus, Trash2, Play, History, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  sampleIds: string[];
}

interface HistoryRow {
  id: string;
  alert_id: string | null;
  rule_name: string;
  code: string | null;
  window_days: number;
  min_events: number;
  fail_rate_pct: number;
  total: number;
  fails: number;
  rate: number;
  sample_scan_ids: string[] | null;
  triggered_at: string;
}

async function evaluateRule(r: AlertRule): Promise<Evaluation> {
  const since = new Date(Date.now() - r.window_days * 86400_000).toISOString();
  let q = supabase
    .from("qr_scan_log")
    .select("id,result,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (r.servicio_id) q = q.eq("servicio_id", r.servicio_id);
  if (r.code) q = q.eq("code", r.code);
  const { data } = await q.limit(5000);
  const rows = (data as { id: string; result: string }[]) || [];
  const total = rows.length;
  const failRows = rows.filter((x) => x.result !== "ok" && x.result !== "already");
  const fails = failRows.length;
  const rate = total ? (fails / total) * 100 : 0;
  const triggered = total >= r.min_events && rate >= r.fail_rate_pct;
  return { rule: r, total, fails, rate, triggered, sampleIds: failRows.slice(0, 25).map((x) => x.id) };
}

export default function QrAuditAlertsManager({
  servicioId,
  onOpenScan,
}: {
  servicioId: string | null;
  onOpenScan?: (id: string) => void;
}) {
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [previewEval, setPreviewEval] = useState<Evaluation | null>(null);

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

  const loadHistory = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("qr_audit_alert_history")
      .select("*")
      .eq("user_id", user.id)
      .order("triggered_at", { ascending: false })
      .limit(50);
    setHistory((data as HistoryRow[]) || []);
  };

  useEffect(() => { loadRules(); loadHistory(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user?.id || rules.length === 0) { setEvals([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results: Evaluation[] = [];
      for (const r of rules.filter((x) => x.enabled)) {
        results.push(await evaluateRule(r));
      }
      if (!cancelled) {
        setEvals(results);
        // Log any newly triggered rules to history (dedupe by rule + last 1h)
        const triggered = results.filter((e) => e.triggered);
        if (triggered.length > 0) {
          const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
          const { data: recent } = await supabase
            .from("qr_audit_alert_history")
            .select("alert_id")
            .eq("user_id", user.id)
            .gte("triggered_at", oneHourAgo);
          const recentIds = new Set(((recent as { alert_id: string | null }[]) || []).map((x) => x.alert_id));
          const toInsert = triggered
            .filter((e) => !recentIds.has(e.rule.id))
            .map((e) => ({
              user_id: user.id,
              alert_id: e.rule.id,
              rule_name: e.rule.name,
              servicio_id: e.rule.servicio_id,
              code: e.rule.code,
              window_days: e.rule.window_days,
              min_events: e.rule.min_events,
              fail_rate_pct: e.rule.fail_rate_pct,
              total: e.total,
              fails: e.fails,
              rate: Number(e.rate.toFixed(2)),
              sample_scan_ids: e.sampleIds,
            }));
          if (toInsert.length > 0) {
            await supabase.from("qr_audit_alert_history").insert(toInsert);
            loadHistory();
          }
        }
      }
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

  const handleRunNow = async (r: AlertRule) => {
    if (!user?.id) return;
    setRunningId(r.id);
    setPreviewEval(null);
    try {
      const res = await evaluateRule(r);
      setPreviewEval(res);
      if (res.triggered) {
        const { error } = await supabase.from("qr_audit_alert_history").insert({
          user_id: user.id,
          alert_id: r.id,
          rule_name: r.name,
          servicio_id: r.servicio_id,
          code: r.code,
          window_days: r.window_days,
          min_events: r.min_events,
          fail_rate_pct: r.fail_rate_pct,
          total: res.total,
          fails: res.fails,
          rate: Number(res.rate.toFixed(2)),
          sample_scan_ids: res.sampleIds,
        });
        if (!error) loadHistory();
        toast({ title: "Regla disparada", description: `${res.fails}/${res.total} fallos (${res.rate.toFixed(1)}%)` });
      } else {
        toast({ title: "Regla no disparada", description: `${res.fails}/${res.total} fallos (${res.rate.toFixed(1)}%)` });
      }
    } finally {
      setRunningId(null);
    }
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
      <PopoverContent align="end" className="w-[420px] p-3">
        <Tabs defaultValue="rules">
          <TabsList className="w-full grid grid-cols-2 h-8">
            <TabsTrigger value="rules" className="text-xs">Reglas</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1"><History className="h-3 w-3" /> Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-3 mt-3">
            <div>
              <div className="text-xs font-semibold mb-1">Reglas activas</div>
              {loading && <p className="text-[11px] text-muted-foreground">Evaluando…</p>}
              {rules.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Sin reglas configuradas.</p>
              )}
              <div className="space-y-1 max-h-56 overflow-y-auto">
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
                        {e.rule.servicio_id ? "reunión específica · " : "todas · "}
                        ≥{e.rule.min_events} · {e.rule.fail_rate_pct}%
                      </div>
                      <div className="text-[10px]">
                        Actual: <span className="font-mono">{e.fails}/{e.total}</span> ({e.rate.toFixed(1)}%)
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title="Ejecutar ahora"
                      disabled={runningId === e.rule.id}
                      onClick={() => handleRunNow(e.rule)}
                    >
                      <Play className="h-3 w-3 text-primary" />
                    </Button>
                    <Switch checked={e.rule.enabled} onCheckedChange={() => handleToggle(e.rule)} />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDelete(e.rule.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {rules.filter((r) => !r.enabled).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 border border-border/60 opacity-60">
                    <div className="text-xs truncate flex-1">{r.name}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      title="Ejecutar ahora"
                      disabled={runningId === r.id}
                      onClick={() => handleRunNow(r)}
                    >
                      <Play className="h-3 w-3 text-primary" />
                    </Button>
                    <Switch checked={false} onCheckedChange={() => handleToggle(r)} />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {previewEval && (
              <div className="rounded border p-2 bg-muted/30">
                <div className="text-[11px] font-semibold mb-1 flex items-center justify-between">
                  <span>Vista previa: {previewEval.rule.name}</span>
                  <Badge variant={previewEval.triggered ? "destructive" : "outline"} className="h-4 px-1 text-[9px]">
                    {previewEval.triggered ? "dispararía" : "no dispara"}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mb-1">
                  {previewEval.fails}/{previewEval.total} ({previewEval.rate.toFixed(1)}%) · umbral {previewEval.rule.fail_rate_pct}% · mín {previewEval.rule.min_events}
                </div>
                {previewEval.sampleIds.length > 0 && onOpenScan && (
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    <div className="text-[10px] font-medium">Eventos que dispararían ({previewEval.sampleIds.length}):</div>
                    {previewEval.sampleIds.slice(0, 10).map((id) => (
                      <button
                        key={id}
                        onClick={() => onOpenScan(id)}
                        className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-2.5 w-2.5" /> {id.slice(0, 8)}…
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <div className="text-xs font-semibold mb-2">Últimas alertas disparadas</div>
            {history.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Sin historial aún.</p>
            )}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="rounded border border-border/60 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium truncate">{h.rule_name}</div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(h.triggered_at).toLocaleString("es-CO")}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {h.window_days}d · {h.code ? `code=${h.code} · ` : ""}umbral {h.fail_rate_pct}% · mín {h.min_events}
                  </div>
                  <div className="text-[10px] mt-0.5">
                    <span className="font-mono">{h.fails}/{h.total}</span> ({h.rate}%)
                  </div>
                  {h.sample_scan_ids && h.sample_scan_ids.length > 0 && onOpenScan && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {h.sample_scan_ids.slice(0, 6).map((id) => (
                        <button
                          key={id}
                          onClick={() => onOpenScan(id)}
                          className="text-[10px] font-mono text-primary hover:underline"
                          title="Abrir detalle del escaneo"
                        >
                          {id.slice(0, 8)}…
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
