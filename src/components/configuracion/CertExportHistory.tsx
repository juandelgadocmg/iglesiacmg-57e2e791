import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle, ShieldCheck } from "lucide-react";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { CERT_TIPO_LABEL, type CertTipo } from "@/hooks/useCertTemplates";
import { format } from "date-fns";

const sb = supabase as any;

interface LogRow {
  id: string;
  tipo: CertTipo;
  template_id: string | null;
  template_version: number | null;
  template_asset_id: string | null;
  persona_id: string | null;
  contexto: Record<string, unknown>;
  browser_cache_hit: boolean;
  actor_email: string | null;
  created_at: string;
  cert_templates?: { nombre: string; version: number } | null;
  personas?: { nombres: string; apellidos: string } | null;
}

export default function CertExportHistory() {
  const [tipo, setTipo] = useState<string>("all");
  const [q, setQ] = useState("");
  const [cacheOnly, setCacheOnly] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["cert-export-log", tipo],
    queryFn: async (): Promise<LogRow[]> => {
      let query = sb
        .from("cert_export_log")
        .select("*, cert_templates(nombre, version), personas(nombres, apellidos)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (tipo !== "all") query = query.eq("tipo", tipo);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return (rows || []).filter((r) => {
      if (cacheOnly && !r.browser_cache_hit) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      const persona = `${r.personas?.nombres || ""} ${r.personas?.apellidos || ""}`.toLowerCase();
      return (
        persona.includes(s) ||
        (r.actor_email || "").toLowerCase().includes(s) ||
        (r.cert_templates?.nombre || "").toLowerCase().includes(s) ||
        (r.template_asset_id || "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, cacheOnly]);

  const exportData = filtered.map((r) => ({
    fecha: format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    tipo: CERT_TIPO_LABEL[r.tipo],
    persona: `${r.personas?.nombres || ""} ${r.personas?.apellidos || ""}`.trim(),
    plantilla: r.cert_templates?.nombre || "(diseño por código)",
    version: r.template_version || "",
    asset_id: r.template_asset_id || "",
    usuario: r.actor_email || "",
    cache_hit: r.browser_cache_hit ? "Sí" : "No",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de descargas de certificados</CardTitle>
        <CardDescription>
          Auditoría de qué plantilla y versión se usó en cada descarga.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Persona, plantilla, usuario, asset…" className="pl-8 h-9" />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="lideres_cdp">Líderes CDP</SelectItem>
              <SelectItem value="bautismo">Bautismo</SelectItem>
              <SelectItem value="seminario_diploma">Diploma Seminario</SelectItem>
              <SelectItem value="academia">Academia</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={cacheOnly} onChange={(e) => setCacheOnly(e.target.checked)} />
            Solo caché desactualizado
          </label>
          <ExportDropdown
            title="Historial de certificados"
            filename="cert-export-log"
            columns={[
              { header: "Fecha", key: "fecha" },
              { header: "Tipo", key: "tipo" },
              { header: "Persona", key: "persona" },
              { header: "Plantilla", key: "plantilla" },
              { header: "Versión", key: "version" },
              { header: "Asset ID", key: "asset_id" },
              { header: "Usuario", key: "usuario" },
              { header: "Caché viejo", key: "cache_hit" },
            ]}
            data={exportData}
          />
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Cargando…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Sin descargas registradas.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yy HH:mm")}</TableCell>
                  <TableCell><Badge variant="outline">{CERT_TIPO_LABEL[r.tipo]}</Badge></TableCell>
                  <TableCell className="text-sm">{`${r.personas?.nombres || ""} ${r.personas?.apellidos || ""}`.trim() || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.cert_templates?.nombre || <span className="text-muted-foreground italic">Diseño por código</span>}
                    {r.template_version && <Badge variant="outline" className="ml-1.5 font-mono text-[10px]">v{r.template_version}</Badge>}
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]" title={r.template_asset_id || ""}>
                    {(r.template_asset_id || "").slice(0, 10) || "—"}
                  </TableCell>
                  <TableCell className="text-xs">{r.actor_email || "—"}</TableCell>
                  <TableCell>
                    {r.browser_cache_hit ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="h-3 w-3" /> Caché viejo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                        <ShieldCheck className="h-3 w-3" /> OK
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
