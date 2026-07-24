import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileDown, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

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

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function newRef() {
  // short-ish reference id: PL-<time36>-<rand>
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PL-${t}-${r}`;
}

// Convert #rrggbb → ARGB "FFrrggbb" for xlsx styles (best-effort; native xlsx has limited style support without pro build)
function toArgb(hex: string) {
  const h = hex.replace("#", "");
  return ("FF" + (h.length === 3 ? h.split("").map(c => c + c).join("") : h)).toUpperCase();
}

export default function PlanillaPreviewDialog({ open, onOpenChange, servicio, personas, asistMap, localAttendance, config }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [ref, setRef] = useState<string>("");
  const [hash, setHash] = useState<string>("");

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

  // Canonical payload used to compute integrity hash.
  const canonicalPayload = useMemo(() => {
    return JSON.stringify({
      servicio: { id: servicio?.id, nombre: servicio?.nombre, fecha: servicio?.fecha, hora: servicio?.hora },
      cfg,
      totales: { asistentes: presentes.length, personas: personas.length, tasa },
      filas: presentes.map(p => ({ n: p.nombre, h: p.hora, p: p.puntualidad, m: p.metodo, f: p.firma ? "y" : "n" })),
    });
  }, [servicio, cfg, presentes, personas.length, tasa]);

  // Regenerate ref+hash whenever the dialog opens or payload changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const r = newRef();
      const h = await sha256Hex(r + "|" + canonicalPayload);
      if (!cancelled) { setRef(r); setHash(h); }
    })();
    return () => { cancelled = true; };
  }, [open, canonicalPayload]);

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
    const shortHash = hash ? hash.slice(0, 16) : "…";
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
footer{margin-top:20px;font-size:11px;color:#444;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.integrity{margin-top:10px;padding:8px 10px;border:1px dashed #9ca3af;border-radius:6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:#111;background:#f9fafb}
.integrity b{font-family:system-ui,Segoe UI,sans-serif}
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
<div class="integrity">
  <b>Verificación de integridad</b> · Ref: <b>${ref || "…"}</b> · SHA-256: ${shortHash}…<br/>
  Hash completo: ${hash || "generando…"}
</div>
<footer>
  <span>Generado ${new Date().toLocaleString("es-CO")}</span>
  <span>${cfg.pie}</span>
</footer>
</body></html>`;
  }, [cfg, presentes, servicio, tasa, ref, hash]);

  const logHistorial = async (formato: "pdf" | "html" | "excel") => {
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
        content_ref: ref,
        content_hash: hash,
        formato,
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
      } as any);
      qc.invalidateQueries({ queryKey: ["planilla_historial", servicio.id] });
    } catch (e: any) {
      console.error("planilla_historial insert error", e);
    }
  };

  const handlePrint = async () => {
    setSaving(true);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { setSaving(false); toast.error("Bloqueador de ventanas activo"); return; }
    w.document.write(html + `<script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
    await logHistorial("pdf");
    toast.success("Planilla generada", { description: `Ref ${ref} · ${presentes.length} asistentes` });
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
    await logHistorial("html");
    setSaving(false);
  };

  const handleExcel = async () => {
    setSaving(true);
    try {
      const headerRow = ["#", ...cfg.columnas.map(c => COL_LABEL[c])];
      const dataRows = presentes.map((r, i) =>
        [i + 1, ...cfg.columnas.map(k => k === "firma" ? (r.firma ? "Firmado" : "") : (r as any)[k])]
      );

      const meta: any[][] = [
        [cfg.titulo],
        [cfg.subtitulo || ""],
        [`Reunión: ${servicio?.nombre || ""}`, `Fecha: ${servicio?.fecha || ""} ${servicio?.hora || ""}`],
        [`Total asistentes: ${presentes.length}`, `% Asistencia: ${tasa}%`],
        [`Ref: ${ref}`, `SHA-256: ${hash}`],
        [],
      ];
      const aoa = [...meta, headerRow, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Column widths
      ws["!cols"] = headerRow.map((_, i) => ({ wch: i === 0 ? 5 : 22 }));

      // Style header row (row index in sheet = meta.length)
      const headerRowIdx = meta.length; // 0-based
      const argb = toArgb(cfg.color);
      for (let c = 0; c < headerRow.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
        const cell = ws[addr];
        if (cell) {
          cell.s = {
            fill: { patternType: "solid", fgColor: { rgb: argb.slice(2) } },
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "999999" } },
              bottom: { style: "thin", color: { rgb: "999999" } },
              left: { style: "thin", color: { rgb: "999999" } },
              right: { style: "thin", color: { rgb: "999999" } },
            },
          };
        }
      }
      // Title styling
      const titleCell = ws["A1"];
      if (titleCell) {
        titleCell.s = { font: { bold: true, sz: 14, color: { rgb: argb.slice(2) } } };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Planilla");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true } as any);
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `planilla-${servicio?.nombre || "reunion"}-${servicio?.fecha || ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      await logHistorial("excel");
      toast.success("Excel generado", { description: `Ref ${ref}` });
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo generar el Excel", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Vista previa de la planilla</DialogTitle>
          <DialogDescription>
            Revisa el formato antes de imprimir. Cada exportación incluye una <b>referencia</b> y un <b>hash SHA-256</b> para verificar integridad.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-md px-2.5 py-1.5 bg-muted/30">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono truncate">
            Ref: <b>{ref || "…"}</b> · SHA-256: {hash ? hash.slice(0, 24) + "…" : "generando…"}
          </span>
        </div>

        <div className="rounded-md border overflow-hidden bg-muted/20">
          <iframe title="preview" srcDoc={html} className="w-full h-[520px] bg-white" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1.5" /> Cerrar
          </Button>
          <Button variant="outline" onClick={handleExcel} disabled={saving || !hash}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={saving || !hash}>
            <FileDown className="h-4 w-4 mr-1.5" /> HTML
          </Button>
          <Button onClick={handlePrint} disabled={saving || !hash}>
            <Printer className="h-4 w-4 mr-1.5" /> {saving ? "Generando..." : "Imprimir / PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
