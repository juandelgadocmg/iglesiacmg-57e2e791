import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface KardexRow {
  semestre: number;
  codigo: string;
  nombre: string;
  creditos: number;
  estado: string;
  nota_final: number | null;
}

interface KardexCtx {
  estudiante: string;
  documento?: string;
  programa: string;
  promedio?: number | string;
  creditosAprobados: number;
  creditosTotales: number;
  rows: KardexRow[];
  certificado?: boolean;
}

export function exportKardexPdf(ctx: KardexCtx) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Iglesia Cristiana CMG — Seminario Bíblico", 14, 16);
  doc.setFontSize(12);
  doc.text(ctx.certificado ? "Certificado Académico + Historial" : "Historial Académico (Kárdex)", 14, 24);
  doc.setFontSize(10);
  doc.text(`Estudiante: ${ctx.estudiante}`, 14, 34);
  if (ctx.documento) doc.text(`Documento: ${ctx.documento}`, 14, 40);
  doc.text(`Programa: ${ctx.programa}`, 14, 46);
  doc.text(`Promedio acumulado: ${ctx.promedio ?? "—"}`, 14, 52);
  doc.text(`Créditos aprobados: ${ctx.creditosAprobados} / ${ctx.creditosTotales}`, 14, 58);

  autoTable(doc, {
    startY: 64,
    head: [["Sem.", "Código", "Materia", "Créd.", "Estado", "Nota"]],
    body: ctx.rows.map(r => [r.semestre, r.codigo, r.nombre, r.creditos, r.estado, r.nota_final ?? "—"]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  if (ctx.certificado) {
    const y = (doc as any).lastAutoTable.finalY + 14;
    doc.setFontSize(11);
    doc.text("La Iglesia Cristiana CMG certifica que el estudiante ha cursado y aprobado", 14, y);
    doc.text(`la totalidad del programa "${ctx.programa}" con un promedio de ${ctx.promedio ?? "—"}.`, 14, y + 6);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-CO")}`, 14, y + 18);
  }

  doc.save(`${ctx.certificado ? "Certificado" : "Kardex"}_${ctx.estudiante.replace(/\s+/g, "_")}.pdf`);
}
