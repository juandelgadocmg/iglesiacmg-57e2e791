import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRoles } from "@/hooks/useUserRoles";
import ExportDropdown from "@/components/shared/ExportDropdown";
import QrAlertPreferences from "@/components/attendance/QrAlertPreferences";

interface Row {
  id: string;
  user_id: string | null;
  persona_id: string | null;
  result: string;
  code: string | null;
  message: string | null;
  token: string | null;
  created_at: string;
}

const RESULT_STYLE: Record<string, string> = {
  ok: "bg-success/15 text-success",
  already: "bg-primary/15 text-primary",
  throttled: "bg-amber-500/15 text-amber-700",
  error: "bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 25;

export default function QrAuditLogSection({ servicioId }: { servicioId: string | null }) {
  const { roles } = useUserRoles();
  const canView = roles.some((r) => ["admin", "pastor", "secretaria"].includes(r as string));
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [retention, setRetention] = useState<any>(null);

  const buildQuery = (forExport = false) => {
    let q = supabase
      .from("qr_scan_log")
      .select("id,user_id,persona_id,result,code,message,token,created_at", { count: forExport ? undefined : "exact" });
    if (servicioId) q = q.eq("servicio_id", servicioId);
    if (resultFilter !== "all") q = q.eq("result", resultFilter);
    if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`user_id.eq.${s},persona_id.eq.${s},token.eq.${s},message.ilike.%${s}%,code.ilike.%${s}%`);
    }
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
  }, [servicioId, canView, page, resultFilter, dateFrom, dateTo, search]);

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
            filters={{ servicioId, resultFilter, dateFrom, dateTo, search }}
          />
          <QrAlertPreferences />
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
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
          <div className="flex gap-1">
            <Input type="date" value={dateFrom} onChange={(e) => { setPage(0); setDateFrom(e.target.value); }} className="h-9" />
            <Input type="date" value={dateTo} onChange={(e) => { setPage(0); setDateTo(e.target.value); }} className="h-9" />
          </div>
        </div>

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
                  <th className="py-2 pr-3">Token</th>
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
      </CardContent>
    </Card>
  );
}
