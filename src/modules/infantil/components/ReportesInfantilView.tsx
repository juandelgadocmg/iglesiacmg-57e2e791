import { FileText, Download, Filter, FileSpreadsheet, FileIcon, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ReportesInfantilView() {
  const handleDownload = (tipo: string) => {
    toast.success(`Generando reporte de ${tipo}...`);
    setTimeout(() => {
      toast.info(`Descarga de ${tipo}.pdf completada`);
    }, 2000);
  };

  const reportes = [
    {
      id: "asistencia_mensual",
      titulo: "Asistencia Mensual Detallada",
      descripcion: "Reporte consolidado de asistencia por niño en cada grupo durante el último mes.",
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-500" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    },
    {
      id: "directorio_padres",
      titulo: "Directorio de Acudientes",
      descripcion: "Lista completa de niños activos con la información de contacto de sus acudientes autorizados.",
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    {
      id: "alergias_medicas",
      titulo: "Reporte Médico y Alergias",
      descripcion: "Documento crítico con las alertas médicas, alergias y contactos de emergencia por salón.",
      icon: <FileIcon className="w-6 h-6 text-red-500" />,
      bg: "bg-red-50",
      border: "border-red-100"
    },
    {
      id: "curriculo_clases",
      titulo: "Cumplimiento de Currículo",
      descripcion: "Avance de las clases planificadas vs realizadas por cada maestro y grupo.",
      icon: <FileText className="w-6 h-6 text-purple-500" />,
      bg: "bg-purple-50",
      border: "border-purple-100"
    }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Exportación y Reportes
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Genera informes oficiales en formato PDF y Excel.</p>
        </div>
        <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 bg-white shadow-sm h-11 px-6">
          <Filter className="w-4 h-4 mr-2" /> Filtros Globales
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportes.map((rep) => (
          <Card key={rep.id} className="border-0 shadow-lg shadow-slate-200/50 bg-white rounded-3xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${rep.bg} border ${rep.border} shrink-0`}>
                  {rep.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-navy mb-1">{rep.titulo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    {rep.descripcion}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                      onClick={() => handleDownload(rep.titulo + " (PDF)")}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                      onClick={() => handleDownload(rep.titulo + " (Excel)")}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
