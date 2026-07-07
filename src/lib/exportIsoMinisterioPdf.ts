import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import cmgLogoUrl from "@/assets/cmg-logo-header.jpeg";

let _logoDataUrl: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoDataUrl) return _logoDataUrl;
  try {
    const res = await fetch(cmgLogoUrl);
    const blob = await res.blob();
    _logoDataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return _logoDataUrl;
  } catch {
    return null;
  }
}
import type { IsoMinisterioTemplate } from "./isoMinisterioTemplates";

export interface IsoPdfEvento {
  id: string;
  fecha: string;
  titulo: string;
  hora: string | null;
}

/**
 * Genera el PDF con el formato ISO del ministerio.
 * Columnas fijas: FECHA · SERVIDOR · UNIFORME · ASIGNACION · OBSERVACION.
 */
export async function exportIsoMinisterioPdf(params: {
  template: IsoMinisterioTemplate;
  mes: string;
  liderNombre: string;
  eventos: IsoPdfEvento[];
  /** evento_id -> texto libre de servidores */
  servidorPorEvento?: Map<string, string>;
  /** evento_id -> texto libre de asignación (roles) */
  asignacionPorEvento?: Map<string, string>;
  /** evento_id -> texto uniforme */
  uniformePorEvento?: Map<string, string>;
  /** evento_id -> texto observación */
  observacionPorEvento?: Map<string, string>;
  /** Fallback: si no hay asignacion_texto, usar asignaciones por estación autogeneradas. */
  asignacionesPorEvento?: Map<string, Map<string, string>>;
}) {
  const {
    template, mes, liderNombre, eventos,
    servidorPorEvento, asignacionPorEvento,
    uniformePorEvento, observacionPorEvento,
    asignacionesPorEvento,
  } = params;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const FONT = "helvetica";
  doc.setFont(FONT, "normal");

  const logoDataUrl = await getLogoDataUrl();

  const headerH = 18;
  const logoW = 46;
  const metaLabelW = 20;
  const metaValueW = 30;
  const metaW = metaLabelW + metaValueW;

  const drawHeader = (topY: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    doc.rect(margin, topY, logoW, headerH);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "JPEG", margin + 2, topY + 2, logoW - 4, headerH - 4, undefined, "FAST");
      } catch { /* ignore */ }
    } else {
      doc.setFontSize(10);
      doc.setFont(FONT, "bold");
      doc.text("CMG", margin + logoW / 2, topY + 10, { align: "center" });
    }

    const titleX = margin + logoW;
    const titleW = pageWidth - margin * 2 - logoW - metaW;
    doc.rect(titleX, topY, titleW, headerH);
    doc.setFontSize(12);
    doc.setFont(FONT, "bold");
    doc.text(template.titulo, titleX + titleW / 2, topY + headerH / 2 + 1, { align: "center" });

    const metaX = titleX + titleW;
    const rowH = headerH / 3;
    doc.setFontSize(9);
    const metas: [string, string][] = [
      ["Código:", template.codigo],
      ["Versión:", template.version],
      ["Fecha:", template.fechaVigencia],
    ];
    metas.forEach(([k, v], i) => {
      const yy = topY + rowH * i;
      doc.rect(metaX, yy, metaLabelW, rowH);
      doc.rect(metaX + metaLabelW, yy, metaValueW, rowH);
      doc.setFont(FONT, "bold");
      doc.text(k, metaX + 1.8, yy + rowH / 2 + 1.2);
      doc.setFont(FONT, "normal");
      doc.text(v, metaX + metaLabelW + 1.8, yy + rowH / 2 + 1.2);
    });
  };

  const bottomReserve = 6;

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont(FONT, "italic");
    doc.text(`${template.codigo} · v${template.version}`, margin, pageHeight - margin + 4);
    doc.text(`Pág ${pageNum}/${totalPages}`, pageWidth - margin, pageHeight - margin + 4, { align: "right" });
  };

  const contentW = pageWidth - margin * 2;
  const rowH1 = 7;
  const labelW = 28;
  const infoRowsH = rowH1 * 3;

  const drawInfoRows = (topY: number) => {
    doc.setFontSize(10);
    doc.rect(margin, topY, labelW, rowH1);
    doc.setFont(FONT, "bold");
    doc.text("MES:", margin + 1.8, topY + rowH1 / 2 + 1.2);
    doc.rect(margin + labelW, topY, contentW - labelW, rowH1);
    doc.setFont(FONT, "normal");
    doc.text(mes.toUpperCase(), margin + labelW + 1.8, topY + rowH1 / 2 + 1.2);

    const y2 = topY + rowH1;
    doc.rect(margin, y2, labelW, rowH1);
    doc.setFont(FONT, "bold");
    doc.text("MINISTERIO:", margin + 1.8, y2 + rowH1 / 2 + 1.2);
    doc.rect(margin + labelW, y2, contentW - labelW, rowH1);
    doc.setFont(FONT, "normal");
    doc.text(
      doc.splitTextToSize(template.nombreMinisterio, contentW - labelW - 3)[0],
      margin + labelW + 1.8,
      y2 + rowH1 / 2 + 1.2
    );

    const y3 = topY + rowH1 * 2;
    doc.rect(margin, y3, labelW, rowH1);
    doc.setFont(FONT, "bold");
    doc.text("LÍDER:", margin + 1.8, y3 + rowH1 / 2 + 1.2);
    doc.rect(margin + labelW, y3, contentW - labelW, rowH1);
    doc.setFont(FONT, "normal");
    doc.text(
      doc.splitTextToSize(liderNombre || "—", contentW - labelW - 3)[0],
      margin + labelW + 1.8,
      y3 + rowH1 / 2 + 1.2
    );
  };

  drawHeader(margin);
  drawInfoRows(margin + headerH);
  let y = margin + headerH + infoRowsH;

  // ===== Tabla fija: FECHA · SERVIDOR · UNIFORME · ASIGNACION · OBSERVACION =====
  const buildAsignacionFallback = (evId: string): string => {
    const inner = asignacionesPorEvento?.get(evId);
    if (!inner || inner.size === 0) return "";
    // "Estación: nombres"
    const parts: string[] = [];
    template.estaciones.forEach((est) => {
      const key = normKey(est);
      const v = inner.get(key);
      if (v) parts.push(`${est}: ${v}`);
    });
    return parts.join("\n");
  };

  const buildServidorFallback = (evId: string): string => {
    const inner = asignacionesPorEvento?.get(evId);
    if (!inner) return "";
    const names = new Set<string>();
    inner.forEach((v) => v.split(",").map((s) => s.trim()).filter(Boolean).forEach((n) => names.add(n)));
    return Array.from(names).join(", ");
  };

  const head = [["FECHA", "SERVIDOR", "UNIFORME", "ASIGNACION", "OBSERVACION"]];
  const body = eventos.map((ev) => {
    const fechaTxt = formatFechaLarga(ev.fecha) + (ev.hora ? ` ${ev.hora}` : "");
    const servidor = servidorPorEvento?.get(ev.id) || buildServidorFallback(ev.id);
    const uniforme = uniformePorEvento?.get(ev.id) || "";
    const asignacion = asignacionPorEvento?.get(ev.id) || buildAsignacionFallback(ev.id);
    const observacion = observacionPorEvento?.get(ev.id) || "";
    return [fechaTxt, servidor, uniforme, asignacion, observacion];
  });

  if (body.length === 0) {
    body.push(["Sin eventos programados", "", "", "", ""]);
  }

  // Anchos: FECHA fijo, luego proporcional
  const wFecha = 42;
  const rest = contentW - wFecha;
  const wServidor = rest * 0.28;
  const wUniforme = rest * 0.16;
  const wAsignacion = rest * 0.34;
  const wObservacion = rest * 0.22;

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: {
      font: FONT,
      fontSize: 8,
      cellPadding: 1.5,
      valign: "middle",
      halign: "left",
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
    },
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: wFecha },
      1: { cellWidth: wServidor },
      2: { cellWidth: wUniforme },
      3: { cellWidth: wAsignacion },
      4: { cellWidth: wObservacion },
    },
    margin: { left: margin, right: margin, top: margin + headerH + infoRowsH + 2, bottom: margin + bottomReserve + 2 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(margin);
        drawInfoRows(margin + headerH);
      }
    },
  });

  let afterY = (doc as any).lastAutoTable.finalY;

  // Rellenar con filas vacías para completar la página (reservando NOTA + Responsabilidades + Firmas)
  const notaText = template.importante || "";
  const impInnerW = contentW - labelW - 3;
  const notaH = notaText
    ? Math.max(rowH1, doc.splitTextToSize(notaText, impInnerW).length * 3.6 + 3)
    : 0;
  const respH = Math.max(rowH1, doc.splitTextToSize(template.responsabilidades, impInnerW).length * 3.6 + 3);
  const firmasH = 6.5 * 4;
  const reservedBelow = notaH + respH + firmasH;

  const emptyRowH = 7;
  const colWidths = [wFecha, wServidor, wUniforme, wAsignacion, wObservacion];

  const availableForEmpty = pageHeight - margin - bottomReserve - afterY - reservedBelow;
  if (availableForEmpty > emptyRowH) {
    const numEmpty = Math.floor(availableForEmpty / emptyRowH);
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    for (let r = 0; r < numEmpty; r++) {
      let x = margin;
      for (let c = 0; c < colWidths.length; c++) {
        doc.rect(x, afterY, colWidths[c], emptyRowH);
        x += colWidths[c];
      }
      afterY += emptyRowH;
    }
  }

  const ensureSpace = (needed: number) => {
    if (afterY + needed > pageHeight - margin - bottomReserve - 2) {
      doc.addPage();
      drawHeader(margin);
      drawInfoRows(margin + headerH);
      afterY = margin + headerH + infoRowsH + 2;
    }
  };

  // ===== NOTA =====
  if (notaText) {
    doc.setFontSize(9);
    const innerW = contentW - labelW - 3;
    const txt = doc.splitTextToSize(notaText, innerW);
    const rowH = Math.max(rowH1, txt.length * 3.6 + 3);
    ensureSpace(rowH);
    doc.rect(margin, afterY, labelW, rowH);
    doc.setFont(FONT, "bold");
    doc.text("NOTA:", margin + 1.8, afterY + 4.5);
    doc.rect(margin + labelW, afterY, contentW - labelW, rowH);
    doc.setFont(FONT, "normal");
    doc.text(txt, margin + labelW + 1.8, afterY + 4.5);
    afterY += rowH;
  }

  // ===== Responsabilidades =====
  {
    doc.setFontSize(9);
    const innerW = contentW - labelW - 3;
    const txt = doc.splitTextToSize(template.responsabilidades, innerW);
    const rowH = Math.max(rowH1, txt.length * 3.6 + 3);
    ensureSpace(rowH);
    doc.rect(margin, afterY, labelW, rowH);
    doc.setFont(FONT, "bold");
    doc.text("Responsabilidades:", margin + 1.8, afterY + 4.5);
    doc.rect(margin + labelW, afterY, contentW - labelW, rowH);
    doc.setFont(FONT, "normal");
    doc.text(txt, margin + labelW + 1.8, afterY + 4.5);
    afterY += rowH;
  }

  // ===== Firmas =====
  const fRowH = 6.5;
  const firmLabelW = metaLabelW;
  const firmDataW = (contentW - firmLabelW) / 3;
  const firmasBlockH = fRowH * 4;
  ensureSpace(firmasBlockH);
  const firmRows: string[][] = [
    ["", "Elaborado por:", "Revisado por:", "Autorizado por:"],
    ["Firma", "", "", ""],
    ["Nombre", template.firmas.elaboradoPor.nombre, template.firmas.revisadoPor.nombre, template.firmas.autorizadoPor.nombre],
    ["Cargo", template.firmas.elaboradoPor.cargo, template.firmas.revisadoPor.cargo, template.firmas.autorizadoPor.cargo],
  ];
  doc.setFontSize(8);
  firmRows.forEach((row, ri) => {
    const yRow = afterY + fRowH * ri;
    row.forEach((cell, ci) => {
      const x = ci === 0 ? margin : margin + firmLabelW + firmDataW * (ci - 1);
      const w = ci === 0 ? firmLabelW : firmDataW;
      doc.rect(x, yRow, w, fRowH);
      doc.setFont(FONT, ri === 0 || ci === 0 ? "bold" : "normal");
      doc.text(cell, x + 1.8, yRow + fRowH / 2 + 1.2);
    });
  });
  afterY += firmasBlockH;

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooter(i, pages);
  }

  const fname = `${template.codigo}-${template.nombreMinisterio.replace(/\s+/g, "_")}-${mes}.pdf`;
  doc.save(fname);
}

export function normKey(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFechaLarga(fechaISO: string): string {
  try {
    const d = new Date(fechaISO + "T12:00:00");
    return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return fechaISO;
  }
}
