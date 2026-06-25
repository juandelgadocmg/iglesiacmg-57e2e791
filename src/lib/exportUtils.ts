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
