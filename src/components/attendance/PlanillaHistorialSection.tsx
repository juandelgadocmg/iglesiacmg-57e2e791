import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, FileText, ShieldCheck, Copy, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props { servicioId?: string | null; }

const FORMATO_LABEL: Record<string, string> = { pdf: "PDF", html: "HTML", excel: "Excel" };

export default function PlanillaHistorialSection({ servicioId }: Props) {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [refInput, setRefInput] = useState("");
  const [hashInput, setHashInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; msg: string; found?: any }>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Historial de planillas generadas
            </CardTitle>
            <CardDescription>Registro auditable con referencia y huella SHA-256 por exportación.</CardDescription>
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
              {data.map((h: any) => {
                const p = h.parametros || {};
                const cols: string[] = Array.isArray(p.columnas) ? p.columnas : [];
                const ref = h.content_ref as string | null;
                const hash = h.content_hash as string | null;
                const formato = (h.formato as string) || "pdf";
                return (
                  <div key={h.id} className="py-3 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.titulo || "Planilla"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {new Date(h.created_at).toLocaleString("es-CO")} · {h.generada_por_email || "usuario"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="default" className="text-[10px]">{FORMATO_LABEL[formato] || formato.toUpperCase()}</Badge>
                        <Badge variant="outline" className="text-[10px]">{h.total_asistentes}/{h.total_personas} · {h.tasa_asistencia}%</Badge>
                        {cols.map(c => (
                          <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                        ))}
                      </div>
                    </div>
                    {(ref || hash) && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground pl-10">
                        {ref && (
                          <button
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 border hover:bg-muted"
                            onClick={() => copy(ref, `r-${h.id}`)}
                            title="Copiar referencia"
                          >
                            <span>Ref: <b className="text-foreground">{ref}</b></span>
                            {copied === `r-${h.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                        {hash && (
                          <button
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 border hover:bg-muted truncate max-w-full"
                            onClick={() => copy(hash, `h-${h.id}`)}
                            title="Copiar hash SHA-256"
                          >
                            <span className="truncate">SHA-256: {hash.slice(0, 24)}…</span>
                            {copied === `h-${h.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
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
