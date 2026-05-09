import * as XLSX from "xlsx";
import { parse, format, startOfWeek, endOfWeek } from "date-fns";

export interface FilaImportada {
  sheetName: string;
  fechaCuadre: string; // yyyy-MM-dd
  semanaInicio: string;
  semanaFin: string;
  redExcel: string;
  nombreExcel: string;
  valorReportado: number;
  valorEntregado: number;
  fechaEntrega: string | null;
  observacion: string | null;
}

export interface FilaResuelta extends FilaImportada {
  grupoId: string | null;
  grupoNombre: string | null;
  grupoRed: string | null;
  estado: "ok" | "sin_grupo" | "fila_vacia";
  motivo?: string;
}

const normalize = (s: string) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseMoneda = (raw: any): number => {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return raw;
  const s = String(raw).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

const parseFecha = (raw: any): string | null => {
  if (!raw) return null;
  if (raw instanceof Date) return format(raw, "yyyy-MM-dd");
  if (typeof raw === "number") {
    // Excel serial date
    const epoch = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return format(epoch, "yyyy-MM-dd");
  }
  const s = String(raw).trim();
  const formatos = ["dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "d-MMM-yy", "d-MMM-yyyy", "dd-MMM-yy"];
  for (const f of formatos) {
    try {
      const d = parse(s, f, new Date());
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    } catch {}
  }
  return null;
};

const parseFechaSheetName = (name: string): string | null => {
  // Espera DD-MM-YYYY o DD/MM/YYYY o similares
  const s = name.trim().replace(/\s+/g, "");
  const formatos = ["dd-MM-yyyy", "dd-MM-yy", "dd/MM/yyyy", "dd/MM/yy", "yyyy-MM-dd"];
  for (const f of formatos) {
    try {
      const d = parse(s, f, new Date());
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    } catch {}
  }
  return null;
};

/**
 * Localiza la fila del encabezado y devuelve los índices de columna usados.
 */
function detectarColumnas(rows: any[][]) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i] || [];
    const txt = row.map((c) => normalize(String(c ?? "")));
    if (txt.some((c) => c === "red") && txt.some((c) => c.includes("casa de paz"))) {
      const idxRed = txt.findIndex((c) => c === "red");
      const idxCdp = txt.findIndex((c) => c.includes("casa de paz"));
      const idxRep = txt.findIndex((c) => c.includes("reportado"));
      const idxEnt = txt.findIndex((c) => c.includes("entregado"));
      const idxFecha = txt.findIndex((c) => c.includes("fecha de entrega") || c.includes("fecha entrega"));
      const idxObs = txt.findIndex((c) => c.includes("observ"));
      return { headerRow: i, idxRed, idxCdp, idxRep, idxEnt, idxFecha, idxObs };
    }
  }
  return null;
}

export interface GrupoMin {
  id: string;
  nombre: string;
  red: string | null;
}

export function parseExcelTesoreria(file: ArrayBuffer): FilaImportada[] {
  const wb = XLSX.read(file, { type: "array", cellDates: true });
  const filas: FilaImportada[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
    const cols = detectarColumnas(rows);
    if (!cols) continue;

    // Fecha del cuadre: primero del nombre de la hoja, si no, buscar celda "FECHA" en cabecera
    let fechaCuadre = parseFechaSheetName(sheetName);
    if (!fechaCuadre) {
      // Buscar palabra "FECHA" en primeras filas
      for (let i = 0; i < cols.headerRow; i++) {
        const row = rows[i] || [];
        for (let j = 0; j < row.length; j++) {
          if (normalize(String(row[j] ?? "")).startsWith("fecha")) {
            const candidato = parseFecha(row[j + 1]) || parseFecha(row[j + 2]) || parseFecha(row[j + 3]);
            if (candidato) {
              fechaCuadre = candidato;
              break;
            }
          }
        }
        if (fechaCuadre) break;
      }
    }
    if (!fechaCuadre) continue;

    const semanaInicio = format(startOfWeek(parse(fechaCuadre, "yyyy-MM-dd", new Date()), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const semanaFin = format(endOfWeek(parse(fechaCuadre, "yyyy-MM-dd", new Date()), { weekStartsOn: 1 }), "yyyy-MM-dd");

    for (let i = cols.headerRow + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const red = String(row[cols.idxRed] ?? "").trim();
      const nombre = cols.idxCdp >= 0 ? String(row[cols.idxCdp] ?? "").trim() : "";
      if (!nombre && !red) continue;
      // Saltar filas de subtotales/total
      if (/total|subtotal/i.test(red) || /total|subtotal/i.test(nombre)) continue;
      const valorReportado = cols.idxRep >= 0 ? parseMoneda(row[cols.idxRep]) : 0;
      const valorEntregado = cols.idxEnt >= 0 ? parseMoneda(row[cols.idxEnt]) : 0;
      const fechaEntregaRaw = cols.idxFecha >= 0 ? row[cols.idxFecha] : null;
      const fechaEntrega = parseFecha(fechaEntregaRaw);
      const observacion = cols.idxObs >= 0 && row[cols.idxObs] ? String(row[cols.idxObs]).trim() : null;

      // Si la fila no tiene nombre ni valores, ignorar
      if (!nombre && valorReportado === 0 && valorEntregado === 0) continue;

      filas.push({
        sheetName,
        fechaCuadre,
        semanaInicio,
        semanaFin,
        redExcel: red,
        nombreExcel: nombre,
        valorReportado,
        valorEntregado,
        fechaEntrega: fechaEntrega || (valorEntregado > 0 ? fechaCuadre : null),
        observacion,
      });
    }
  }

  return filas;
}

/**
 * Resuelve cada fila contra la lista de grupos disponibles.
 * Match: normalizado por nombre + red. Si no hay match con red, prueba solo por nombre.
 */
export function resolverGrupos(filas: FilaImportada[], grupos: GrupoMin[]): FilaResuelta[] {
  const byNomRed: Record<string, GrupoMin> = {};
  const byNom: Record<string, GrupoMin[]> = {};
  for (const g of grupos) {
    const k = `${normalize(g.red || "")}__${normalize(g.nombre)}`;
    byNomRed[k] = g;
    const kn = normalize(g.nombre);
    if (!byNom[kn]) byNom[kn] = [];
    byNom[kn].push(g);
  }

  return filas.map((f) => {
    if (!f.nombreExcel) {
      return { ...f, grupoId: null, grupoNombre: null, grupoRed: null, estado: "fila_vacia" };
    }
    const key = `${normalize(f.redExcel)}__${normalize(f.nombreExcel)}`;
    let g = byNomRed[key];
    if (!g) {
      const candidatos = byNom[normalize(f.nombreExcel)] || [];
      if (candidatos.length === 1) g = candidatos[0];
    }
    if (g) {
      return {
        ...f,
        grupoId: g.id,
        grupoNombre: g.nombre,
        grupoRed: g.red,
        estado: "ok",
      };
    }
    return {
      ...f,
      grupoId: null,
      grupoNombre: null,
      grupoRed: null,
      estado: "sin_grupo",
      motivo: `No se encontró Casa de Paz "${f.nombreExcel}" (red: ${f.redExcel || "—"})`,
    };
  });
}
