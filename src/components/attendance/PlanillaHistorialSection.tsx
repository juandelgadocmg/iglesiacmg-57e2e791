import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History, FileText, ShieldCheck, ShieldAlert, ShieldQuestion, Copy, Check,
  Download, FileSpreadsheet, Printer, RotateCcw, ChevronDown, ChevronRight, PenLine,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  PlanillaSnapshot, computeHash, renderPlanillaHtml, renderPlanillaExcelBlob,
} from "@/lib/planillaRender";

interface Props {
  servicioId?: string | null;
  onReopen?: (v: { id: string; version: number }) => void;
}

const FORMATO_LABEL: Record<string, string> = { pdf: "PDF", html: "HTML", excel: "Excel" };
const ACCION_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  created:  { label: "Firma creada",     color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/30", icon: PenLine },
  replaced: { label: "Firma reemplazada", color: "text-amber-700 bg-amber-500/10 border-amber-500/30",     icon: PenLine },
  cleared:  { label: "Firma borrada",    color: "text-red-700 bg-red-500/10 border-red-500/30",             icon: PenLine },
};

function detectDevice(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconocido";
  const s = ua.toLowerCase();
  if (s.includes("iphone")) return "iPhone";
  if (s.includes("ipad")) return "iPad";
  if (s.includes("android")) return "Android";
  if (s.includes("mac os")) return "Mac";
  if (s.includes("windows")) return "Windows";
  if (s.includes("linux")) return "Linux";
  return "Otro";
}

type VerifyState = "checking" | "ok" | "mismatch" | "missing";

export default function PlanillaHistorialSection({ servicioId, onReopen }: Props) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [hashInput, setHashInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; msg: string; found?: any }>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [verifyMap, setVerifyMap] = useState<Record<string, VerifyState>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["planilla_historial", servicioId],
    queryFn: async () => {
      if (!servicioId) return [];
      const { data, error } = await supabase
        .from("planilla_historial")
        .select("*")
        .eq("servicio_id", servicioId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!servicioId,
  });

  const { data: firmaAudit } = useQuery({
    queryKey: ["firma_audit", servicioId],
    queryFn: async () => {
      if (!servicioId) return [];
      const { data, error } = await supabase
        .from("firma_audit")
        .select("*")
        .eq("servicio_id", servicioId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!servicioId,
  });

  const { data: personasMap } = useQuery({
    queryKey: ["firma_audit_personas", servicioId, (firmaAudit || []).length],
    queryFn: async () => {
      const ids = Array.from(new Set((firmaAudit || []).map((f: any) => f.persona_id)));
      if (!ids.length) return new Map<string, string>();
      const { data } = await supabase.from("personas").select("id,nombres,apellidos").in("id", ids);
      const m = new Map<string, string>();
      (data || []).forEach((p: any) => m.set(p.id, `${p.nombres} ${p.apellidos}`));
      return m;
    },
    enabled: !!(firmaAudit && firmaAudit.length),
  });

  // Auto-verify hash for each historial row that has a snapshot
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, VerifyState> = {};
      for (const h of data as any[]) {
        if (!h.content_hash || !h.content_ref) { results[h.id] = "missing"; continue; }
        if (!h.snapshot) { results[h.id] = "missing"; continue; }
        results[h.id] = "checking";
        try {
          const recomputed = await computeHash(h.content_ref, h.snapshot as PlanillaSnapshot);
          results[h.id] = recomputed.toLowerCase() === (h.content_hash as string).toLowerCase() ? "ok" : "mismatch";
        } catch { results[h.id] = "missing"; }
      }
      if (!cancelled) setVerifyMap(results);
    })();
    return () => { cancelled = true; };
  }, [data]);

  if (!servicioId) return null;

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch { toast.error("No se pudo copiar"); }
  };

  const runVerify = async () => {
    setVerifyResult(null);
    const r = refInput.trim();
    const h = hashInput.trim().toLowerCase();
    if (!r) { setVerifyResult({ ok: false, msg: "Ingresa la referencia (Ref: PL-…) del pie del documento." }); return; }
    const { data: found, error } = await supabase
      .from("planilla_historial")
      .select("*")
      .eq("content_ref", r)
      .maybeSingle();
    if (error || !found) { setVerifyResult({ ok: false, msg: "No se encontró ninguna planilla con esa referencia." }); return; }
    if (!h) { setVerifyResult({ ok: true, msg: "Referencia encontrada. Pega el hash SHA-256 para comparar.", found }); return; }
    const match = (found as any).content_hash?.toLowerCase() === h;
    setVerifyResult({
      ok: match,
      msg: match ? "✅ Integridad verificada: el hash coincide con el registro original." : "❌ El hash NO coincide. El documento podría haber sido modificado.",
      found,
    });
  };

  const downloadPdf = (h: any) => {
    if (!h.snapshot) { toast.error("Esta versión no tiene snapshot para regenerar."); return; }
    const html = renderPlanillaHtml(h.snapshot as PlanillaSnapshot, {
      ref: h.content_ref, hash: h.content_hash, version: h.version,
    });
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { toast.error("Bloqueador de ventanas activo"); return; }
    w.document.write(html + `<script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  };

  const downloadExcel = (h: any) => {
    if (!h.snapshot) { toast.error("Esta versión no tiene snapshot para regenerar."); return; }
    const blob = renderPlanillaExcelBlob(h.snapshot as PlanillaSnapshot, {
      ref: h.content_ref, hash: h.content_hash, version: h.version,
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planilla-v${h.version || 1}-${h.parametros?.servicio_nombre || "reunion"}-${h.parametros?.servicio_fecha || ""}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadHtml = (h: any) => {
    if (!h.snapshot) { toast.error("Esta versión no tiene snapshot para regenerar."); return; }
    const html = renderPlanillaHtml(h.snapshot as PlanillaSnapshot, {
      ref: h.content_ref, hash: h.content_hash, version: h.version,
    });
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planilla-v${h.version || 1}-${h.parametros?.servicio_nombre || "reunion"}-${h.parametros?.servicio_fecha || ""}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const auditForVersion = (h: any) => {
    if (!firmaAudit) return [];
    // window = between parent generation and this generation (or all before this if no parent)
    const upper = new Date(h.created_at).getTime();
    let lower = 0;
    if (h.parent_id) {
      const parent = (data || []).find((x: any) => x.id === h.parent_id);
      if (parent) lower = new Date(parent.created_at).getTime();
    }
    return (firmaAudit || []).filter((f: any) => {
      const t = new Date(f.created_at).getTime();
      return t >= lower && t <= upper;
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Historial y versiones de planillas
            </CardTitle>
            <CardDescription>
              Cada versión conserva su snapshot, hash SHA-256 y auditoría de firmas asociadas.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setVerifyOpen(true); setVerifyResult(null); }}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Verificar integridad
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aún no se ha generado ninguna planilla.</p>
          ) : (
            <div className="divide-y">
              {(data as any[]).map((h) => {
                const p = h.parametros || {};
                const ref = h.content_ref as string | null;
                const hash = h.content_hash as string | null;
                const formato = (h.formato as string) || "pdf";
                const version = h.version || 1;
                const state = verifyMap[h.id] || "checking";
                const isExpanded = !!expanded[h.id];
                const audit = auditForVersion(h);

                return (
                  <div key={h.id} className="py-3 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted shrink-0"
                          onClick={() => setExpanded(s => ({ ...s, [h.id]: !s[h.id] }))}
                          title={isExpanded ? "Contraer" : "Expandir"}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.titulo || "Planilla"} <span className="text-muted-foreground">v{version}</span>
                            {h.parent_id && <span className="ml-1.5 text-[10px] text-muted-foreground">(reapertura)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {new Date(h.created_at).toLocaleString("es-CO")} · {h.generada_por_email || "usuario"}
                            {h.motivo ? ` · ${h.motivo}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {state === "ok" && (
                          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30 border" variant="outline">
                            <ShieldCheck className="h-3 w-3 mr-1" /> Íntegra
                          </Badge>
                        )}
                        {state === "mismatch" && (
                          <Badge className="text-[10px] bg-red-500/15 text-red-700 border-red-500/30 border" variant="outline">
                            <ShieldAlert className="h-3 w-3 mr-1" /> Alterada
                          </Badge>
                        )}
                        {state === "missing" && (
                          <Badge className="text-[10px]" variant="outline">
                            <ShieldQuestion className="h-3 w-3 mr-1" /> Sin snapshot
                          </Badge>
                        )}
                        {state === "checking" && <Badge className="text-[10px]" variant="outline">Verificando…</Badge>}
                        <Badge variant="default" className="text-[10px]">{FORMATO_LABEL[formato] || formato.toUpperCase()}</Badge>
                        <Badge variant="outline" className="text-[10px]">{h.total_asistentes}/{h.total_personas} · {h.tasa_asistencia}%</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-10">
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!h.snapshot} onClick={() => downloadPdf(h)}>
                        <Printer className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!h.snapshot} onClick={() => downloadExcel(h)}>
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!h.snapshot} onClick={() => downloadHtml(h)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> HTML
                      </Button>
                      {onReopen && (
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onReopen({ id: h.id, version })}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir (v{version + 1})
                        </Button>
                      )}
                      {state === "mismatch" && (
                        <span className="text-[11px] text-red-600 font-medium">
                          ⚠️ El snapshot no coincide con el hash registrado.
                        </span>
                      )}
                    </div>

                    {(ref || hash) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground pl-10">
                        {ref && (
                          <button className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 border hover:bg-muted"
                            onClick={() => copy(ref, `r-${h.id}`)} title="Copiar referencia">
                            <span>Ref: <b className="text-foreground">{ref}</b></span>
                            {copied === `r-${h.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                        {hash && (
                          <button className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 border hover:bg-muted truncate max-w-full"
                            onClick={() => copy(hash, `h-${h.id}`)} title="Copiar hash SHA-256">
                            <span className="truncate">SHA-256: {hash.slice(0, 24)}…</span>
                            {copied === `h-${h.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="ml-10 mt-1 rounded-md border bg-muted/20 p-3 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <PenLine className="h-3.5 w-3.5" /> Auditoría de firmas en esta versión ({audit.length})
                        </div>
                        {audit.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin eventos de firma en la ventana de esta versión.</p>
                        ) : (
                          <div className="divide-y">
                            {audit.map((f: any) => {
                              const accion = ACCION_LABEL[f.accion] || ACCION_LABEL.created;
                              const Icon = accion.icon;
                              const dispositivo = detectDevice(f.user_agent);
                              const persona = personasMap?.get(f.persona_id) || f.persona_id.slice(0, 8);
                              return (
                                <div key={f.id} className="py-2 flex flex-wrap items-start gap-2 text-xs">
                                  <Badge variant="outline" className={`${accion.color} border text-[10px]`}>
                                    <Icon className="h-3 w-3 mr-1" /> {accion.label}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{persona}</p>
                                    <p className="text-muted-foreground text-[11px]">
                                      {new Date(f.created_at).toLocaleString("es-CO")} ·{" "}
                                      {f.firmada_por_email || "usuario"} · {dispositivo}
                                      {f.ip ? ` · ${f.ip}` : ""}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verificar integridad</DialogTitle>
            <DialogDescription>
              Ingresa la <b>Referencia</b> (Ref: PL-…) que aparece al pie de la planilla y opcionalmente el hash SHA-256 para comparar contra el registro original.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref">Referencia</Label>
              <Input id="ref" placeholder="PL-XXXXXX-XXXX" value={refInput} onChange={e => setRefInput(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hash">Hash SHA-256 (opcional)</Label>
              <Input id="hash" placeholder="64 caracteres hex" value={hashInput} onChange={e => setHashInput(e.target.value)} className="font-mono text-xs" />
            </div>
            {verifyResult && (
              <div className={`text-sm rounded-md border p-2.5 ${verifyResult.ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
                {verifyResult.msg}
                {verifyResult.found && (
                  <div className="mt-2 text-[11px] font-mono text-muted-foreground break-all">
                    Original: {verifyResult.found.content_hash}
                    <br />Generada: {new Date(verifyResult.found.created_at).toLocaleString("es-CO")} por {verifyResult.found.generada_por_email}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVerifyOpen(false)}>Cerrar</Button>
              <Button onClick={runVerify}>Verificar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
