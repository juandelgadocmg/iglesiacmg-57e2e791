import * as XLSX from "xlsx";

export type PlanillaColKey = "nombre" | "hora" | "puntualidad" | "metodo" | "firma";

export const PLANILLA_COL_LABEL: Record<PlanillaColKey, string> = {
  nombre: "Nombre",
  hora: "Hora",
  puntualidad: "Puntualidad",
  metodo: "Método",
  firma: "Firma",
};

export interface PlanillaSnapshotRow {
  nombre: string;
  hora: string;
  puntualidad: string;
  metodo: string;
  firma: string;
}

export interface PlanillaSnapshot {
  cfg: {
    titulo: string;
    subtitulo: string;
    pie: string;
    color: string;
    mostrarLogo: boolean;
    logoUrl: string;
    columnas: PlanillaColKey[];
  };
  servicio: { id?: string; nombre?: string; fecha?: string; hora?: string };
  totales: { asistentes: number; personas: number; tasa: number };
  filas: PlanillaSnapshotRow[];
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalPayload(snap: PlanillaSnapshot): string {
  return JSON.stringify({
    servicio: snap.servicio,
    cfg: snap.cfg,
    totales: snap.totales,
    filas: snap.filas.map(p => ({ n: p.nombre, h: p.hora, p: p.puntualidad, m: p.metodo, f: p.firma ? "y" : "n" })),
  });
}

export async function computeHash(ref: string, snap: PlanillaSnapshot): Promise<string> {
  return sha256Hex(ref + "|" + canonicalPayload(snap));
}

export function newPlanillaRef() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PL-${t}-${r}`;
}

export function renderPlanillaHtml(snap: PlanillaSnapshot, meta: { ref: string; hash: string; version?: number }) {
  const { cfg, servicio, totales, filas } = snap;
  const headerCells = ["#", ...cfg.columnas.map(c => PLANILLA_COL_LABEL[c])].map(h => `<th>${h}</th>`).join("");
  const rows = filas.map((r, i) => {
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
  const shortHash = meta.hash ? meta.hash.slice(0, 16) : "…";
  const versionTxt = meta.version && meta.version > 1 ? ` · v${meta.version}` : "";
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
      <h1>${cfg.titulo}${versionTxt}</h1>
      <div class="meta">${cfg.subtitulo ? cfg.subtitulo + " · " : ""}${servicio?.nombre || ""} · ${servicio?.fecha || ""} ${servicio?.hora || ""}</div>
    </div>
  </div>
  <div class="meta" style="text-align:right">
    Total asistentes: <b>${totales.asistentes}</b><br/>
    % asistencia: <b>${totales.tasa}%</b>
  </div>
</header>
<table>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${rows || `<tr><td colspan="${cfg.columnas.length + 1}" style="text-align:center;color:#888;padding:24px">Sin asistentes registrados</td></tr>`}</tbody>
</table>
<div class="integrity">
  <b>Verificación de integridad</b> · Ref: <b>${meta.ref || "…"}</b> · SHA-256: ${shortHash}…<br/>
  Hash completo: ${meta.hash || "generando…"}
</div>
<footer>
  <span>Generado ${new Date().toLocaleString("es-CO")}</span>
  <span>${cfg.pie}</span>
</footer>
</body></html>`;
}

function toArgb(hex: string) {
  const h = hex.replace("#", "");
  return ("FF" + (h.length === 3 ? h.split("").map(c => c + c).join("") : h)).toUpperCase();
}

export function renderPlanillaExcelBlob(snap: PlanillaSnapshot, meta: { ref: string; hash: string; version?: number }): Blob {
  const { cfg, servicio, totales, filas } = snap;
  const headerRow = ["#", ...cfg.columnas.map(c => PLANILLA_COL_LABEL[c])];
  const dataRows = filas.map((r, i) =>
    [i + 1, ...cfg.columnas.map(k => k === "firma" ? (r.firma ? "Firmado" : "") : (r as any)[k])]
  );
  const versionTxt = meta.version && meta.version > 1 ? ` (v${meta.version})` : "";
  const metaRows: any[][] = [
    [cfg.titulo + versionTxt],
    [cfg.subtitulo || ""],
    [`Reunión: ${servicio?.nombre || ""}`, `Fecha: ${servicio?.fecha || ""} ${servicio?.hora || ""}`],
    [`Total asistentes: ${totales.asistentes}`, `% Asistencia: ${totales.tasa}%`],
    [`Ref: ${meta.ref}`, `SHA-256: ${meta.hash}`],
    [],
  ];
  const aoa = [...metaRows, headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headerRow.map((_, i) => ({ wch: i === 0 ? 5 : 22 }));
  const headerRowIdx = metaRows.length;
  const argb = toArgb(cfg.color);
  for (let c = 0; c < headerRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    const cell = (ws as any)[addr];
    if (cell) {
      cell.s = {
        fill: { patternType: "solid", fgColor: { rgb: argb.slice(2) } },
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "left", vertical: "center" },
      };
    }
  }
  const titleCell = (ws as any)["A1"];
  if (titleCell) titleCell.s = { font: { bold: true, sz: 14, color: { rgb: argb.slice(2) } } };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Planilla");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true } as any);
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
