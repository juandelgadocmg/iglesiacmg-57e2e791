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
  fecha: string; // YYYY-MM-DD
  titulo: string;
  hora: string | null;
}

/**
 * Genera el PDF con el formato ISO del ministerio.
 * - Encabezado: logo izquierda (omitido), título centrado, recuadro código/versión/fecha.
 * - Recuadro MES, MINISTERIO, LÍDER.
 * - Tabla: FECHA + una columna por estación + UNIFORME + OBSERVACIÓN.
 * - Bloque Importante + Responsabilidades.
 * - Firmas Elaborado / Revisado / Autorizado.
 */
export async function exportIsoMinisterioPdf(params: {
  template: IsoMinisterioTemplate;
  mes: string;
  liderNombre: string;
  eventos: IsoPdfEvento[];
  /** Mapa evento_id -> Map(estacionNombre -> nombre persona asignada). */
  asignacionesPorEvento: Map<string, Map<string, string>>;
  /** Mapa evento_id -> texto uniforme (opcional, libre). */
  uniformePorEvento?: Map<string, string>;
  /** Mapa evento_id -> texto observación (opcional). */
  observacionPorEvento?: Map<string, string>;
}) {
  const { template, mes, liderNombre, eventos, asignacionesPorEvento, uniformePorEvento, observacionPorEvento } = params;

  // A4 horizontal, márgenes 1.5 cm. Usamos helvetica como sustituto de Arial Narrow.
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

  /** Dibuja el encabezado (logo + título + código/versión/fecha). */
  const drawHeader = (topY: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Caja izquierda (logo)
    doc.rect(margin, topY, logoW, headerH);
    if (logoDataUrl) {
      // margen interno de 1.5mm
      try {
        doc.addImage(logoDataUrl, "JPEG", margin + 2, topY + 2, logoW - 4, headerH - 4, undefined, "FAST");
      } catch { /* ignore */ }
    } else {
      doc.setFontSize(10);
      doc.setFont(FONT, "bold");
      doc.text("CMG", margin + logoW / 2, topY + 8, { align: "center" });
      doc.setFontSize(7);
      doc.setFont(FONT, "normal");
      doc.text("CENTRO MUNDIAL", margin + logoW / 2, topY + 11, { align: "center" });
      doc.text("DE GLORIA", margin + logoW / 2, topY + 14, { align: "center" });
    }

    // Caja centro (título) — ÚNICO elemento centrado
    const titleX = margin + logoW;
    const titleW = pageWidth - margin * 2 - logoW - metaW;
    doc.rect(titleX, topY, titleW, headerH);
    doc.setFontSize(12);
    doc.setFont(FONT, "bold");
    doc.text(template.titulo, titleX + titleW / 2, topY + headerH / 2 + 1, { align: "center" });

    // Caja derecha (código/versión/fecha)
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

  // Reserva mínima: solo el pie de paginación.
  const bottomReserve = 6;

  /** Pie de paginación. */
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont(FONT, "italic");
    doc.text(`${template.codigo} · v${template.version}`, margin, pageHeight - margin + 4);
    doc.text(`Pág ${pageNum}/${totalPages}`, pageWidth - margin, pageHeight - margin + 4, { align: "right" });
  };

  // ===== Página 1: encabezado =====
  drawHeader(margin);
  let y = margin + headerH;

  // ===== Bloque MES / MINISTERIO / LÍDER como tabla continua =====
  const contentW = pageWidth - margin * 2;
  const rowH1 = 7;
  const labelW = 28;

  // Fila MES
  doc.setFontSize(10);
  doc.rect(margin, y, labelW, rowH1);
  doc.setFont(FONT, "bold");
  doc.text("MES:", margin + 1.8, y + rowH1 / 2 + 1.2);
  doc.rect(margin + labelW, y, contentW - labelW, rowH1);
  doc.setFont(FONT, "normal");
  doc.text(mes.toUpperCase(), margin + labelW + 1.8, y + rowH1 / 2 + 1.2);
  y += rowH1;

  // Fila MINISTERIO
  doc.rect(margin, y, labelW, rowH1);
  doc.setFont(FONT, "bold");
  doc.text("MINISTERIO:", margin + 1.8, y + rowH1 / 2 + 1.2);
  doc.rect(margin + labelW, y, contentW - labelW, rowH1);
  doc.setFont(FONT, "normal");
  doc.text(
    doc.splitTextToSize(template.nombreMinisterio, contentW - labelW - 3)[0],
    margin + labelW + 1.8,
    y + rowH1 / 2 + 1.2
  );
  y += rowH1;

  // Fila LÍDER
  doc.rect(margin, y, labelW, rowH1);
  doc.setFont(FONT, "bold");
  doc.text("LÍDER:", margin + 1.8, y + rowH1 / 2 + 1.2);
  doc.rect(margin + labelW, y, contentW - labelW, rowH1);
  doc.setFont(FONT, "normal");
  doc.text(
    doc.splitTextToSize(liderNombre || "—", contentW - labelW - 3)[0],
    margin + labelW + 1.8,
    y + rowH1 / 2 + 1.2
  );
  y += rowH1;

  // ===== Tabla =====
  const head = [["FECHA", ...template.estaciones.map((e) => e.toUpperCase()), "UNIFORME", "OBSERVACIÓN"]];
  const body = eventos.map((ev) => {
    const fechaTxt = formatFechaLarga(ev.fecha) + (ev.hora ? ` ${ev.hora}` : "");
    const asigs = asignacionesPorEvento.get(ev.id) || new Map();
    const row = [fechaTxt];
    template.estaciones.forEach((est) => row.push(asigs.get(normKey(est)) || ""));
    row.push(uniformePorEvento?.get(ev.id) || "");
    row.push(observacionPorEvento?.get(ev.id) || "");
    return row;
  });

  if (body.length === 0) {
    body.push(["Sin eventos programados", ...template.estaciones.map(() => ""), "", ""]);
  }

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
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold", halign: "left" },
    columnStyles: { 0: { cellWidth: 38 } },
    margin: { left: margin, right: margin, top: margin + headerH + 2, bottom: margin + bottomReserve + 2 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader(margin);
    },
  });

  let afterY = (doc as any).lastAutoTable.finalY;

  const ensureSpace = (needed: number) => {
    if (afterY + needed > pageHeight - margin - bottomReserve - 2) {
      doc.addPage();
      drawHeader(margin);
      afterY = margin + headerH + 2;
    }
  };

  // ===== Importante (dentro de fila tipo tabla, sin espacios) =====
  if (template.importante) {
    doc.setFontSize(9);
    const innerW = contentW - labelW - 3;
    const txt = doc.splitTextToSize(template.importante, innerW);
    const rowH = Math.max(rowH1, txt.length * 3.6 + 3);
    ensureSpace(rowH);
    doc.rect(margin, afterY, labelW, rowH);
    doc.setFont(FONT, "bold");
    doc.text("Importante:", margin + 1.8, afterY + 4.5);
    doc.rect(margin + labelW, afterY, contentW - labelW, rowH);
    doc.setFont(FONT, "normal");
    doc.text(txt, margin + labelW + 1.8, afterY + 4.5);
    afterY += rowH;
  }

  // ===== Responsabilidades (fila tipo tabla) =====
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

  // ===== Firmas (Elaborado / Revisado / Autorizado) — unido al contenido =====
  // Columna de etiquetas (Firma / Nombre / Cargo) angosta = labelW (igual a Código/Versión/Fecha).
  const fRowH = 6.5;
  const firmLabelW = labelW;
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

  // ===== Pie de página (paginación) en todas las páginas =====
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooter(i, pages);
  }

  const fname = `${template.codigo}-${template.nombreMinisterio.replace(/\s+/g, "_")}-${mes}.pdf`;
  doc.save(fname);
}


/** clave normalizada para comparar nombres de estación con nombres de cargo. */
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
