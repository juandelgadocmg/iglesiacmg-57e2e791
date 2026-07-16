import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF, exportToExcel, exportToCSV } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportDropdownProps {
  title: string;
  filename: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  /** Applied filter snapshot for audit log. Non-blocking. */
  filters?: Record<string, any>;
}

async function logExportAttempt(payload: {
  format: "pdf" | "excel" | "csv";
  filename: string;
  title: string;
  row_count: number;
  filters: Record<string, any>;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    await supabase.from("export_audit_log").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      format: payload.format,
      filename: payload.filename,
      title: payload.title,
      row_count: payload.row_count,
      filters: payload.filters ?? {},
    });
  } catch (err) {
    // audit is best-effort — never block the export
    console.warn("[ExportDropdown] audit log failed:", err);
  }
}

export default function ExportDropdown({
  title, filename, columns, data, filters,
}: ExportDropdownProps) {
  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    const label = format === "pdf" ? "PDF" : format === "excel" ? "Excel" : "CSV";
    const ext = format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv";

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
      if (format === "pdf") await exportToPDF({ title, columns, data, filename });
      else if (format === "excel") await exportToExcel({ title, columns, data, filename });
      else await exportToCSV({ title, columns, data, filename });

      // Fire-and-forget audit log
      void logExportAttempt({
        format,
        filename: `${filename}.${ext}`,
        title,
        row_count: data.length,
        filters: filters ?? {},
      });

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
        <DropdownMenuItem onClick={() => handleExport("pdf")}>Exportar a PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>Exportar a Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>Exportar a CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
