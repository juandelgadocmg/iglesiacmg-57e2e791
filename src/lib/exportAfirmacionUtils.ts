import * as XLSX from "xlsx";
import { PersonaAfirmacionRuta, HITOS_AFIRMACION_16 } from "@/hooks/useAfirmacionRuta";

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

function buildHeaders(): string[] {
  const base = [
    "Nombres",
    "Apellidos",
    "Documento",
    "Teléfono",
    "WhatsApp",
    "Email",
    "Dirección",
    "Barrio",
    "Fecha Ingreso",
    "Días desde ingreso",
    "Consolidador",
    "Red",
    "CDP Asignada",
    "Invitado por",
  ];

  HITOS_AFIRMACION_16.forEach((h) => {
    base.push(`${h.index}. ${h.nombre} (Estado)`, `${h.index}. ${h.nombre} (Fecha realizada)`);
  });

  base.push("Hitos completados", "Avance %", "Estado general", "Con atrasos");

  return base;
}

function buildRows(personas: PersonaAfirmacionRuta[]): (string | number)[][] {
  return personas.map((p) => {
    const row: (string | number)[] = [
      p.nombres || "",
      p.apellidos || "",
      p.documento || "",
      p.telefono || "",
      p.whatsapp || "",
      p.email || "",
      p.direccion || "",
      p.barrio || "",
      fmtDate(p.fechaIngreso),
      p.diasDesdeIngreso,
      p.consolidadorNombre || "",
      p.redNombre || "",
      p.grupoNombre || "Sin asignar",
      p.invitadoPor || "",
    ];

    p.hitos.forEach((h) => {
      row.push(h.estado, h.fechaRealizada ? fmtDate(h.fechaRealizada) : "");
    });

    row.push(p.hitosCompletados, p.porcentajeCompletado, p.estadoGeneral, p.tieneAtrasos ? "Sí" : "No");

    return row;
  });
}

/**
 * Exporta a Excel exactamente los datos que se ven en la tabla del módulo de
 * Afirmación (visitantes/directos, sin Casas de Paz), incluyendo el estado y
 * la fecha realizada de cada uno de los 16 hitos, tal como se calculan a
 * partir de los procesos ya registrados en el módulo Personas.
 */
export function exportAfirmacionHitosExcel(
  personas: PersonaAfirmacionRuta[],
  filenameBase = "afirmacion_hitos",
  rangoLabel = ""
) {
  const headers = buildHeaders();
  const rows = buildRows(personas);

  const summaryHeader = ["MÓDULO DE AFIRMACIÓN — RUTA DE 16 HITOS DE CRECIMIENTO"];
  const summaryInfo = [
    `Generado el ${new Date().toLocaleDateString("es-CO")}${rangoLabel ? " · " + rangoLabel : ""} · ${personas.length} persona(s)`,
  ];
  const emptyRow: string[] = [];

  const aoa = [summaryHeader, summaryInfo, emptyRow, headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const cols = headers.map((h) => {
    if (h.includes("(Fecha")) return { wch: 14 };
    if (h.includes("(Estado)")) return { wch: 14 };
    if (h === "Nombres" || h === "Apellidos" || h === "Dirección") return { wch: 20 };
    if (h === "CDP Asignada") return { wch: 22 };
    return { wch: 16 };
  });
  ws["!cols"] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Afirmación - 16 Hitos");
  XLSX.writeFile(wb, `${filenameBase}.xlsx`);
}
