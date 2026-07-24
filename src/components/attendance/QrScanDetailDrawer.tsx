import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Drawer } from "@/design-system/surfaces/Drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ExportDropdown from "@/components/shared/ExportDropdown";

interface Props {
  rowId: string | null;
  onClose: () => void;
}

interface FullRow {
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

const RESULT_STYLE: Record<string, string> = {
  ok: "bg-success/15 text-success",
  already: "bg-primary/15 text-primary",
  throttled: "bg-amber-500/15 text-amber-700",
  error: "bg-destructive/15 text-destructive",
};

export default function QrScanDetailDrawer({ rowId, onClose }: Props) {
  const [row, setRow] = useState<FullRow | null>(null);
  const [persona, setPersona] = useState<any>(null);
  const [servicio, setServicio] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const open = !!rowId;

  useEffect(() => {
    if (!rowId) { setRow(null); setPersona(null); setServicio(null); setUserEmail(null); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("qr_scan_log").select("*").eq("id", rowId).maybeSingle();
      const r = data as FullRow | null;
      setRow(r);
      if (r?.persona_id) {
        const { data: p } = await supabase
          .from("personas")
          .select("id,nombres,apellidos,email,telefono,foto_url,tipo_persona")
          .eq("id", r.persona_id).maybeSingle();
        setPersona(p);
      }
      if (r?.servicio_id) {
        const { data: s } = await supabase
          .from("servicios")
          .select("id,nombre,fecha,hora,lugar,qr_activo,qr_expires_at")
          .eq("id", r.servicio_id).maybeSingle();
        setServicio(s);
      }
      if (r?.user_id) {
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", r.user_id).maybeSingle();
        setUserEmail((prof as any)?.display_name || null);
      }
      setLoading(false);
    })();
  }, [rowId]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copiado" }); };

  const meta = useMemo(() => {
    if (!row) return null;
    return {
      id: row.id, user_id: row.user_id, persona_id: row.persona_id,
      servicio_id: row.servicio_id, token: row.token, code: row.code,
      message: row.message, result: row.result, created_at: row.created_at,
    };
  }, [row]);

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => { if (!v) onClose(); }}
      title="Detalle del escaneo QR"
      description={row ? new Date(row.created_at).toLocaleString("es-CO") : undefined}
      size="lg"
    >
      {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!loading && row && (
        <div className="space-y-5 text-sm">
          <section>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resultado</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={RESULT_STYLE[row.result] || ""}>{row.result}</Badge>
              {row.code && <Badge variant="outline" className="font-mono text-[10px]">{row.code}</Badge>}
            </div>
            {row.message && <p className="mt-2 text-sm text-fg-muted">{row.message}</p>}
          </section>

          <section>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Persona</div>
            {persona ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{persona.nombres} {persona.apellidos}</div>
                  <div className="text-xs text-muted-foreground">
                    {persona.tipo_persona || "—"} · {persona.email || persona.telefono || "sin contacto"}
                  </div>
                </div>
                <Link to={`/personas/${persona.id}`} className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                  Perfil <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin persona vinculada.</p>
            )}
          </section>

          <section>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reunión</div>
            {servicio ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{servicio.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {servicio.fecha || "—"} {servicio.hora || ""} · {servicio.lugar || "sin lugar"}
                  </div>
                  <div className="text-[10px] mt-1">
                    QR: {servicio.qr_activo ? <Badge className="bg-success/15 text-success">activo</Badge> : <Badge variant="outline">inactivo</Badge>}
                    {servicio.qr_expires_at && ` · expira ${new Date(servicio.qr_expires_at).toLocaleString("es-CO")}`}
                  </div>
                </div>
                <Link to={`/servicios?servicio=${servicio.id}`} className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                  Abrir <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin reunión asociada.</p>
            )}
          </section>

          <section>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Usuario que escaneó</div>
            <div className="rounded-md border p-3 text-xs">
              <div>{userEmail || <span className="text-muted-foreground">Sin nombre</span>}</div>
              {row.user_id && <div className="font-mono text-[10px] text-muted-foreground">{row.user_id}</div>}
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Metadatos</div>
            <div className="space-y-1.5">
              {meta && Object.entries(meta).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 pb-1">
                  <span className="text-muted-foreground">{k}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-mono truncate max-w-[220px]">{v === null || v === "" ? "—" : String(v)}</span>
                    {v && (
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copy(String(v))}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
