import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useInfantilClases, useInfantilGrupos } from "@/hooks/useInfantil";
import { usePersonas } from "@/hooks/useDatabase";
import { useNinos, matchInfantilGrupoByAge, getSavedInfantilGrupoMap, saveInfantilGrupoForNino } from "../hooks/useNinos";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AsistenciaInfantilView() {
  const queryClient = useQueryClient();
  const { data: grupos } = useInfantilGrupos();
  const { data: clases } = useInfantilClases();
  const { data: personas } = usePersonas();
  const { ninos } = useNinos();
  
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>("all");
  const [selectedClaseId, setSelectedClaseId] = useState<string>("all");

  const { data: rawAsistencias, isLoading: isLoadingAsistencia } = useQuery({
    queryKey: ["infantil_asistencias_lista", selectedClaseId],
    queryFn: async () => {
      let q = supabase.from("infantil_asistencia_checkin").select("*").order("fecha", { ascending: false });
      if (selectedClaseId && selectedClaseId !== "all") {
        q = q.eq("clase_id", selectedClaseId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
  });

  // Resolver el niño y su grupo infantil real (incluso si fue vinculado desde membresía con grupo_id de Casa de Paz)
  const resolveNinoAndGrupo = (asis: any) => {
    const nino =
      ninos?.find(n => n.id === asis.nino_id) ||
      personas?.find(p => p.id === asis.nino_id) ||
      null;

    const savedMap = getSavedInfantilGrupoMap();
    const savedGrupoId = savedMap[asis.nino_id];

    const grupo =
      grupos?.find(g => g.id === asis.grupo_id) ||
      (savedGrupoId ? grupos?.find(g => g.id === savedGrupoId) : undefined) ||
      grupos?.find(g => g.id === nino?.grupo_id) ||
      matchInfantilGrupoByAge(nino?.fecha_nacimiento, grupos) ||
      null;

    return { nino, grupo };
  };

  // Auto-reparar en base de datos cualquier asistencia cuyo grupo_id no sea un grupo infantil válido
  useEffect(() => {
    if (!rawAsistencias || !grupos || grupos.length === 0) return;
    const infantilIds = new Set(grupos.map(g => g.id));
    const toFix = rawAsistencias.filter(a => !a.grupo_id || !infantilIds.has(a.grupo_id));
    if (toFix.length === 0) return;

    Promise.allSettled(
      toFix.map(async (asis) => {
        const { grupo } = resolveNinoAndGrupo(asis);
        if (!grupo?.id) return;
        saveInfantilGrupoForNino(asis.nino_id, grupo.id);
        await supabase
          .from("infantil_asistencia_checkin")
          .update({ grupo_id: grupo.id })
          .eq("id", asis.id);
        await supabase
          .from("personas")
          .update({ grupo_id: grupo.id })
          .eq("id", asis.nino_id);
      })
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_ninos"] });
    });
  }, [rawAsistencias, grupos]);

  const asistencias = useMemo(() => {
    if (!rawAsistencias) return [];
    if (!selectedGrupoId || selectedGrupoId === "all") return rawAsistencias;
    return rawAsistencias.filter(asis => {
      const { grupo } = resolveNinoAndGrupo(asis);
      return (grupo?.id || asis.grupo_id) === selectedGrupoId;
    });
  }, [rawAsistencias, selectedGrupoId, grupos, ninos, personas]);

  const handleChangeAsistenciaGrupo = async (asis: any, nuevoGrupoId: string) => {
    try {
      saveInfantilGrupoForNino(asis.nino_id, nuevoGrupoId);
      await supabase
        .from("infantil_asistencia_checkin")
        .update({ grupo_id: nuevoGrupoId })
        .eq("id", asis.id);
      await supabase
        .from("personas")
        .update({ grupo_id: nuevoGrupoId })
        .eq("id", asis.nino_id);
      toast.success("Grupo actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencias_lista"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_asistencia"] });
      queryClient.invalidateQueries({ queryKey: ["infantil_ninos"] });
    } catch (e: any) {
      toast.error("No se pudo actualizar el grupo");
    }
  };

  const filteredClases = clases?.filter(c => selectedGrupoId === "all" || c.grupo_id === selectedGrupoId) || [];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in bg-slate-50/50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-navy to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
            Control de Asistencia
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Historial detallado de asistencia y check-ins de los niños.</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden">
        <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Filtrar por Grupo</label>
            <Select value={selectedGrupoId} onValueChange={setSelectedGrupoId}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl h-11">
                <SelectValue placeholder="Todos los grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {grupos?.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Filtrar por Clase/Fecha</label>
            <Select value={selectedClaseId} onValueChange={setSelectedClaseId}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl h-11">
                <SelectValue placeholder="Todas las clases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                {filteredClases.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.tema || "Clase"} - {c.fecha}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Niño / Niña</th>
                  <th className="px-6 py-4">Grupo</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Entrada/Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingAsistencia ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Cargando registros...</td>
                  </tr>
                ) : asistencias?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      No hay registros de asistencia para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  asistencias?.map((asis) => {
                    const { nino, grupo } = resolveNinoAndGrupo(asis);
                    
                    return (
                      <tr key={asis.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-navy">
                          {nino ? `${nino.nombres} ${nino.apellidos}` : "Desconocido"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {grupos && grupos.length > 0 ? (
                            <Select
                              value={grupo?.id || ""}
                              onValueChange={(val) => handleChangeAsistenciaGrupo(asis, val)}
                            >
                              <SelectTrigger className="h-8 w-[200px] text-xs font-semibold rounded-lg bg-slate-50 border-slate-200 text-slate-700">
                                <SelectValue placeholder={grupo?.nombre || "Seleccionar grupo"} />
                              </SelectTrigger>
                              <SelectContent>
                                {grupos.map(g => (
                                  <SelectItem key={g.id} value={g.id} className="text-xs">
                                    {g.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            grupo?.nombre || "Sin grupo"
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {asis.fecha}
                        </td>
                        <td className="px-6 py-4">
                          {asis.estado === 'Presente' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0"><CheckCircle2 className="w-3 h-3 mr-1"/> Presente</Badge>}
                          {asis.estado === 'Ausente' && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0"><XCircle className="w-3 h-3 mr-1"/> Ausente</Badge>}
                          {asis.estado === 'Tarde' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0"><Clock className="w-3 h-3 mr-1"/> Tarde</Badge>}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {asis.hora_entrada && <div className="text-emerald-600 font-medium">In: {new Date(asis.hora_entrada).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                          {asis.hora_salida && <div className="text-slate-500">Out: {new Date(asis.hora_salida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                          {!asis.hora_entrada && !asis.hora_salida && "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
