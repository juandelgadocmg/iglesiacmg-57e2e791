import { useState } from "react";
import {
  FileText, Download, Filter, FileSpreadsheet, FileIcon, CheckCircle2,
  Calendar, Users, AlertTriangle, BookOpen, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNinos } from "../hooks/useNinos";
import {
  useInfantilGrupos,
  useInfantilClases,
  useInfantilAcudientes,
  useProgramacionReunionesInfantil,
  isExcluidoDeInfantil,
} from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ReportesInfantilView() {
  const { ninos = [], isLoading: isLoadingNinos } = useNinos();
  const { data: grupos = [] } = useInfantilGrupos();
  const { data: clases = [] } = useInfantilClases();
  const { data: serviciosReuniones = [] } = useProgramacionReunionesInfantil();
  const { data: acudientes = [] } = useInfantilAcudientes();
  const { data: personas = [] } = usePersonas();

  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>("todos");

  // Función general para generar y descargar los reportes
  const handleExport = async (reportId: string, formatType: "pdf" | "excel") => {
    const reportKey = `${reportId}_${formatType}`;
    setLoadingReport(reportKey);

    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      if (reportId === "asistencia_mensual") {
        // Consultar asistencias en la tabla real infantil_asistencia_checkin
        let query = supabase
          .from("infantil_asistencia_checkin")
          .select("*")
          .order("fecha", { ascending: false });

        if (selectedGrupoId !== "todos") {
          query = query.eq("grupo_id", selectedGrupoId);
        }

        const { data: asistencias, error } = await query;
        if (error) throw error;

        const tableData = (asistencias || [])
          .map((a: any) => {
            const ninoObj = personas.find((p) => p.id === a.nino_id) || ninos.find((n) => n.id === a.nino_id);
            const grupoObj = grupos.find((g) => g.id === a.grupo_id);
            const entregadoObj = a.entregado_por_id ? personas.find((p) => p.id === a.entregado_por_id) : null;
            const recogidoObj = a.recogido_por_id ? personas.find((p) => p.id === a.recogido_por_id) : null;

            return {
              fecha: a.fecha || "-",
              nino: ninoObj ? `${ninoObj.nombres} ${ninoObj.apellidos}`.trim() : "No especificado",
              documento: ninoObj?.documento || "N/A",
              grupo: grupoObj?.nombre || "Infantil",
              estado: a.estado || "Presente",
              hora_entrada: a.hora_entrada ? format(new Date(a.hora_entrada), "HH:mm") : "-",
              hora_salida: a.hora_salida ? format(new Date(a.hora_salida), "HH:mm") : "En clase",
              entregado_por: entregadoObj ? `${entregadoObj.nombres} ${entregadoObj.apellidos}`.trim() : "-",
              recibido_por: recogidoObj ? `${recogidoObj.nombres} ${recogidoObj.apellidos}`.trim() : "-",
              observaciones: a.observaciones || "-"
            };
          })
          .filter((row) => !isExcluidoDeInfantil(row.grupo) && !isExcluidoDeInfantil(row.observaciones));

        const columns = [
          { header: "Fecha", key: "fecha" },
          { header: "Niño / Niña", key: "nino" },
          { header: "Documento", key: "documento" },
          { header: "Grupo", key: "grupo" },
          { header: "Estado", key: "estado" },
          { header: "Entrada", key: "hora_entrada" },
          { header: "Salida", key: "hora_salida" },
          { header: "Entregado Por", key: "entregado_por" },
          { header: "Recogido Por", key: "recibido_por" }
        ];

        const filename = `Reporte_Asistencia_Infantil_${todayStr}`;
        if (formatType === "pdf") {
          exportToPDF({
            title: "Reporte de Asistencia - Iglesia Infantil",
            columns,
            data: tableData,
            filename
          });
        } else {
          exportToExcel({
            title: "Asistencia Infantil",
            columns,
            data: tableData,
            filename
          });
        }
        toast.success(`Reporte de Asistencia descargado (${formatType.toUpperCase()})`);

      } else if (reportId === "directorio_padres") {
        // Directorio de acudientes
        let ninosPool = ninos;
        if (selectedGrupoId !== "todos") {
          ninosPool = ninos.filter(n => n.grupo_id === selectedGrupoId);
        }

        const tableData = ninosPool
          .map((n) => {
            const rels = acudientes.filter(a => a.nino_id === n.id);
            const principalRel = rels.find(a => a.es_principal) || rels[0];
            const acudientePersona = principalRel ? personas.find(p => p.id === principalRel.acudiente_id) : null;
            const grupoNombre = grupos.find(g => g.id === n.grupo_id)?.nombre || "Infantil";

            return {
              nino: `${n.nombres} ${n.apellidos}`.trim(),
              documento: n.documento || "N/A",
              fecha_nacimiento: n.fecha_nacimiento || "N/A",
              grupo: grupoNombre,
              acudiente: acudientePersona ? `${acudientePersona.nombres} ${acudientePersona.apellidos}` : "No registrado",
              parentesco: principalRel?.relacion || "Acudiente",
              telefono: acudientePersona?.telefono || n.detalles?.contacto_emergencia || "N/A",
              direccion: n.direccion || acudientePersona?.direccion || "N/A"
            };
          })
          .filter((row) => !isExcluidoDeInfantil(row.grupo));

        const columns = [
          { header: "Niño / Niña", key: "nino" },
          { header: "Documento", key: "documento" },
          { header: "Nacimiento", key: "fecha_nacimiento" },
          { header: "Grupo", key: "grupo" },
          { header: "Acudiente Principal", key: "acudiente" },
          { header: "Parentesco", key: "parentesco" },
          { header: "Teléfono Acudiente", key: "telefono" },
          { header: "Dirección", key: "direccion" }
        ];

        const filename = `Directorio_Acudientes_Infantil_${todayStr}`;
        if (formatType === "pdf") {
          exportToPDF({
            title: "Directorio de Acudientes - Iglesia Infantil",
            columns,
            data: tableData,
            filename
          });
        } else {
          exportToExcel({
            title: "Directorio Acudientes",
            columns,
            data: tableData,
            filename
          });
        }
        toast.success(`Directorio de Acudientes descargado (${formatType.toUpperCase()})`);

      } else if (reportId === "alergias_medicas") {
        // Reporte médico y alergias
        let ninosPool = ninos;
        if (selectedGrupoId !== "todos") {
          ninosPool = ninos.filter(n => n.grupo_id === selectedGrupoId);
        }

        const tableData = ninosPool
          .map((n) => {
            const grupoNombre = grupos.find(g => g.id === n.grupo_id)?.nombre || "Infantil";
            return {
              nino: `${n.nombres} ${n.apellidos}`.trim(),
              documento: n.documento || "N/A",
              grupo: grupoNombre,
              alergias: n.detalles?.alergias || "Ninguna reportada",
              info_medica: n.detalles?.info_medica || "Sin condiciones reportadas",
              contacto_emergencia: n.detalles?.contacto_emergencia || "N/A"
            };
          })
          .filter((row) => !isExcluidoDeInfantil(row.grupo));

        const columns = [
          { header: "Niño / Niña", key: "nino" },
          { header: "Documento", key: "documento" },
          { header: "Grupo", key: "grupo" },
          { header: "Alergias Conocidas", key: "alergias" },
          { header: "Información Médica / Cuidados", key: "info_medica" },
          { header: "Contacto de Emergencia", key: "contacto_emergencia" }
        ];

        const filename = `Reporte_Medico_Alergias_Infantil_${todayStr}`;
        if (formatType === "pdf") {
          exportToPDF({
            title: "Reporte Médico y Alergias - Iglesia Infantil",
            columns,
            data: tableData,
            filename
          });
        } else {
          exportToExcel({
            title: "Alergias y Medicina",
            columns,
            data: tableData,
            filename
          });
        }
        toast.success(`Reporte Médico descargado (${formatType.toUpperCase()})`);

      } else if (reportId === "curriculo_clases") {
        // Cumplimiento de currículo y clases (únicamente del Ministerio Infantil, sin Kings Army)
        let clasesPool = clases.filter(
          (c: any) =>
            !isExcluidoDeInfantil(c.grupo?.nombre) &&
            !isExcluidoDeInfantil(c.tema) &&
            !isExcluidoDeInfantil(c.objetivo)
        );
        if (selectedGrupoId !== "todos") {
          clasesPool = clasesPool.filter(c => c.grupo_id === selectedGrupoId);
        }

        const fechasYaIncluidas = new Set(clasesPool.map((c: any) => c.fecha));
        const desdeClases = clasesPool.map((c: any) => {
          const aux = c.maestro_auxiliar || personas.find(p => p.id === c.maestro_auxiliar_id);
          return {
            fecha: c.fecha || "-",
            grupo: c.grupo?.nombre && !isExcluidoDeInfantil(c.grupo.nombre) ? c.grupo.nombre : "Infantil",
            tema: c.tema || "-",
            maestro_principal: c.maestro ? `${c.maestro.nombres} ${c.maestro.apellidos}` : "Sin asignar",
            maestro_auxiliar: aux ? `${aux.nombres} ${aux.apellidos}` : "Sin auxiliar",
            versiculo: c.versiculo || "-",
            estado: c.estado || "Programada"
          };
        });

        const desdeReuniones = serviciosReuniones
          .filter(
            (s) =>
              s.tiene_programacion_infantil &&
              !fechasYaIncluidas.has(s.fecha) &&
              !isExcluidoDeInfantil(s.ministerio_nombre) &&
              !isExcluidoDeInfantil(s.grupo_texto) &&
              !isExcluidoDeInfantil(s.tema)
          )
          .map(s => ({
            fecha: s.fecha || "-",
            grupo: s.grupo_texto && !isExcluidoDeInfantil(s.grupo_texto) ? s.grupo_texto : "Infantil",
            tema: s.tema || s.evento_titulo || "-",
            maestro_principal: s.maestro ? `${s.maestro.nombres} ${s.maestro.apellidos}` : "Sin asignar",
            maestro_auxiliar: s.maestro_auxiliar ? `${s.maestro_auxiliar.nombres} ${s.maestro_auxiliar.apellidos}` : "Sin auxiliar",
            versiculo: s.versiculo || "-",
            estado: "Programada (Infantil)"
          }));

        const tableData = [...desdeClases, ...desdeReuniones];

        const columns = [
          { header: "Fecha", key: "fecha" },
          { header: "Grupo", key: "grupo" },
          { header: "Tema de la Lección", key: "tema" },
          { header: "Maestro Principal", key: "maestro_principal" },
          { header: "Maestro Auxiliar", key: "maestro_auxiliar" },
          { header: "Versículo Bíblico", key: "versiculo" },
          { header: "Estado", key: "estado" }
        ];

        const filename = `Cumplimiento_Curriculo_Infantil_${todayStr}`;
        if (formatType === "pdf") {
          exportToPDF({
            title: "Cumplimiento de Currículo - Iglesia Infantil",
            columns,
            data: tableData,
            filename
          });
        } else {
          exportToExcel({
            title: "Currículo Infantil",
            columns,
            data: tableData,
            filename
          });
        }
        toast.success(`Reporte de Currículo descargado (${formatType.toUpperCase()})`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al exportar el reporte: " + (err.message || "Error desconocido"));
    } finally {
      setLoadingReport(null);
    }
  };

  const reportes = [
    {
      id: "asistencia_mensual",
      titulo: "Asistencia Mensual Detallada",
      descripcion: "Reporte consolidado de asistencia por niño en cada grupo durante el último mes con horarios de entrada y salida.",
      icon: <FileSpreadsheet className="w-6 h-6 text-emerald-600" />,
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    },
    {
      id: "directorio_padres",
      titulo: "Directorio de Acudientes",
      descripcion: "Lista completa de niños activos con la información de contacto de sus acudientes autorizados y teléfonos.",
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    {
      id: "alergias_medicas",
      titulo: "Reporte Médico y Alergias",
      descripcion: "Documento crítico con las alertas médicas, alergias y contactos de emergencia por salón de clase.",
      icon: <AlertTriangle className="w-6 h-6 text-coral" />,
      bg: "bg-coral/10",
      border: "border-coral/20"
    },
    {
      id: "curriculo_clases",
      titulo: "Cumplimiento de Currículo",
      descripcion: "Avance de las clases planificadas vs realizadas por cada maestro titular, auxiliar y grupo de edad.",
      icon: <BookOpen className="w-6 h-6 text-purple-600" />,
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
          <p className="text-slate-500 mt-1 font-medium">Genera informes oficiales en formato PDF y Excel con datos en tiempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGrupoId !== "todos" && (
            <Badge variant="outline" className="bg-blue-50 text-navy border-blue-200 text-xs py-1 px-3">
              Filtro: {grupos.find(g => g.id === selectedGrupoId)?.nombre}
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => setFilterModalOpen(true)}
            className="rounded-xl border-slate-200 text-slate-700 bg-white shadow-sm h-11 px-5 font-semibold"
          >
            <Filter className="w-4 h-4 mr-2 text-navy" /> Filtros Globales
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportes.map((rep) => {
          const isPdfLoading = loadingReport === `${rep.id}_pdf`;
          const isExcelLoading = loadingReport === `${rep.id}_excel`;

          return (
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
                        disabled={isPdfLoading || isExcelLoading}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                        onClick={() => handleExport(rep.id, "pdf")}
                      >
                        {isPdfLoading ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={isPdfLoading || isExcelLoading}
                        className="border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold"
                        onClick={() => handleExport(rep.id, "excel")}
                      >
                        {isExcelLoading ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DIÁLOGO DE FILTROS GLOBALES */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-navy flex items-center gap-2">
              <Filter className="w-5 h-5 text-coral" /> Filtros para Reportes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Aplica un filtro por salón o grupo para los reportes a exportar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Filtrar por Grupo Infantil</Label>
              <Select value={selectedGrupoId} onValueChange={setSelectedGrupoId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Todos los grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los grupos infantiles</SelectItem>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre} ({g.edades || "Edades varias"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedGrupoId("todos");
                setFilterModalOpen(false);
              }}
              className="rounded-xl"
            >
              Restablecer
            </Button>
            <Button
              onClick={() => setFilterModalOpen(false)}
              className="bg-navy hover:bg-navy/90 text-white rounded-xl font-bold"
            >
              Aplicar Filtro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
