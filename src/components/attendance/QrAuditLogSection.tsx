import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle, BarChart3, ListChecks, Save, Trash2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import ExportDropdown from "@/components/shared/ExportDropdown";
import QrAlertPreferences from "@/components/attendance/QrAlertPreferences";

interface Preset {
  id: string;
  name: string;
  resultFilter: string;
  codeFilter: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface Row {
  id: string;
  user_id: string | null;
  persona_id: string | null;
  servicio_id: string | null;
  result: string;
  code: string | null;
  message: string | null;
  token: string | null;
  created_at: string;
}

interface AggRow {
  servicio_id: string | null;
  result: string;
  code: string | null;
  message: string | null;
  created_at: string;
}

const RESULT_STYLE: Record<string, string> = {
  ok: "bg-success/15 text-success",
  already: "bg-primary/15 text-primary",
  throttled: "bg-amber-500/15 text-amber-700",
  error: "bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 25;
const AGG_LIMIT = 1000;

export default function QrAuditLogSection({ servicioId }: { servicioId: string | null }) {
  const { roles } = useUserRoles();
  const { user } = useAuth();
  const canView = roles.some((r) => ["admin", "pastor", "secretaria"].includes(r as string));
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [codeFilter, setCodeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [retention, setRetention] = useState<any>(null);
  const [aggRows, setAggRows] = useState<AggRow[]>([]);
  const [aggLoading, setAggLoading] = useState(false);
  const [tab, setTab] = useState<string>("registros");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");

  const presetsKey = user?.id ? `qr-audit-presets-${user.id}` : null;

  useEffect(() => {
    if (!presetsKey) return;
    try {
      const raw = localStorage.getItem(presetsKey);
      setPresets(raw ? JSON.parse(raw) : []);
    } catch { setPresets([]); }
  }, [presetsKey]);

  const savePresets = (next: Preset[]) => {
    setPresets(next);
    if (presetsKey) localStorage.setItem(presetsKey, JSON.stringify(next));
  };

  const handleSavePreset = () => {
    const name = newPresetName.trim();
    if (!name) { toast({ title: "Nombre requerido", variant: "destructive" }); return; }
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      resultFilter, codeFilter, dateFrom, dateTo, search,
    };
    savePresets([...presets, preset]);
    setNewPresetName("");
    toast({ title: "Vista guardada", description: name });
  };

  const handleLoadPreset = (p: Preset) => {
    setResultFilter(p.resultFilter);
    setCodeFilter(p.codeFilter);
    setDateFrom(p.dateFrom);
    setDateTo(p.dateTo);
    setSearch(p.search);
    setPage(0);
    toast({ title: "Vista cargada", description: p.name });
  };

  const handleDeletePreset = (id: string) => {
    savePresets(presets.filter((p) => p.id !== id));
  };

  const applyFilters = (q: any, includeCode = true) => {
    if (servicioId) q = q.eq("servicio_id", servicioId);
    if (resultFilter !== "all") q = q.eq("result", resultFilter);
    if (includeCode && codeFilter !== "all") q = q.eq("code", codeFilter);
    if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`user_id.eq.${s},persona_id.eq.${s},token.eq.${s},message.ilike.%${s}%,code.ilike.%${s}%`);
    }
    return q;
  };

  const buildQuery = () => {
    let q = supabase
      .from("qr_scan_log")
      .select("id,user_id,persona_id,servicio_id,result,code,message,token,created_at", { count: "exact" });
    q = applyFilters(q);
    return q.order("created_at", { ascending: false });
  };

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    const from = page * PAGE_SIZE;
    const { data, count } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    setRows((data as Row[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const loadAgg = async () => {
    if (!canView) return;
    setAggLoading(true);
    let q = supabase.from("qr_scan_log").select("servicio_id,result,code,message,created_at");
    q = applyFilters(q, false);
    const { data } = await q.order("created_at", { ascending: false }).limit(AGG_LIMIT);
    setAggRows((data as AggRow[]) || []);
    setAggLoading(false);
  };

  const loadRetention = async () => {
    const { data } = await supabase.rpc("qr_scan_log_retention_status");
    setRetention(data);
  };

  useEffect(() => {
    if (!canView) return;
    load();
    loadRetention();
    const ch = supabase
      .channel(`qr-audit-${servicioId || "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qr_scan_log", ...(servicioId ? { filter: `servicio_id=eq.${servicioId}` } : {}) } as any,
        () => { if (page === 0) load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId, canView, page, resultFilter, codeFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    if (!canView) return;
    if (tab === "metricas" || tab === "fallos") loadAgg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, servicioId, resultFilter, dateFrom, dateTo, search, canView]);

  const exportData = useMemo(
    () =>
      rows.map((r) => ({
        fecha: new Date(r.created_at).toLocaleString("es-CO"),
        resultado: r.result,
        codigo: r.code || "",
        mensaje: r.message || "",
        user_id: r.user_id || "",
        persona_id: r.persona_id || "",
        token: r.token || "",
      })),
    [rows]
  );

  // Metrics
  const metrics = useMemo(() => {
    const total = aggRows.length;
    const okCount = aggRows.filter((r) => r.result === "ok").length;
    const dupCount = aggRows.filter((r) => r.result === "already").length;
    const errCount = aggRows.filter((r) => r.result === "error").length;
    const thrCount = aggRows.filter((r) => r.result === "throttled").length;
    const successRate = total ? (okCount / total) * 100 : 0;
    const dupRate = total ? (dupCount / total) * 100 : 0;

    // Per meeting
    const perMeeting = new Map<string, { total: number; ok: number; dup: number; err: number }>();
    for (const r of aggRows) {
      const key = r.servicio_id || "—";
      const m = perMeeting.get(key) || { total: 0, ok: 0, dup: 0, err: 0 };
      m.total++;
      if (r.result === "ok") m.ok++;
      else if (r.result === "already") m.dup++;
      else if (r.result === "error" || r.result === "throttled") m.err++;
      perMeeting.set(key, m);
    }
    const meetings = Array.from(perMeeting.entries())
      .map(([id, v]) => ({ id, ...v, okRate: v.total ? (v.ok / v.total) * 100 : 0, dupRate: v.total ? (v.dup / v.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Daily trend
    const perDay = new Map<string, { total: number; ok: number }>();
    for (const r of aggRows) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      const m = perDay.get(d) || { total: 0, ok: 0 };
      m.total++;
      if (r.result === "ok") m.ok++;
      perDay.set(d, m);
    }
    const days = Array.from(perDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14);

    return { total, okCount, dupCount, errCount, thrCount, successRate, dupRate, meetings, days };
  }, [aggRows]);

  // Failure grouping
  const failures = useMemo(() => {
    const fails = aggRows.filter((r) => r.result !== "ok" && r.result !== "already");
    const groups = new Map<string, { code: string; message: string; count: number; last: string }>();
    for (const r of fails) {
      const code = r.code || "sin_codigo";
      const msg = (r.message || "").slice(0, 120);
      const key = `${code}::${msg}`;
      const g = groups.get(key) || { code, message: msg, count: 0, last: r.created_at };
      g.count++;
      if (r.created_at > g.last) g.last = r.created_at;
      groups.set(key, g);
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [aggRows]);

  const uniqueCodes = useMemo(() => {
    const s = new Set<string>();
    aggRows.forEach((r) => { if (r.code) s.add(r.code); });
    return Array.from(s).sort();
  }, [aggRows]);

  const failuresExport = useMemo(
    () => failures.map((f) => ({
      codigo: f.code,
      mensaje: f.message,
      ocurrencias: f.count,
      ultima_fecha: new Date(f.last).toLocaleString("es-CO"),
    })),
    [failures]
  );

  if (!canView) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-primary" />
          Auditoría de escaneos QR
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          {retention && (
            <span className="text-[11px] text-muted-foreground">
              Retención: {retention.retention_days}d · {retention.total ?? 0} registros
              {retention.expired_pending_cleanup > 0 && ` · ${retention.expired_pending_cleanup} por limpiar`}
            </span>
          )}
          <ExportDropdown
            title="Auditoría de escaneos QR"
            filename={`qr-auditoria${servicioId ? `-${servicioId.slice(0,8)}` : ""}`}
            columns={[
              { header: "Fecha", key: "fecha" },
              { header: "Resultado", key: "resultado" },
              { header: "Código", key: "codigo" },
              { header: "Mensaje", key: "mensaje" },
              { header: "Usuario", key: "user_id" },
              { header: "Persona", key: "persona_id" },
              { header: "Token", key: "token" },
            ]}
            data={exportData}
            filters={{ servicioId, resultFilter, codeFilter, dateFrom, dateTo, search }}
          />
          <QrAlertPreferences />
          <Button variant="ghost" size="sm" onClick={() => { load(); if (tab !== "registros") loadAgg(); }} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-3">
          <Input
            placeholder="Buscar usuario, persona, token o mensaje…"
            value={search}
            onChange={(e) => { setPage(0); setSearch(e.target.value); }}
            className="h-9 sm:col-span-2"
          />
          <Select value={resultFilter} onValueChange={(v) => { setPage(0); setResultFilter(v); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Resultado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los resultados</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="already">Duplicado</SelectItem>
              <SelectItem value="throttled">Throttled</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={codeFilter} onValueChange={(v) => { setPage(0); setCodeFilter(v); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Código" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los códigos</SelectItem>
              {uniqueCodes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input type="date" value={dateFrom} onChange={(e) => { setPage(0); setDateFrom(e.target.value); }} className="h-9" />
            <Input type="date" value={dateTo} onChange={(e) => { setPage(0); setDateTo(e.target.value); }} className="h-9" />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="registros" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Registros</TabsTrigger>
            <TabsTrigger value="metricas" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Métricas</TabsTrigger>
            <TabsTrigger value="fallos" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Fallos</TabsTrigger>
          </TabsList>

          <TabsContent value="registros">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin registros para los filtros aplicados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Resultado</th>
                      <th className="py-2 pr-3">Código</th>
                      <th className="py-2 pr-3">Detalle</th>
                      <th className="py-2 pr-3">Persona</th>
                      <th className="py-2 pr-3">Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-3 whitespace-nowrap text-xs">
                          {new Date(r.created_at).toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge className={RESULT_STYLE[r.result] || ""}>{r.result}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs">{r.code || "—"}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{r.message || "—"}</td>
                        <td className="py-2 pr-3 text-xs">
                          {r.persona_id ? (
                            <Link
                              to={`/personas/${r.persona_id}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                              title="Abrir perfil de persona"
                            >
                              {r.persona_id.slice(0, 8)}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-[10px] font-mono text-muted-foreground">{r.token ? r.token.slice(0, 8) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>{total} registros · Página {page + 1} de {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading} className="h-7 px-2">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))} disabled={page + 1 >= totalPages || loading} className="h-7 px-2">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metricas">
            {aggLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando métricas…</p>
            ) : metrics.total === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin datos suficientes.</p>
            ) : (
              <div className="space-y-4">
                <div className="text-[11px] text-muted-foreground">
                  Basado en los últimos {metrics.total} eventos (máx {AGG_LIMIT}) según los filtros aplicados.
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <MetricTile label="Total" value={metrics.total} />
                  <MetricTile label="OK" value={metrics.okCount} tone="success" />
                  <MetricTile label="Duplicados" value={metrics.dupCount} tone="primary" />
                  <MetricTile label="Throttled" value={metrics.thrCount} tone="warning" />
                  <MetricTile label="Errores" value={metrics.errCount} tone="danger" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile label="Tasa de éxito" value={`${metrics.successRate.toFixed(1)}%`} tone="success" />
                  <MetricTile label="Tasa de duplicados" value={`${metrics.dupRate.toFixed(1)}%`} tone="primary" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Tendencia diaria (últimos 14 días)</h4>
                  <div className="flex items-end gap-1 h-24 border-b border-l pl-2 pb-1">
                    {metrics.days.map(([day, v]) => {
                      const max = Math.max(...metrics.days.map(([, x]) => x.total));
                      const totalH = max ? (v.total / max) * 100 : 0;
                      const okH = v.total ? (v.ok / v.total) * totalH : 0;
                      return (
                        <div key={day} className="flex-1 flex flex-col justify-end items-center gap-0.5" title={`${day}: ${v.ok}/${v.total} OK`}>
                          <div className="w-full bg-muted rounded-t" style={{ height: `${totalH}%` }}>
                            <div className="w-full bg-success rounded-t" style={{ height: `${totalH ? (okH / totalH) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground rotate-45 origin-left">{day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Top reuniones</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="py-1.5 pr-2">Reunión</th>
                          <th className="py-1.5 pr-2 text-right">Total</th>
                          <th className="py-1.5 pr-2 text-right">OK</th>
                          <th className="py-1.5 pr-2 text-right">Dup</th>
                          <th className="py-1.5 pr-2 text-right">Err</th>
                          <th className="py-1.5 pr-2 text-right">% Éxito</th>
                          <th className="py-1.5 pr-2 text-right">% Dup</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.meetings.map((m) => (
                          <tr key={m.id} className="border-b last:border-0">
                            <td className="py-1.5 pr-2 font-mono text-[10px]">{m.id === "—" ? "—" : m.id.slice(0, 8)}</td>
                            <td className="py-1.5 pr-2 text-right">{m.total}</td>
                            <td className="py-1.5 pr-2 text-right text-success">{m.ok}</td>
                            <td className="py-1.5 pr-2 text-right text-primary">{m.dup}</td>
                            <td className="py-1.5 pr-2 text-right text-destructive">{m.err}</td>
                            <td className="py-1.5 pr-2 text-right">{m.okRate.toFixed(1)}%</td>
                            <td className="py-1.5 pr-2 text-right">{m.dupRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fallos">
            <div className="flex justify-end mb-2">
              <ExportDropdown
                title="Análisis de fallos QR"
                filename={`qr-fallos${servicioId ? `-${servicioId.slice(0,8)}` : ""}`}
                columns={[
                  { header: "Código", key: "codigo" },
                  { header: "Mensaje", key: "mensaje" },
                  { header: "Ocurrencias", key: "ocurrencias" },
                  { header: "Última", key: "ultima_fecha" },
                ]}
                data={failuresExport}
                filters={{ servicioId, resultFilter, codeFilter, dateFrom, dateTo, search }}
              />
            </div>
            {aggLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando fallos…</p>
            ) : failures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin fallos registrados para los filtros aplicados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-3">Código</th>
                      <th className="py-2 pr-3">Mensaje</th>
                      <th className="py-2 pr-3 text-right">Ocurrencias</th>
                      <th className="py-2 pr-3">Última</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {failures.map((f) => (
                      <tr key={`${f.code}-${f.message}`} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-3"><Badge variant="outline" className="font-mono text-[10px]">{f.code}</Badge></td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{f.message || "—"}</td>
                        <td className="py-2 pr-3 text-right font-mono">{f.count}</td>
                        <td className="py-2 pr-3 text-xs whitespace-nowrap">{new Date(f.last).toLocaleString("es-CO")}</td>
                        <td className="py-2 pr-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setCodeFilter(f.code);
                              setPage(0);
                              setTab("registros");
                            }}
                          >
                            Ver registros
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function MetricTile({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "primary" | "warning" | "danger" }) {
  const toneMap = {
    neutral: "bg-muted/40 text-fg",
    success: "bg-success/10 text-success",
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-700",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <div className={`rounded-md px-3 py-2 ${toneMap[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-lg font-bold font-mono tabular-nums">{value}</div>
    </div>
  );
}
