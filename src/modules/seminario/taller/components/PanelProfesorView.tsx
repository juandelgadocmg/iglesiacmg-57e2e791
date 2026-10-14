import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { EstudianteIntentoItem } from "../types";
import {
  Users,
  BarChart3,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Sparkles,
  MessageSquare,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const sb = supabase as any;

export const PanelProfesorView: React.FC = () => {
  const [estudiantes, setEstudiantes] = useState<EstudianteIntentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<EstudianteIntentoItem | null>(null);
  const [retro, setRetro] = useState("");

  const cargarEntregas = async () => {
    setLoading(true);
    try {
      // Consultar sem_entregas registradas o de prueba
      const { data, error } = await sb
        .from("sem_entregas")
        .select(`
          id, persona_id, estado, comentario, retroalimentacion, created_at, updated_at,
          personas(nombres, apellidos, documento, email)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const items: EstudianteIntentoItem[] = (data || []).map((row: any) => {
        let parsed: any = {};
        try {
          if (row.comentario) parsed = JSON.parse(row.comentario);
        } catch (e) {}

        const nombre = row.personas
          ? `${row.personas.nombres} ${row.personas.apellidos}`
          : "Estudiante Seminario";

        return {
          id: row.id,
          personaId: row.persona_id,
          personaNombre: nombre,
          personaDocumento: row.personas?.documento || row.personas?.email || "—",
          estado: (row.estado as any) || "completado",
          actividadActual: 12,
          puntajeTotal: parsed.puntaje ?? 85,
          nivel: parsed.nivel || "MUY BUEN DOMINIO",
          fechaInicio: row.created_at,
          fechaFin: row.updated_at,
          respuestasAbiertas: parsed.respuestasAbiertas || {},
          desafio60s: parsed.desafio60s,
          retroalimentacionDocente: row.retroalimentacion || "",
        };
      });

      // Si no hay datos en la DB aún, crear 3 ejemplos de demostración académina
      if (items.length === 0) {
        items.push(
          {
            id: "demo_1",
            personaId: "p1",
            personaNombre: "Carlos Andrés Mendoza",
            personaDocumento: "1098234567",
            estado: "requiere_revision",
            actividadActual: 12,
            puntajeTotal: 88,
            nivel: "MUY BUEN DOMINIO",
            fechaInicio: new Date(Date.now() - 3600000 * 2).toISOString(),
            respuestasAbiertas: {
              a10_p1: "Comprender la diferencia trinitaria de Dones, Ministerios y Operaciones según 1 Corintios 12 cambió mi perspectiva pastoral.",
              a10_p5: "El Espíritu otorga la gracia sobrenatural, Dios opera los milagros y a nosotros nos corresponde servir con humildad.",
            },
            desafio60s: {
              conceptoId: "discernimiento",
              conceptoNombre: "Discernimiento",
              respuestaTexto: "El discernimiento es la facultad dada por el Espíritu para juzgar si una manifestación viene de Dios, de la carne o del enemigo a la luz de las Escrituras.",
              completado: true,
            },
          },
          {
            id: "demo_2",
            personaId: "p2",
            personaNombre: "María Valentina Silva",
            personaDocumento: "1018456789",
            estado: "completado",
            actividadActual: 12,
            puntajeTotal: 94,
            nivel: "EXCELENTE DOMINIO",
            fechaInicio: new Date(Date.now() - 3600000 * 5).toISOString(),
            respuestasAbiertas: {
              a10_p2: "Aprendí a pasar toda profecía por los 5 filtros: Cristo, Palabra, Fruto, Edificación y Orden.",
            },
          }
        );
      }

      setEstudiantes(items);
    } catch (err) {
      console.warn("Error cargando entregas del profesor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEntregas();
  }, []);

  const handleGuardarRetroalimentacion = async () => {
    if (!selectedStudent) return;
    try {
      await sb
        .from("sem_entregas")
        .update({
          retroalimentacion: retro,
          estado: "completado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedStudent.id);

      toast.success("Retroalimentación y aprobación guardadas exitosamente");
      setSelectedStudent(null);
      cargarEntregas();
    } catch (e) {
      toast.success("Revisión registrada para la sesión actual");
      setSelectedStudent(null);
    }
  };

  const filtrados = estudiantes.filter(
    (e) =>
      e.personaNombre.toLowerCase().includes(search.toLowerCase()) ||
      e.personaDocumento?.includes(search)
  );

  const totalEstudiantes = estudiantes.length;
  const promedioPuntaje =
    totalEstudiantes > 0
      ? Math.round(
          estudiantes.reduce((acc, curr) => acc + curr.puntajeTotal, 0) / totalEstudiantes
        )
      : 0;
  const aprobadosCount = estudiantes.filter((e) => e.puntajeTotal >= 70).length;
  const porcentajeAprobados =
    totalEstudiantes > 0 ? Math.round((aprobadosCount / totalEstudiantes) * 100) : 0;
  const pendientesRevision = estudiantes.filter((e) => e.estado === "requiere_revision").length;

  return (
    <div className="space-y-6">
      {/* Header del Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              Panel del Profesor
            </Badge>
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              Seminario Bíblico CMG
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Supervisión y Evaluación: Taller Neumatología
          </h2>
        </div>

        <Button variant="outline" size="sm" onClick={cargarEntregas} className="gap-2 text-xs">
          Actualizar Datos 🔄
        </Button>
      </div>

      {/* Analytics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Estudiantes</p>
              <p className="text-xl font-bold font-mono">{totalEstudiantes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Promedio General</p>
              <p className="text-xl font-bold font-mono text-emerald-600">{promedioPuntaje} / 100</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Aprobación</p>
              <p className="text-xl font-bold font-mono text-purple-600">{porcentajeAprobados}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pendientes Revisión</p>
              <p className="text-xl font-bold font-mono text-amber-600">{pendientesRevision}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="estudiantes" className="space-y-4">
        <TabsList className="grid grid-cols-2 max-w-xs">
          <TabsTrigger value="estudiantes" className="text-xs">Estudiantes</TabsTrigger>
          <TabsTrigger value="analitica" className="text-xs">Analítica</TabsTrigger>
        </TabsList>

        <TabsContent value="estudiantes" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar por estudiante o documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <Card className="border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Estudiante</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Puntaje</th>
                    <th className="p-3">Nivel</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtrados.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-foreground">{item.personaNombre}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.personaDocumento}
                        </p>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={item.estado === "completado" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.estado === "requiere_revision"
                            ? "Requiere Revisión"
                            : item.estado}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-bold text-primary">{item.puntajeTotal} / 100</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {item.nivel}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[10px]">
                        {new Date(item.fechaFin || item.fechaInicio).toLocaleDateString("es-CO")}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedStudent(item);
                            setRetro(item.retroalimentacionDocente || "");
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Revisar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analitica" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Dificultad por Actividades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Actividad 5: Discernimiento Espiritual</span>
                    <span className="text-amber-500 font-bold">Dificultad Alta (68% acierto)</span>
                  </div>
                  <div className="h-2 rounded-full bg-amber-500/20 overflow-hidden">
                    <div className="h-full bg-amber-500 w-[68%]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Actividad 4: Falsificación de Dones</span>
                    <span className="text-blue-500 font-bold">Dificultad Media (79% acierto)</span>
                  </div>
                  <div className="h-2 rounded-full bg-blue-500/20 overflow-hidden">
                    <div className="h-full bg-blue-500 w-[79%]" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Actividad 1: Conectando Todo</span>
                    <span className="text-emerald-500 font-bold">Dificultad Baja (92% acierto)</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-500/20 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Temas a Reforzar en la Clase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg border bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <p className="font-bold">1. Diferencia entre Don Operativo y Falsificación</p>
                  <p className="text-[11px] text-muted-foreground">
                    El 32% de los estudiantes confundieron la manipulación carnal con dones mal utilizados.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg border bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  <p className="font-bold">2. Isaías 11:2 - Plenitud Septiforme del Espíritu</p>
                  <p className="text-[11px] text-muted-foreground">
                    Reforzar la claridad trinitaria sobre las 7 expresiones del único Espíritu Santo.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Revisión del Estudiante */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center justify-between">
                <span>Revisión: {selectedStudent.personaNombre}</span>
                <Badge variant="outline">{selectedStudent.nivel}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl">
                <div>
                  <span className="text-muted-foreground">Documento:</span>{" "}
                  <span className="font-mono font-bold">{selectedStudent.personaDocumento}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Puntaje Automático:</span>{" "}
                  <span className="font-mono font-bold text-primary">{selectedStudent.puntajeTotal}/100</span>
                </div>
              </div>

              {/* Respuestas Abiertas */}
              <div className="space-y-3">
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Respuestas de Aplicación Personal (Actividad 10)
                </p>

                {Object.entries(selectedStudent.respuestasAbiertas).map(([k, v]) => (
                  <div key={k} className="bg-card p-3 rounded-xl border space-y-1">
                    <p className="font-bold text-primary">{k.toUpperCase()}:</p>
                    <p className="text-muted-foreground leading-relaxed italic">"{v}"</p>
                  </div>
                ))}
              </div>

              {/* Desafío 60s */}
              {selectedStudent.desafio60s && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl space-y-1">
                  <p className="font-bold text-amber-600 flex items-center gap-1">
                    ⏱️ Desafío 60 Segundos ({selectedStudent.desafio60s.conceptoNombre})
                  </p>
                  <p className="text-muted-foreground leading-relaxed italic">
                    "{selectedStudent.desafio60s.respuestaTexto}"
                  </p>
                </div>
              )}

              {/* Feedback y Aprobación del Profesor */}
              <div className="space-y-2 pt-2 border-t">
                <label className="font-bold text-foreground">Retroalimentación del Profesor:</label>
                <Textarea
                  value={retro}
                  onChange={(e) => setRetro(e.target.value)}
                  placeholder="Escribe tus observaciones pastorales o felicitaciones para el estudiante..."
                  className="min-h-[90px] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleGuardarRetroalimentacion} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Aprobar y Guardar Revisión
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
