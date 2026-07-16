import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportOptions {
  title: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  filename: string;
}

export function exportToPDF({ title, columns, data, filename }: ExportOptions) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  // Date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`, 14, 28);

  // Table
  autoTable(doc, {
    startY: 34,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}

export function exportToExcel({ title, columns, data, filename }: ExportOptions) {
  try {
    const wsData = [
      columns.map((c) => c.header),
      ...data.map((row) => columns.map((c) => row[c.key] ?? "")),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = columns.map(() => ({ wch: 20 }));

    // Sanitize sheet name (Excel: max 31 chars, no : \ / ? * [ ])
    const safeSheetName = (title || "Hoja1").replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Hoja1";

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    // Generate as array buffer and trigger download via Blob (more reliable across browsers)
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error("[exportToExcel] Error:", err);
    throw err;
  }
}

/** CSV export — RFC 4180 quoting, UTF-8 with BOM so Excel opens accents correctly. */
export function exportToCSV({ columns, data, filename }: ExportOptions) {
  const escape = (val: any): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = [
    columns.map((c) => escape(c.header)).join(","),
    ...data.map((row) => columns.map((c) => escape(row[c.key])).join(",")),
  ];
  const csv = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface DetailedPDFSection {
  label: string;
  value: string | number | null | undefined;
  /** true = ocupa toda la fila (útil para observaciones largas) */
  fullWidth?: boolean;
}

export interface DetailedPDFRecord {
  title: string;
  subtitle?: string;
  badge?: string;
  sections: DetailedPDFSection[];
  footer?: string;
}

/**
 * PDF detallado — una página por registro. Ideal para reportes de grupo,
 * consejerías, planificaciones, etc. Cabecera con logo textual, cuerpo en
 * dos columnas y footer con timestamp.
 */
export function exportToPDFDetailed({
  title, filename, records, headerNote,
}: {
  title: string;
  filename: string;
  records: DetailedPDFRecord[];
  headerNote?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const fecha = new Date().toLocaleString("es-CO");

  records.forEach((rec, idx) => {
    if (idx > 0) doc.addPage();

    // Header band
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.text(title, marginX, 14);
    doc.setFontSize(9);
    doc.text(`Página ${idx + 1} de ${records.length}`, pageW - marginX, 14, { align: "right" });

    // Title + badge
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.text(rec.title, marginX, 34);
    if (rec.subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(rec.subtitle, marginX, 40);
    }
    if (rec.badge) {
      doc.setFillColor(230, 236, 245);
      doc.setTextColor(30, 41, 59);
      const w = doc.getTextWidth(rec.badge) + 8;
      doc.roundedRect(pageW - marginX - w, 30, w, 7, 2, 2, "F");
      doc.setFontSize(9);
      doc.text(rec.badge, pageW - marginX - w / 2, 35, { align: "center" });
    }

    // Divider
    doc.setDrawColor(220);
    doc.line(marginX, 45, pageW - marginX, 45);

    // Body — two columns
    doc.setTextColor(0);
    const colW = (pageW - marginX * 2) / 2;
    let yLeft = 52, yRight = 52;
    rec.sections.forEach((s) => {
      const value = s.value == null || s.value === "" ? "—" : String(s.value);
      if (s.fullWidth) {
        const y = Math.max(yLeft, yRight);
        doc.setFontSize(9);
        doc.setTextColor(110);
        doc.text(s.label.toUpperCase(), marginX, y);
        doc.setFontSize(10);
        doc.setTextColor(0);
        const lines = doc.splitTextToSize(value, pageW - marginX * 2);
        doc.text(lines, marginX, y + 5);
        const consumed = 6 + lines.length * 5;
        yLeft = yRight = y + consumed + 4;
        return;
      }
      const useLeft = yLeft <= yRight;
      const x = useLeft ? marginX : marginX + colW;
      let y = useLeft ? yLeft : yRight;
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(s.label.toUpperCase(), x, y);
      doc.setFontSize(10);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(value, colW - 4);
      doc.text(lines, x, y + 5);
      const consumed = 6 + lines.length * 5 + 4;
      if (useLeft) yLeft += consumed; else yRight += consumed;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(140);
    const footerParts = [`Generado: ${fecha}`];
    if (headerNote) footerParts.push(headerNote);
    if (rec.footer) footerParts.push(rec.footer);
    doc.text(footerParts.join("  ·  "), marginX, pageH - 8);
  });

  doc.save(`${filename}.pdf`);
}


export function exportGroupProfilePDF(grupo: {
  nombre: string;
  tipo: string;
  red?: string | null;
  estado: string;
  dia_reunion?: string | null;
  hora_reunion?: string | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  created_at: string;
  lider?: { nombres: string; apellidos: string; telefono?: string | null } | null;
}, metrics: {
  total: number;
  equipo: number;
  avgPresentes: number;
  totalNuevos: number;
  inactivos: number;
  retencion: number;
}, miembros: { nombre: string; rol: string; telefono?: string; email?: string; estado: string }[],
reportes: { fecha: string; presentes: number; ausentes: number; nuevos: number; ofrenda: number; estado: string }[]) {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  // Title
  doc.setFontSize(18);
  doc.text(`Perfil 360° — ${grupo.nombre}`, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${fecha}`, 14, 28);

  // General info
  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text("Información General", 14, 40);

  autoTable(doc, {
    startY: 46,
    head: [["Campo", "Valor"]],
    body: [
      ["Tipo de grupo", grupo.tipo],
      ["Red", grupo.red || "Sin asignar"],
      ["Estado", grupo.estado],
      ["Día de reunión", `${grupo.dia_reunion || "—"} ${grupo.hora_reunion || ""}`],
      ["Dirección", grupo.ubicacion || "—"],
      ["Líder", grupo.lider ? `${grupo.lider.nombres} ${grupo.lider.apellidos}` : "—"],
      ["Teléfono líder", grupo.lider?.telefono || "—"],
      ["Descripción", grupo.descripcion || "—"],
      ["Fecha de creación", new Date(grupo.created_at).toLocaleDateString("es-CO")],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  // Metrics
  let y = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(13);
  doc.text("Métricas", 14, y);

  autoTable(doc, {
    startY: y + 6,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total integrantes", String(metrics.total)],
      ["Equipo de trabajo", String(metrics.equipo)],
      ["Promedio asistencia", String(metrics.avgPresentes)],
      ["Nuevos (acumulado)", String(metrics.totalNuevos)],
      ["Inactivos", String(metrics.inactivos)],
      ["Retención", `${metrics.retencion}%`],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  // Members
  y = (doc as any).lastAutoTable.finalY + 12;
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.text(`Integrantes (${miembros.length})`, 14, y);

  autoTable(doc, {
    startY: y + 6,
    head: [["Nombre", "Rol", "Teléfono", "Email", "Estado"]],
    body: miembros.map(m => [m.nombre, m.rol, m.telefono || "—", m.email || "—", m.estado]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Reports
  if (reportes.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 12;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text(`Últimos Reportes (${reportes.length})`, 14, y);

    autoTable(doc, {
      startY: y + 6,
      head: [["Fecha", "Presentes", "Ausentes", "Nuevos", "Ofrenda", "Estado"]],
      body: reportes.map(r => [r.fecha, String(r.presentes), String(r.ausentes), String(r.nuevos), `$${r.ofrenda}`, r.estado]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
  }

  doc.save(`perfil-${grupo.nombre.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportFinancialSummaryPDF(stats: {
  ingresosMes: number;
  gastosMes: number;
  totalPersonas: number;
  nuevosEsteMes: number;
  certificadosTotal: number;
  cursosActivos: number;
  alumnosMatriculados: number;
  proximosEventos: number;
}) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Reporte General de la Iglesia", 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`, 14, 28);

  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text("Resumen Financiero del Mes", 14, 42);

  autoTable(doc, {
    startY: 48,
    head: [["Concepto", "Valor"]],
    body: [
      ["Ingresos del mes", `$${stats.ingresosMes.toLocaleString()}`],
      ["Gastos del mes", `$${stats.gastosMes.toLocaleString()}`],
      ["Balance", `$${(stats.ingresosMes - stats.gastosMes).toLocaleString()}`],
    ],
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  const y = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(13);
  doc.text("Indicadores Generales", 14, y);

  autoTable(doc, {
    startY: y + 6,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de personas", String(stats.totalPersonas)],
      ["Nuevos este mes", String(stats.nuevosEsteMes)],
      ["Certificados emitidos", String(stats.certificadosTotal)],
      ["Cursos activos", String(stats.cursosActivos)],
      ["Alumnos matriculados", String(stats.alumnosMatriculados)],
      ["Próximos eventos", String(stats.proximosEventos)],
    ],
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  doc.save("reporte-general.pdf");
}

/** PDF de programación por ministerio: lista próximos eventos con servidores y cargos. */
export function exportMinisterioProgramaPDF(params: {
  ministerioNombre: string;
  color?: string | null;
  eventos: { id: string; titulo: string; fecha: string; hora: string | null; lugar: string | null; estado: string }[];
  filasPorEvento: Map<string, { servidor: string; cargo: string; tipo: string; estado: string; asistencia: string; telefono: string }[]>;
}) {
  const { ministerioNombre, eventos, filasPorEvento } = params;
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  doc.setFontSize(16);
  doc.text(`Programación — ${ministerioNombre}`, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${fecha} · ${eventos.length} evento(s)`, 14, 28);
  doc.setTextColor(0);

  let y = 36;
  if (eventos.length === 0) {
    doc.setFontSize(11);
    doc.text("Sin eventos programados.", 14, y);
  }

  for (const ev of eventos) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`${ev.fecha}${ev.hora ? "  " + ev.hora : ""} · ${ev.titulo}`, 14, y);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${ev.lugar || "—"} · Estado: ${ev.estado}`, 14, y + 5);
    doc.setTextColor(0);
    const filas = filasPorEvento.get(ev.id) || [];
    autoTable(doc, {
      startY: y + 9,
      head: [["Servidor", "Cargo", "Tipo", "Estado", "Asistencia", "Tel."]],
      body: filas.length
        ? filas.map((f) => [f.servidor, f.cargo, f.tipo, f.estado, f.asistencia, f.telefono])
        : [["—", "—", "—", "—", "—", "—"]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`programacion-${ministerioNombre.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
