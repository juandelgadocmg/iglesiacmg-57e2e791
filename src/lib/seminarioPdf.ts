import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

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
  inscripcionId?: string;
}

export async function buildKardexPdf(ctx: KardexCtx): Promise<jsPDF> {
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

  // QR de verificación
  if (ctx.inscripcionId) {
    try {
      const verifyUrl = `${window.location.origin}/verificar-academico/${ctx.inscripcionId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
      doc.addImage(qrDataUrl, "PNG", 165, 30, 30, 30);
      doc.setFontSize(7);
      doc.text("Escanea para verificar", 165, 64);
    } catch {}
  }

  autoTable(doc, {
    startY: 70,
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
  return doc;
}

export async function exportKardexPdf(ctx: KardexCtx) {
  const doc = await buildKardexPdf(ctx);
  doc.save(`${ctx.certificado ? "Certificado" : "Kardex"}_${ctx.estudiante.replace(/\s+/g, "_")}.pdf`);
}

/** Exporta varios kárdex (uno por estudiante) descargándolos en serie. */
export async function exportKardexBatch(items: KardexCtx[]) {
  for (const it of items) {
    await exportKardexPdf(it);
    await new Promise(r => setTimeout(r, 250));
  }
}
