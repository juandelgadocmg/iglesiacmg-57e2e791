import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
export function exportIsoMinisterioPdf(params: {
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

  // A4 horizontal, márgenes 1.5 cm (15 mm) — jsPDF no incluye Arial Narrow;
  // usamos helvetica (métricamente equivalente a Arial) que es lo más cercano
  // a "Arial Narrow" disponible en jsPDF sin embeber fuentes externas.
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // 1.5 cm
  const FONT = "helvetica"; // sustituto de Arial Narrow
  doc.setFont(FONT, "normal");

  const headerH = 18;

  /** Dibuja el encabezado (logo + título + código/versión/fecha) en la posición dada. */
  const drawHeader = (topY: number) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Caja izquierda (logo)
    doc.rect(margin, topY, 36, headerH);
    doc.setFontSize(10);
    doc.setFont(FONT, "bold");
    doc.text("CMG", margin + 18, topY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont(FONT, "normal");
    doc.text("CENTRO MUNDIAL", margin + 18, topY + 11, { align: "center" });
    doc.text("DE GLORIA", margin + 18, topY + 14, { align: "center" });

    // Caja centro (título)
    const titleX = margin + 36;
    const titleW = pageWidth - margin * 2 - 36 - 50;
    doc.rect(titleX, topY, titleW, headerH);
    doc.setFontSize(12);
    doc.setFont(FONT, "bold");
    doc.text(template.titulo, titleX + titleW / 2, topY + headerH / 2 + 1, { align: "center" });

    // Caja derecha (código/versión/fecha)
    const metaX = titleX + titleW;
    const metaW = 50;
    const rowH = headerH / 3;
    doc.setFontSize(9);
    const metas: [string, string][] = [
      ["Código:", template.codigo],
      ["Versión:", template.version],
      ["Fecha:", template.fechaVigencia],
    ];
    metas.forEach(([k, v], i) => {
      const yy = topY + rowH * i;
      doc.rect(metaX, yy, 18, rowH);
      doc.rect(metaX + 18, yy, metaW - 18, rowH);
      doc.setFont(FONT, "bold");
      doc.text(k, metaX + 2, yy + rowH / 2 + 1.2);
      doc.setFont(FONT, "normal");
      doc.text(v, metaX + 20, yy + rowH / 2 + 1.2);
    });
  };

  /** Dibuja el pie de página (paginación) en cada página. */
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(9);
    doc.setFont(FONT, "italic");
    doc.text(
      `${template.codigo} · v${template.version}`,
      margin,
      pageHeight - 6
    );
    doc.text(
      `Pág ${pageNum}/${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: "right" }
    );
  };

  // ===== Página 1 =====
  drawHeader(margin);
  let y = margin + headerH + 6;

  // Mes / Ministerio / Líder
  doc.setFontSize(11);
  doc.setFont(FONT, "bold");
  doc.rect(margin, y, 24, 7);
  doc.text("MES", margin + 12, y + 4.8, { align: "center" });
  doc.rect(margin + 24, y, 90, 7);
  doc.setFont(FONT, "normal");
  doc.text(mes.toUpperCase(), margin + 26, y + 4.8);

  y += 12;
  doc.setFont(FONT, "bold");
  doc.text("MINISTERIO:", margin, y);
  doc.setFont(FONT, "normal");
  const ministerioMaxW = 120;
  doc.text(doc.splitTextToSize(template.nombreMinisterio, ministerioMaxW)[0], margin + 32, y);
  doc.setFont(FONT, "bold");
  doc.text("LÍDER:", margin + 160, y);
  doc.setFont(FONT, "normal");
  const liderMaxW = pageWidth - margin - (margin + 178);
  doc.text(doc.splitTextToSize(liderNombre || "—", liderMaxW)[0], margin + 178, y);

  y += 6;

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
    body.push([
      "Sin eventos programados",
      ...template.estaciones.map(() => ""),
      "",
      "",
    ]);
  }

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { font: FONT, fontSize: 8, cellPadding: 1.5, valign: "middle", lineWidth: 0.2, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: 38 } },
    margin: { left: margin, right: margin, top: margin + headerH + 4, bottom: margin + 8 },
    // Repite encabezado y pie de página en cada nueva página
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(margin);
      }
    },
  });

  let afterY = (doc as any).lastAutoTable.finalY + 5;

  const ensureSpace = (needed: number) => {
    if (afterY + needed > pageHeight - margin - 8) {
      doc.addPage();
      drawHeader(margin);
      afterY = margin + headerH + 6;
    }
  };

  // ===== Importante =====
  if (template.importante) {
    doc.setFontSize(9);
    const txt = doc.splitTextToSize(template.importante, pageWidth - margin * 2 - 22);
    ensureSpace(txt.length * 3.5 + 4);
    doc.setFont(FONT, "bold");
    doc.text("Importante:", margin, afterY);
    doc.setFont(FONT, "normal");
    doc.text(txt, margin + 22, afterY);
    afterY += txt.length * 3.5 + 3;
  }

  // ===== Responsabilidades =====
  doc.setFontSize(9);
  const resp = doc.splitTextToSize(template.responsabilidades, pageWidth - margin * 2 - 34);
  ensureSpace(resp.length * 3.5 + 4);
  doc.setFont(FONT, "bold");
  doc.text("Responsabilidades:", margin, afterY);
  doc.setFont(FONT, "normal");
  doc.text(resp, margin + 34, afterY);
  afterY += resp.length * 3.5 + 5;

  // ===== Firmas =====
  const fRowH = 8;
  ensureSpace(fRowH * 4 + 2);
  const colW = (pageWidth - margin * 2) / 4;
  const firmRows = [
    ["", "Elaborado por:", "Revisado por:", "Autorizado por:"],
    ["Firma", "", "", ""],
    ["Nombre", template.firmas.elaboradoPor.nombre, template.firmas.revisadoPor.nombre, template.firmas.autorizadoPor.nombre],
    ["Cargo", template.firmas.elaboradoPor.cargo, template.firmas.revisadoPor.cargo, template.firmas.autorizadoPor.cargo],
  ];
  doc.setFontSize(9);
  firmRows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = margin + colW * ci;
      const yRow = afterY + fRowH * ri;
      doc.rect(x, yRow, colW, fRowH);
      doc.setFont(FONT, ri === 0 ? "bold" : "normal");
      doc.text(cell, x + 1.8, yRow + fRowH / 2 + 1.2);
    });
  });

  // ===== Pie de página en TODAS las páginas =====
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
