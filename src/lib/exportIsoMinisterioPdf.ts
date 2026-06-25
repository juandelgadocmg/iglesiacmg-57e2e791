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

  // Horizontal A4 para que las columnas quepan.
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 8;

  // ===== Encabezado (caja con 3 columnas) =====
  const headerY = margin;
  const headerH = 18;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  // Caja izquierda (logo placeholder)
  doc.rect(margin, headerY, 36, headerH);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CMG", margin + 18, headerY + 8, { align: "center" });
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("CENTRO MUNDIAL", margin + 18, headerY + 11, { align: "center" });
  doc.text("DE GLORIA", margin + 18, headerY + 14, { align: "center" });

  // Caja centro (título)
  const titleX = margin + 36;
  const titleW = pageWidth - margin * 2 - 36 - 50;
  doc.rect(titleX, headerY, titleW, headerH);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(template.titulo, titleX + titleW / 2, headerY + headerH / 2 + 1, { align: "center" });

  // Caja derecha (código/versión/fecha) en 3 filas
  const metaX = titleX + titleW;
  const metaW = 50;
  const rowH = headerH / 3;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const metas: [string, string][] = [
    ["Código:", template.codigo],
    ["Versión:", template.version],
    ["Fecha:", template.fechaVigencia],
  ];
  metas.forEach(([k, v], i) => {
    const y = headerY + rowH * i;
    doc.rect(metaX, y, 18, rowH);
    doc.rect(metaX + 18, y, metaW - 18, rowH);
    doc.setFont("helvetica", "bold");
    doc.text(k, metaX + 2, y + rowH / 2 + 1.2);
    doc.setFont("helvetica", "normal");
    doc.text(v, metaX + 20, y + rowH / 2 + 1.2);
  });

  // ===== Mes / Ministerio / Líder =====
  let y = headerY + headerH + 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.rect(margin, y, 20, 6);
  doc.text("MES", margin + 10, y + 4, { align: "center" });
  doc.rect(margin + 20, y, 60, 6);
  doc.setFont("helvetica", "normal");
  doc.text(mes.toUpperCase(), margin + 22, y + 4);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("MINISTERIO:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(template.nombreMinisterio, margin + 28, y);
  doc.setFont("helvetica", "bold");
  doc.text("LÍDER:", margin + 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(liderNombre || "—", margin + 125, y);

  y += 4;

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
    styles: { fontSize: 7, cellPadding: 1.5, valign: "middle", lineWidth: 0.2, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: 36 } },
    margin: { left: margin, right: margin },
  });

  let afterY = (doc as any).lastAutoTable.finalY + 4;

  // ===== Importante =====
  if (template.importante) {
    if (afterY > 175) { doc.addPage(); afterY = margin; }
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Importante:", margin, afterY);
    doc.setFont("helvetica", "normal");
    const txt = doc.splitTextToSize(template.importante, pageWidth - margin * 2 - 18);
    doc.text(txt, margin + 18, afterY);
    afterY += txt.length * 3 + 2;
  }

  // ===== Responsabilidades =====
  if (afterY > 180) { doc.addPage(); afterY = margin; }
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Responsabilidades:", margin, afterY);
  doc.setFont("helvetica", "normal");
  const resp = doc.splitTextToSize(template.responsabilidades, pageWidth - margin * 2 - 30);
  doc.text(resp, margin + 30, afterY);
  afterY += resp.length * 3 + 4;

  // ===== Firmas =====
  if (afterY > 178) { doc.addPage(); afterY = margin; }
  const colW = (pageWidth - margin * 2) / 4;
  const firmRows = [
    ["", "Elaborado por:", "Revisado por:", "Autorizado por:"],
    ["Firma", "", "", ""],
    ["Nombre", template.firmas.elaboradoPor.nombre, template.firmas.revisadoPor.nombre, template.firmas.autorizadoPor.nombre],
    ["Cargo", template.firmas.elaboradoPor.cargo, template.firmas.revisadoPor.cargo, template.firmas.autorizadoPor.cargo],
  ];
  const fRowH = 7;
  doc.setFontSize(7);
  firmRows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = margin + colW * ci;
      const yRow = afterY + fRowH * ri;
      doc.rect(x, yRow, colW, fRowH);
      doc.setFont("helvetica", ri === 0 ? "bold" : "normal");
      doc.text(cell, x + 1.5, yRow + fRowH / 2 + 1);
    });
  });

  // ===== Footer Pag =====
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Pág ${i}/${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 4, { align: "right" });
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
