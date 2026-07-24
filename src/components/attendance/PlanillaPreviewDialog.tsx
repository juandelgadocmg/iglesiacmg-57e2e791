import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Persona { id: string; nombres: string; apellidos: string; }
interface Asistencia { checkin_time?: string | null; puntualidad?: string | null; metodo_registro?: string | null; firma_data_url?: string | null; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  servicio: any;
  personas: Persona[];
  asistMap: Map<string, Asistencia>;
  localAttendance: Record<string, boolean>;
  config: any;
}

const ALL_COLS = ["nombre","hora","puntualidad","metodo","firma"] as const;
type ColKey = typeof ALL_COLS[number];
const COL_LABEL: Record<ColKey, string> = {
  nombre: "Nombre",
  hora: "Hora",
  puntualidad: "Puntualidad",
  metodo: "Método",
  firma: "Firma",
};

export default function PlanillaPreviewDialog({ open, onOpenChange, servicio, personas, asistMap, localAttendance, config }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const cfg = useMemo(() => {
    const c = config || {};
    const cols: ColKey[] = (Array.isArray(c.planilla_columnas) && c.planilla_columnas.length
      ? c.planilla_columnas
      : ["nombre","hora","puntualidad","metodo","firma"]
    ).filter((k: string) => (ALL_COLS as readonly string[]).includes(k));
    return {
      titulo: c.planilla_titulo || "Planilla de Asistencia",
      subtitulo: c.planilla_subtitulo || c.nombre_iglesia || "",
      pie: c.planilla_pie || "DOXA · CMG Admin",
      color: c.planilla_color_encabezado || "#111111",
      mostrarLogo: c.planilla_mostrar_logo !== false,
      logoUrl: c.logo_url || "",
      columnas: cols,
    };
  }, [config]);

  const presentes = useMemo(() => personas
    .filter(p => localAttendance[p.id])
    .map(p => {
      const a = asistMap.get(p.id) || {};
      return {
        nombre: `${p.nombres} ${p.apellidos}`,
        hora: a.checkin_time ? new Date(a.checkin_time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—",
        puntualidad: a.puntualidad || "—",
        metodo: (a.metodo_registro || "manual").toUpperCase(),
        firma: a.firma_data_url || "",
      };
    }), [personas, asistMap, localAttendance]);

  const tasa = personas.length ? Math.round((presentes.length / personas.length) * 100) : 0;

  const html = useMemo(() => {
    const headerCells = ["#", ...cfg.columnas.map(c => COL_LABEL[c])].map(h => `<th>${h}</th>`).join("");
    const rows = presentes.map((r, i) => {
      const cells = cfg.columnas.map(k => {
        if (k === "firma") return r.firma
          ? `<td class="firma"><img src="${r.firma}" alt="firma" style="max-height:36px;max-width:130px" /></td>`
          : `<td class="firma"></td>`;
        return `<td>${(r as any)[k]}</td>`;
      }).join("");
      return `<tr><td>${i + 1}</td>${cells}</tr>`;
    }).join("");
    const logoImg = cfg.mostrarLogo && cfg.logoUrl
      ? `<img src="${cfg.logoUrl}" alt="logo" style="height:44px;margin-right:12px" />` : "";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${cfg.titulo} - ${servicio?.nombre || ""}</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:system-ui,Segoe UI,sans-serif;color:#111;margin:0}
header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid ${cfg.color};padding-bottom:10px;margin-bottom:16px}
.brand{display:flex;align-items:center}
h1{margin:0;font-size:20px;color:${cfg.color}}
.meta{font-size:12px;color:#444}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:middle}
th{background:${cfg.color};color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
td.firma{width:150px;height:40px}
footer{margin-top:20px;font-size:11px;color:#444;display:flex;justify-content:space-between}
</style></head><body>
<header>
  <div class="brand">
    ${logoImg}
    <div>
      <h1>${cfg.titulo}</h1>
      <div class="meta">${cfg.subtitulo ? cfg.subtitulo + " · " : ""}${servicio?.nombre || ""} · ${servicio?.fecha || ""} ${servicio?.hora || ""}</div>
    </div>
  </div>
  <div class="meta" style="text-align:right">
    Total asistentes: <b>${presentes.length}</b><br/>
    % asistencia: <b>${tasa}%</b>
  </div>
</header>
<table>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${rows || `<tr><td colspan="${cfg.columnas.length + 1}" style="text-align:center;color:#888;padding:24px">Sin asistentes registrados</td></tr>`}</tbody>
</table>
<footer>
  <span>Generado ${new Date().toLocaleString("es-CO")}</span>
  <span>${cfg.pie}</span>
</footer>
</body></html>`;
  }, [cfg, presentes, servicio, tasa]);

  const logHistorial = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      await supabase.from("planilla_historial").insert({
        servicio_id: servicio.id,
        generada_por: uid,
        generada_por_email: userData.user?.email || null,
        total_asistentes: presentes.length,
        total_personas: personas.length,
        tasa_asistencia: tasa,
        parametros: {
          titulo: cfg.titulo,
          subtitulo: cfg.subtitulo,
          pie: cfg.pie,
          color: cfg.color,
          mostrar_logo: cfg.mostrarLogo,
          columnas: cfg.columnas,
          servicio_nombre: servicio.nombre,
          servicio_fecha: servicio.fecha,
        },
      });
      qc.invalidateQueries({ queryKey: ["planilla_historial", servicio.id] });
    } catch (e: any) {
      // non-blocking
      console.error("planilla_historial insert error", e);
    }
  };

  const handlePrint = async () => {
    setSaving(true);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { setSaving(false); toast.error("Bloqueador de ventanas activo"); return; }
    w.document.write(html + `<script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
    await logHistorial();
    toast.success("Planilla generada", { description: `${presentes.length} asistentes` });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDownload = async () => {
    setSaving(true);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planilla-${servicio?.nombre || "reunion"}-${servicio?.fecha || ""}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    await logHistorial();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista previa de la planilla</DialogTitle>
          <DialogDescription>
            Revisa el formato antes de imprimir. Ajusta la personalización global en Configuración → Planilla.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border overflow-hidden bg-muted/20">
          <iframe title="preview" srcDoc={html} className="w-full h-[520px] bg-white" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1.5" /> Cerrar
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={saving}>
            <FileDown className="h-4 w-4 mr-1.5" /> Descargar HTML
          </Button>
          <Button onClick={handlePrint} disabled={saving}>
            <Printer className="h-4 w-4 mr-1.5" /> {saving ? "Generando..." : "Imprimir / Guardar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
