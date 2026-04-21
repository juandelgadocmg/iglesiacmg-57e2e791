import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { FilaTesoreriaCDP } from "@/hooks/useTesoreriaCDP";

interface ExportArgs {
  semanaInicio: string;
  semanaFin: string;
  filas: FilaTesoreriaCDP[];
  configIglesia: any;
  elaboradoPor?: string;
  revisadoPor?: string;
}

export async function exportTesoreriaSemanalPDF({
  semanaInicio,
  semanaFin,
  filas,
  configIglesia,
  elaboradoPor,
  revisadoPor,
}: ExportArgs) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // Encabezado
  let cursorY = margin;

  // Logo
  if (configIglesia?.logo_url) {
    try {
      const img = await loadImage(configIglesia.logo_url);
      doc.addImage(img, "PNG", margin, cursorY, 22, 22);
    } catch {
      // ignore
    }
  }

  // Título central
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    (configIglesia?.nombre_iglesia || "IGLESIA").toUpperCase(),
    pageWidth / 2,
    cursorY + 6,
    { align: "center" }
  );
  doc.setFontSize(10);
  doc.text("REGISTRO OFRENDAS CASA DE PAZ", pageWidth / 2, cursorY + 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Semana del ${format(parseISO(semanaInicio), "dd 'de' MMMM yyyy", { locale: es })} al ${format(parseISO(semanaFin), "dd 'de' MMMM yyyy", { locale: es })}`,
    pageWidth / 2,
    cursorY + 17,
    { align: "center" }
  );

  // Caja código a la derecha
  const boxX = pageWidth - margin - 50;
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.rect(boxX, cursorY, 50, 22);
  doc.setFontSize(7);
  doc.text("CÓDIGO: RE-CO-OC01", boxX + 2, cursorY + 5);
  doc.text("VERSIÓN: 1", boxX + 2, cursorY + 10);
  doc.text(`FECHA: ${format(new Date(), "dd/MM/yyyy")}`, boxX + 2, cursorY + 15);
  doc.text("PÁGINA: 1 de 1", boxX + 2, cursorY + 20);

  cursorY += 26;

  // Info departamento
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DEPARTAMENTO:", margin, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text("Tesorería", margin + 32, cursorY);

  doc.setFont("helvetica", "bold");
  doc.text("ENCARGADO:", margin + 90, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(configIglesia?.pastor_principal || "—", margin + 115, cursorY);

  doc.setFont("helvetica", "bold");
  doc.text("FECHA REUNIÓN:", margin + 180, cursorY);
  doc.setFont("helvetica", "normal");
  doc.text(format(parseISO(semanaInicio), "dd/MM/yyyy"), margin + 215, cursorY);

  cursorY += 5;

  // Construir filas agrupadas por Red
  const redes: Record<string, FilaTesoreriaCDP[]> = {};
  filas.forEach((f) => {
    if (!redes[f.red]) redes[f.red] = [];
    redes[f.red].push(f);
  });

  const body: any[] = [];
  let totalReportado = 0;
  let totalEntregado = 0;

  Object.entries(redes).forEach(([red, items]) => {
    let subReportado = 0;
    let subEntregado = 0;
    items.forEach((it, idx) => {
      subReportado += it.valor_reportado;
      subEntregado += it.valor_entregado;
      body.push([
        idx === 0 ? red : "",
        it.grupo_nombre,
        it.lider_nombre || "—",
        formatCurrency(it.valor_reportado),
        formatCurrency(it.valor_entregado),
        it.fecha_entrega ? format(parseISO(it.fecha_entrega), "dd/MM/yyyy") : "—",
        it.observacion || "",
        it.estado,
      ]);
    });
    body.push([
      { content: `Subtotal ${red}`, colSpan: 3, styles: { fontStyle: "bold", halign: "right", fillColor: [240, 240, 240] } },
      { content: formatCurrency(subReportado), styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: formatCurrency(subEntregado), styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: "", colSpan: 3, styles: { fillColor: [240, 240, 240] } },
    ]);
    totalReportado += subReportado;
    totalEntregado += subEntregado;
  });

  body.push([
    { content: "TOTALES", colSpan: 3, styles: { fontStyle: "bold", halign: "right", fillColor: [220, 230, 240] } },
    { content: formatCurrency(totalReportado), styles: { fontStyle: "bold", fillColor: [220, 230, 240] } },
    { content: formatCurrency(totalEntregado), styles: { fontStyle: "bold", fillColor: [220, 230, 240] } },
    { content: `Diferencia: ${formatCurrency(totalReportado - totalEntregado)}`, colSpan: 3, styles: { fontStyle: "bold", fillColor: [220, 230, 240] } },
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [["RED", "CASA DE PAZ", "LÍDER", "REPORTADO", "ENTREGADO", "FECHA ENTREGA", "OBSERVACIÓN", "ESTADO"]],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [50, 80, 130], textColor: 255, fontSize: 7, halign: "center" },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
      7: { halign: "center" },
    },
    theme: "grid",
    margin: { left: margin, right: margin },
  });

  // Pie con firmas
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const colW = (pageWidth - 2 * margin) / 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ELABORADO POR:", margin, finalY);
  doc.text("REVISADO POR:", margin + colW, finalY);

  doc.setFont("helvetica", "normal");
  doc.line(margin, finalY + 12, margin + colW - 20, finalY + 12);
  doc.line(margin + colW, finalY + 12, margin + 2 * colW - 20, finalY + 12);

  doc.text(elaboradoPor || "—", margin, finalY + 17);
  doc.text(revisadoPor || configIglesia?.pastor_principal || "—", margin + colW, finalY + 17);

  doc.text("Firma y nombre", margin, finalY + 21);
  doc.text("Firma y nombre", margin + colW, finalY + 21);

  // Save
  const filename = `Ofrendas_CDP_${semanaInicio}_a_${semanaFin}.pdf`;
  doc.save(filename);
}

interface ExportFilaArgs {
  fila: FilaTesoreriaCDP;
  semanaInicio: string;
  semanaFin: string;
  configIglesia: any;
  elaboradoPor?: string;
  revisadoPor?: string;
}

/**
 * Exporta el cierre de consignación de UNA Casa de Paz, incluyendo el comprobante embebido
 * cuando es imagen. Si el soporte es PDF u otro, se imprime el enlace.
 */
export async function exportFilaSemanalPDF({
  fila,
  semanaInicio,
  semanaFin,
  configIglesia,
  elaboradoPor,
  revisadoPor,
}: ExportFilaArgs) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let cursorY = margin;

  // Logo
  if (configIglesia?.logo_url) {
    try {
      const img = await loadImage(configIglesia.logo_url);
      doc.addImage(img, "PNG", margin, cursorY, 22, 22);
    } catch {
      // ignore
    }
  }

  // Encabezado central
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    (configIglesia?.nombre_iglesia || "IGLESIA").toUpperCase(),
    pageWidth / 2,
    cursorY + 6,
    { align: "center" }
  );
  doc.setFontSize(10);
  doc.text("CIERRE DE CONSIGNACIÓN — CASA DE PAZ", pageWidth / 2, cursorY + 12, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Semana del ${format(parseISO(semanaInicio), "dd 'de' MMM yyyy", { locale: es })} al ${format(parseISO(semanaFin), "dd 'de' MMM yyyy", { locale: es })}`,
    pageWidth / 2,
    cursorY + 17,
    { align: "center" }
  );

  // Caja código
  const boxX = pageWidth - margin - 45;
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.rect(boxX, cursorY, 45, 22);
  doc.setFontSize(7);
  doc.text("CÓDIGO: RE-CO-OC01", boxX + 2, cursorY + 5);
  doc.text("VERSIÓN: 1", boxX + 2, cursorY + 10);
  doc.text(`FECHA: ${format(new Date(), "dd/MM/yyyy")}`, boxX + 2, cursorY + 15);
  doc.text("CIERRE INDIVIDUAL", boxX + 2, cursorY + 20);

  cursorY += 28;

  // Datos de la Casa de Paz
  autoTable(doc, {
    startY: cursorY,
    head: [["DATOS DE LA CASA DE PAZ", ""]],
    body: [
      ["Red", fila.red],
      ["Casa de Paz", fila.grupo_nombre],
      ["Líder", fila.lider_nombre || "—"],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [50, 80, 130], textColor: 255, fontSize: 9, halign: "left" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    theme: "grid",
    margin: { left: margin, right: margin },
  });

  // Datos del cierre
  cursorY = (doc as any).lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: cursorY,
    head: [["DATOS DEL CIERRE", ""]],
    body: [
      ["Recaudado en físico (entregado)", formatCurrency(fila.valor_entregado)],
      ["Valor consignado al banco", formatCurrency(fila.valor_consignado)],
      ["Diferencia", formatCurrency(fila.valor_entregado - fila.valor_consignado)],
      ["Fecha de consignación", fila.fecha_consignacion ? format(parseISO(fila.fecha_consignacion), "dd/MM/yyyy") : "—"],
      ["Fecha de entrega", fila.fecha_entrega ? format(parseISO(fila.fecha_entrega), "dd/MM/yyyy") : "—"],
      ["Estado", fila.estado],
      ["Observación", fila.observacion || "—"],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [50, 80, 130], textColor: 255, fontSize: 9, halign: "left" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    theme: "grid",
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // Soporte
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SOPORTE DE LA CONSIGNACIÓN", margin, cursorY);
  cursorY += 4;

  if (fila.soporte_consignacion_url) {
    const isImage = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(fila.soporte_consignacion_url);
    if (isImage) {
      try {
        const dataUrl = await loadImage(fila.soporte_consignacion_url);
        const maxW = pageWidth - 2 * margin;
        const maxH = 130;
        // Estimar proporción
        const props = (doc as any).getImageProperties
          ? (doc as any).getImageProperties(dataUrl)
          : { width: 800, height: 600 };
        const ratio = props.width / props.height;
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }
        const x = margin + (maxW - w) / 2;
        doc.addImage(dataUrl, "PNG", x, cursorY, w, h);
        cursorY += h + 4;
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("No se pudo cargar la imagen del soporte.", margin, cursorY + 4);
        cursorY += 8;
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Soporte (PDF / archivo):", margin, cursorY + 4);
      doc.setTextColor(0, 0, 200);
      doc.textWithLink(fila.soporte_consignacion_url, margin, cursorY + 9, {
        url: fila.soporte_consignacion_url,
      });
      doc.setTextColor(0, 0, 0);
      cursorY += 14;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Sin soporte adjunto.", margin, cursorY + 4);
    cursorY += 8;
  }

  // Firmas
  const finalY = Math.min(cursorY + 10, doc.internal.pageSize.getHeight() - 30);
  const colW = (pageWidth - 2 * margin) / 2;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("ELABORADO POR:", margin, finalY);
  doc.text("REVISADO POR:", margin + colW, finalY);
  doc.setFont("helvetica", "normal");
  doc.line(margin, finalY + 12, margin + colW - 20, finalY + 12);
  doc.line(margin + colW, finalY + 12, margin + 2 * colW - 20, finalY + 12);
  doc.text(elaboradoPor || "—", margin, finalY + 17);
  doc.text(revisadoPor || configIglesia?.pastor_principal || "—", margin + colW, finalY + 17);
  doc.text("Firma y nombre", margin, finalY + 21);
  doc.text("Firma y nombre", margin + colW, finalY + 21);

  const slug = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 30);
  const filename = `Consignacion_${slug(fila.red)}_${slug(fila.grupo_nombre)}_${semanaInicio}.pdf`;
  doc.save(filename);
}

function formatCurrency(n: number) {
  return `$${Number(n).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
