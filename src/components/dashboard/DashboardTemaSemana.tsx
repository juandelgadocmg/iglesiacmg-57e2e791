import { BookOpen, ExternalLink, Pencil, Download, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  titulo?: string | null;
  descripcion?: string | null;
  url?: string | null;
  pdfUrl?: string | null;
  fechaFin?: string | null;
}

export default function DashboardTemaSemana({ titulo, descripcion, url, pdfUrl, fechaFin }: Props) {
  const navigate = useNavigate();

  const isEmpty = !titulo && !descripcion;
  const vigenteHasta = fechaFin ? (() => { try { return format(parseISO(fechaFin), "d MMM", { locale: es }); } catch { return null; } })() : null;

  const handleDownloadPDF = async () => {
    // Si hay un PDF cargado, descargarlo directamente
    if (pdfUrl) {
      try {
        const res = await fetch(pdfUrl);
        const blob = await res.blob();
        const link = document.createElement("a");
        const objUrl = URL.createObjectURL(blob);
        link.href = objUrl;
        link.download = `tema-de-la-semana-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objUrl);
        return;
      } catch {
        // Fallback: abrir en pestaña nueva
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    // Fallback: generar PDF simple con los campos configurados
    const doc = new jsPDF();
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 60, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("Tema de la Semana", 105, 30, { align: "center" });

    doc.setFontSize(12);
    doc.text("Centro Mundial de Gloria", 105, 45, { align: "center" });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(18);
    doc.text(titulo || "Sin título", 105, 80, { align: "center" });

    if (descripcion) {
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(descripcion, 170);
      doc.text(lines, 105, 95, { align: "center" });
    }

    if (url) {
      doc.setFontSize(10);
      doc.setTextColor(13, 148, 136);
      doc.textWithLink("Ver recurso en línea", 105, 130, { align: "center", url });
    }

    doc.save("tema-de-la-semana.pdf");
  };

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm bg-teal-600 text-white">
      <div className="px-6 py-6 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
          <BookOpen className="h-7 w-7" />
        </div>
        <h3 className="font-bold text-lg">Tema de la semana</h3>
        <p className="text-sm mt-2 uppercase tracking-wide font-semibold opacity-95">
          {isEmpty ? "Sin tema configurado" : (descripcion || titulo)}
        </p>
        {vigenteHasta && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10.5px] font-medium">
            <CalendarClock className="h-3 w-3" /> Vigente hasta {vigenteHasta}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {(!isEmpty || pdfUrl) && (
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Descargar PDF
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir link
            </a>
          )}
          <button
            onClick={() => navigate("/configuracion")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}
