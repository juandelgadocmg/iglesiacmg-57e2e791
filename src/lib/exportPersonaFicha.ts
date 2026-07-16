import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { TimelineEvent } from "@/components/persona/PersonaActivityTimeline";

function safe(v: any) { return v === null || v === undefined || v === "" ? "—" : String(v); }
function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return format(parseISO(v), "dd MMM yyyy", { locale: es }); } catch { return v; }
}

export function exportPersonaFichaPDF(persona: any, timeline: TimelineEvent[]) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const nombre = `${persona.nombres ?? ""} ${persona.apellidos ?? ""}`.trim();

  // Cover header band
  doc.setFillColor(12, 35, 64); // #0c2340
  doc.rect(0, 0, w, 34, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.text("Ficha de Persona", 14, 15);
  doc.setFontSize(13);
  doc.text(nombre || "—", 14, 25);
  doc.setFontSize(9);
  doc.setTextColor(200);
  doc.text(`Generado: ${format(new Date(), "dd MMM yyyy · HH:mm", { locale: es })}`, w - 14, 15, { align: "right" });

  doc.setTextColor(30);

  autoTable(doc, {
    startY: 42,
    head: [["Datos generales", "Valor"]],
    body: [
      ["Documento", safe(persona.documento)],
      ["Tipo persona", safe(persona.tipo_persona)],
      ["Estado", safe(persona.estado_iglesia)],
      ["Fecha nacimiento", fmtDate(persona.fecha_nacimiento)],
      ["Sexo", safe(persona.sexo)],
      ["Estado civil", safe(persona.estado_civil)],
      ["Ocupación", safe(persona.ocupacion)],
      ["Nacionalidad", safe(persona.nacionalidad)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [26, 74, 110], textColor: 255 },
  });

  autoTable(doc, {
    head: [["Contacto", "Valor"]],
    body: [
      ["Teléfono", safe(persona.telefono)],
      ["WhatsApp", safe(persona.whatsapp)],
      ["Email", safe(persona.email)],
      ["Dirección", safe(persona.direccion)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [45, 138, 158], textColor: 255 },
  });

  autoTable(doc, {
    head: [["Ministerial", "Valor"]],
    body: [
      ["Grupo", safe(persona.grupos?.nombre)],
      ["Red", safe(persona.grupos?.red)],
      ["Ministerio", safe(persona.ministerio)],
      ["Vinculación", safe(persona.vinculacion)],
      ["Líder responsable", safe(persona.lider_responsable)],
      ["Invitado por", safe(persona.invitado_por)],
      ["Fecha ingreso", fmtDate(persona.fecha_ingreso)],
      ["Fecha conversión", fmtDate(persona.fecha_conversion)],
      ["Fecha bautismo", fmtDate(persona.fecha_bautismo)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [26, 74, 110], textColor: 255 },
  });

  if (persona.observaciones) {
    autoTable(doc, {
      head: [["Observaciones"]],
      body: [[persona.observaciones]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [90, 90, 90], textColor: 255 },
    });
  }

  if (timeline.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(12, 35, 64);
    doc.text(`Historial · ${nombre}`, 14, 18);
    doc.setTextColor(30);
    autoTable(doc, {
      startY: 24,
      head: [["Fecha", "Tipo", "Evento", "Detalle"]],
      body: timeline.map((e) => [
        fmtDate(e.date),
        e.type,
        e.title,
        [e.description, e.meta].filter(Boolean).join(" · "),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [26, 74, 110], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 3: { cellWidth: 80 } },
    });
  }

  const slug = (nombre || "persona").toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  doc.save(`ficha-${slug}.pdf`);
}

export function exportPersonaHistorialCSV(persona: any, timeline: TimelineEvent[]) {
  const nombre = `${persona.nombres ?? ""} ${persona.apellidos ?? ""}`.trim();
  const rows = [
    ["Fecha", "Tipo", "Evento", "Descripción", "Meta"],
    ...timeline.map((e) => [
      e.date,
      e.type,
      e.title,
      (e.description || "").replace(/\n/g, " "),
      e.meta || "",
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = (nombre || "persona").toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  link.href = url;
  link.download = `historial-${slug}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
