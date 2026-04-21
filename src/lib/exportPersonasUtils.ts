import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Proceso {
  id: string;
  nombre: string;
  orden: number;
}

interface PersonaProceso {
  proceso_id: string;
  estado: string | null;
  fecha_completado: string | null;
  observacion: string | null;
}

interface PersonaExport {
  nombres: string;
  apellidos: string;
  tipo_persona?: string | null;
  estado_iglesia?: string | null;
  vinculacion?: string | null;
  ministerio?: string | null;
  red?: string | null;
  grupos?: { nombre?: string | null } | null;
  fecha_ingreso?: string | null;
  invitado_por?: string | null;
  seguimiento_por?: string | null;
  persona_procesos?: PersonaProceso[];
}

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  return d.length >= 10 ? d.substring(0, 10) : d;
};

function buildHeaders(procesos: Proceso[]): string[] {
  const base = [
    "nombres*",
    "apellidos*",
    "tipo_persona",
    "estado_iglesia",
    "vinculacion",
    "ministerio",
    "red",
    "grupo",
    "fecha_ingreso",
    "invitado_por",
    "seguimiento_por",
  ];
  const procCols: string[] = [];
  for (const p of procesos) {
    procCols.push(`${p.nombre} (Estado)`, `${p.nombre} (Fecha)`, `${p.nombre} (Observación)`);
  }
  return [...base, ...procCols];
}

function buildRows(personas: PersonaExport[], procesos: Proceso[]): (string | number | null)[][] {
  return personas.map((p) => {
    const procesosMap = new Map<string, PersonaProceso>();
    (p.persona_procesos || []).forEach((pp) => procesosMap.set(pp.proceso_id, pp));

    const baseRow: (string | number | null)[] = [
      p.nombres || "",
      p.apellidos || "",
      p.tipo_persona || "",
      p.estado_iglesia || "",
      p.vinculacion || "",
      p.ministerio || "",
      p.red || "",
      p.grupos?.nombre || "",
      fmtDate(p.fecha_ingreso),
      p.invitado_por || "",
      p.seguimiento_por || "",
    ];

    for (const proc of procesos) {
      const pp = procesosMap.get(proc.id);
      baseRow.push(pp?.estado || "No realizado", fmtDate(pp?.fecha_completado), pp?.observacion || "");
    }

    return baseRow;
  });
}

export function exportPersonasInformeConsolidacionExcel(
  personas: PersonaExport[],
  procesos: Proceso[],
  filename = "informe_consolidacion"
) {
  const headers = buildHeaders(procesos);
  const rows = buildRows(personas, procesos);
  const aoa = [headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const cols = headers.map((h) => {
    if (h.includes("Observación")) return { wch: 28 };
    if (h.includes("(Fecha)")) return { wch: 12 };
    if (h.includes("(Estado)")) return { wch: 16 };
    if (h === "nombres*" || h === "apellidos*") return { wch: 20 };
    return { wch: 18 };
  });
  ws["!cols"] = cols;

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true } };
    }
  }
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as any;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Personas");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPersonasInformeConsolidacionPDF(
  personas: PersonaExport[],
  procesos: Proceso[],
  filename = "informe_consolidacion",
  rangoLabel = ""
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(15);
  doc.text("Informe de Consolidación — Personas", 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Generado: ${fecha}${rangoLabel ? "  •  " + rangoLabel : ""}  •  Total: ${personas.length}`, 14, 21);
  doc.setTextColor(0);

  const headers = ["Nombres", "Apellidos", "Tipo", "Estado", "Grupo", "Fecha Ingreso", "Invitado por", "Procesos completados"];

  const body = personas.map((p) => {
    const completos = (p.persona_procesos || []).filter((pp) => pp.estado === "Completado" || pp.estado === "Realizado").length;
    return [
      p.nombres || "",
      p.apellidos || "",
      p.tipo_persona || "",
      p.estado_iglesia || "",
      p.grupos?.nombre || "",
      fmtDate(p.fecha_ingreso),
      p.invitado_por || "",
      `${completos}/${procesos.length}`,
    ];
  });

  autoTable(doc, {
    startY: 26,
    head: [headers],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}
