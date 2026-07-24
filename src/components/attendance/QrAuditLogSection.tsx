import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRoles } from "@/hooks/useUserRoles";

interface Row {
  id: string;
  user_id: string | null;
  persona_id: string | null;
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

export default function QrAuditLogSection({ servicioId }: { servicioId: string | null }) {
  const can = useCan();
  const canView = can("admin") || can("pastor") || can("secretaria");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!servicioId || !canView) return;
    setLoading(true);
    const { data } = await supabase
      .from("qr_scan_log")
      .select("id,user_id,persona_id,result,code,message,created_at")
      .eq("servicio_id", servicioId)
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!servicioId || !canView) return;
    const ch = supabase
      .channel(`qr-audit-${servicioId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qr_scan_log", filter: `servicio_id=eq.${servicioId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId, canView]);

  if (!canView || !servicioId) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-primary" />
          Auditoría de escaneos QR
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay intentos de escaneo para esta reunión.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Resultado</th>
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-xs">
                      {new Date(r.created_at).toLocaleString("es-CO")}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge className={RESULT_STYLE[r.result] || ""}>{r.result}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs">{r.code || "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
