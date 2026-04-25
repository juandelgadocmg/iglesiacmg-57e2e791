import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportDropdownProps {
  title: string;
  filename: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
}

export default function ExportDropdown({ title, filename, columns, data }: ExportDropdownProps) {
  const handleExport = async (format: "pdf" | "excel") => {
    const label = format === "pdf" ? "PDF" : "Excel";
    const ext = format === "pdf" ? "pdf" : "xlsx";

    if (!data || data.length === 0) {
      toast.warning(`No hay datos para exportar a ${label}`, {
        description: "Ajusta los filtros para incluir al menos un registro.",
      });
      return;
    }

    const loadingId = toast.loading(`Generando ${label}…`, {
      description: `${data.length} registro(s) — preparando ${filename}.${ext}`,
    });

    try {
      if (format === "pdf") {
        await exportToPDF({ title, columns, data, filename });
      } else {
        await exportToExcel({ title, columns, data, filename });
      }
      toast.success(`${label} generado correctamente`, {
        id: loadingId,
        description: `Archivo: ${filename}.${ext}`,
      });
    } catch (err: any) {
      console.error(`[ExportDropdown] Error exportando a ${label}:`, err);
      const message =
        err?.message ||
        (typeof err === "string" ? err : `Error desconocido al generar el ${label}`);
      toast.error(`No se pudo descargar el ${label}`, {
        id: loadingId,
        description: message,
        duration: 8000,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          Exportar a PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          Exportar a Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
