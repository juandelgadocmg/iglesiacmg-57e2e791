import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PersonaProceso {
  proceso_id: string;
  estado: string;
  fecha_completado: string | null;
  observacion: string | null;
}

export interface PersonaExport {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento?: string | null;
  documento?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  direccion?: string | null;
  estado_civil?: string | null;
  estado_iglesia?: string | null;
  tipo_persona?: string | null;
  ministerio?: string | null;
  red?: string | null;
  grupo_id?: string | null;
  fecha_ingreso?: string | null;
  invitado_por?: string | null;
  seguimiento_por?: string | null;
  grupos?: { nombre?: string | null; red?: string | null } | null;
  persona_procesos?: PersonaProceso[];
}

export interface Proceso {
  id: string;
  nombre: string;
  orden?: number;
}

function fmtDate(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function buildHeaders(procesos: Proceso[]): string[] {
  const base = [
    "nombres*",
    "apellidos*",
    "tipo_documento",
    "documento",
    "sexo",
    "fecha_nacimiento",
    "telefono",
    "whatsapp",
    "email",
    "direccion",
    "estado_civil",
    "estado_iglesia",
    "tipo_persona",
    "ministerio",
    "red",
    "grupo_nombre",
    "fecha_ingreso",
    "invitado_por",
    "seguimiento_por",
  ];

  for (const p of procesos) {
    base.push(`${p.nombre} (Estado)`, `${p.nombre} (Fecha)`, `${p.nombre} (Observación)`);
  }

  return base;
}

function buildRows(personas: PersonaExport[], procesos: Proceso[]): (string | number | null)[][] {
  return personas.map((p) => {
    const procesosMap = new Map<string, PersonaProceso>();
    (p.persona_procesos || []).forEach((pp) => procesosMap.set(pp.proceso_id, pp));

    const baseRow: (string | number | null)[] = [
      p.nombres || "",
      p.apellidos || "",
      p.tipo_documento || "",
      p.documento || "",
      p.sexo || "",
      fmtDate(p.fecha_nacimiento),
      p.telefono || "",
      p.whatsapp || "",
      p.email || "",
      p.direccion || "",
      p.estado_civil || "",
      p.estado_iglesia || "",
      p.tipo_persona || "",
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

// Calculate 45 days metrics from personas
function getConsolidacionMetrics(personas: PersonaExport[]) {
  const entregadasAlConsolidador = personas.length;

  let entregadas45Dias = 0;
  personas.forEach((p) => {
    const procs = p.persona_procesos || [];
    const completadoConsolidacion = procs.some((pp) => {
      const isCompletado = pp.estado === "Completado" || pp.estado === "Realizado";
      const isObs45 = (pp.observacion || "").toLowerCase().includes("45");
      return isCompletado || isObs45;
    });
    if (completadoConsolidacion) {
      entregadas45Dias++;
    }
  });

  return {
    entregadasAlConsolidador,
    entregadas45Dias,
    tasaCumplimiento:
      entregadasAlConsolidador > 0
        ? Math.round((entregadas45Dias / entregadasAlConsolidador) * 100)
        : 0,
  };
}

export function exportPersonasInformeConsolidacionExcel(
  personas: PersonaExport[],
  procesos: Proceso[],
  filename = "informe_consolidacion"
) {
  const metrics = getConsolidacionMetrics(personas);

  // Executive summary rows
  const summaryHeader = ["INFORME DE CONSOLIDACIÓN — RESUMEN EJECUTIVO (45 DÍAS)"];
  const metricsRow1 = ["Indicador", "Valor", "Descripción"];
  const metricsRow2 = [
    "Número de personas entregadas al consolidador",
    metrics.entregadasAlConsolidador,
    "Personas en proceso de consolidación",
  ];
  const metricsRow3 = [
    "Número de personas entregadas al finalizar los 45 días",
    metrics.entregadas45Dias,
    "Personas que completaron el ciclo de 45 días",
  ];
  const metricsRow4 = [
    "Tasa de efectividad de la gestión",
    `${metrics.tasaCumplimiento}%`,
    "Efectividad de retención al finalizar 45 días",
  ];
  const emptyRow = [];

  const headers = buildHeaders(procesos);
  const rows = buildRows(personas, procesos);

  const aoa = [
    summaryHeader,
    metricsRow1,
    metricsRow2,
    metricsRow3,
    metricsRow4,
    emptyRow,
    headers,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const cols = headers.map((h) => {
    if (h.includes("Observación")) return { wch: 28 };
    if (h.includes("(Fecha)")) return { wch: 12 };
    if (h.includes("(Estado)")) return { wch: 16 };
    if (h === "nombres*" || h === "apellidos*") return { wch: 20 };
    return { wch: 18 };
  });
  ws["!cols"] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Informe Consolidación");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPersonasInformeConsolidacionPDF(
  personas: PersonaExport[],
  procesos: Proceso[],
  filename = "informe_consolidacion",
  rangoLabel = ""
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const metrics = getConsolidacionMetrics(personas);

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("Informe de Consolidación — Gestión 45 Días", 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100);
  const fecha = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(
    `Fecha de reporte: ${fecha}${rangoLabel ? "  •  " + rangoLabel : ""}`,
    14,
    21
  );

  // Executive KPI summary box table
  autoTable(doc, {
    startY: 26,
    head: [
      [
        "Personas entregadas al consolidador",
        "Personas entregadas a los 45 días",
        "Efectividad de la gestión (%)",
      ],
    ],
    body: [
      [
        String(metrics.entregadasAlConsolidador),
        String(metrics.entregadas45Dias),
        `${metrics.tasaCumplimiento}%`,
      ],
    ],
    styles: { fontSize: 10, halign: "center", fontStyle: "bold" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    bodyStyles: { fillColor: [241, 245, 249] },
    margin: { bottom: 5 },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 45;

  const headers = [
    "Nombres",
    "Apellidos",
    "Tipo",
    "Estado",
    "Grupo",
    "Fecha Ingreso",
    "Invitado por",
    "Procesos completados",
  ];

  const body = personas.map((p) => {
    const completos = (p.persona_procesos || []).filter(
      (pp) => pp.estado === "Completado" || pp.estado === "Realizado"
    ).length;
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
    startY: finalY,
    head: [headers],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}
