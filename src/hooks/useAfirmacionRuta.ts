import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HitoAfirmacionDef {
  index: number; // 1 to 16
  key: string;
  nombre: string;
  tipo: "llamada" | "mensaje" | "visita" | "consejeria" | "evento" | "curso";
  offsetDias: number; // Intervalo sugerido desde la fecha de ingreso
}

export const HITOS_AFIRMACION_16: HitoAfirmacionDef[] = [
  { index: 1, key: "llamada_1", nombre: "Llamada de Consolidación 1", tipo: "llamada", offsetDias: 1 },
  { index: 2, key: "mensaje_1", nombre: "Mensaje 1", tipo: "mensaje", offsetDias: 2 },
  { index: 3, key: "llamada_2", nombre: "Llamada de Consolidación 2", tipo: "llamada", offsetDias: 4 },
  { index: 4, key: "mensaje_2", nombre: "Mensaje 2", tipo: "mensaje", offsetDias: 5 },
  { index: 5, key: "llamada_3", nombre: "Llamada de Consolidación 3", tipo: "llamada", offsetDias: 7 },
  { index: 6, key: "mensaje_3", nombre: "Mensaje 3", tipo: "mensaje", offsetDias: 9 },
  { index: 7, key: "mensaje_4", nombre: "Mensaje 4", tipo: "mensaje", offsetDias: 12 },
  { index: 8, key: "mensaje_5", nombre: "Mensaje 5", tipo: "mensaje", offsetDias: 15 },
  { index: 9, key: "mensaje_6", nombre: "Mensaje 6", tipo: "mensaje", offsetDias: 18 },
  { index: 10, key: "visita", nombre: "Visita", tipo: "visita", offsetDias: 21 },
  { index: 11, key: "consejeria", nombre: "Consejería", tipo: "consejeria", offsetDias: 25 },
  { index: 12, key: "fiesta_bienvenida", nombre: "Fiesta de Bienvenida", tipo: "evento", offsetDias: 28 },
  { index: 13, key: "naci_triunfar_1", nombre: "Nací para Triunfar Día 1", tipo: "curso", offsetDias: 32 },
  { index: 14, key: "semana_poder_1", nombre: "Semana de Poder 1", tipo: "curso", offsetDias: 35 },
  { index: 15, key: "semana_poder_2", nombre: "Semana de Poder 2", tipo: "curso", offsetDias: 40 },
  { index: 16, key: "semana_poder_3", nombre: "Semana de Poder 3", tipo: "curso", offsetDias: 45 },
];

export const RESULTADOS_LLAMADA_OPCIONES = [
  "Contestó y atendió",
  "No contestó",
  "Buzón de mensajes",
  "Volver a llamar",
  "Persona indispuesta",
  "Otra ciudad",
  "Otra iglesia",
  "Número equivocado",
  "No tiene celular",
  "Se contacta a quien invitó",
  "Fuera de servicio",
  "Llamada no efectiva",
  "Otro",
] as const;

export interface PersonaHitoEstado {
  hitoDef: HitoAfirmacionDef;
  procesoId?: string;
  estado: "Pendiente" | "En curso" | "Finalizado";
  fechaProgramada: string; // ISO date
  fechaRealizada?: string | null;
  responsableNombre?: string | null;
  observacion?: string | null;
  resultadoLlamada?: string | null;
  realizada?: boolean;
  atrasado?: boolean;
}

export interface PersonaAfirmacionRuta {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono: string | null;
  whatsapp: string | null;
  fotoUrl?: string | null;
  fechaIngreso: string; // ISO date
  diasDesdeIngreso: number;
  consolidadorNombre: string;
  redNombre: string;
  hitos: PersonaHitoEstado[];
  hitosCompletados: number;
  totalHitos: 16;
  porcentajeCompletado: number; // 0 to 100
  hitoActualNum: number; // 1 to 16
  hitoActualNombre: string;
  proximoHitoNombre: string;
  estadoGeneral: "Pendiente" | "En curso" | "Finalizado";
  tieneAtrasos: boolean;
}

const norm = (s: any) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function useAfirmacionRuta() {
  const queryClient = useQueryClient();

  const { data: procesosDB = [] } = useQuery({
    queryKey: ["procesos_crecimiento_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procesos_crecimiento")
        .select("id, nombre, orden")
        .order("orden", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: llamadasAudit = [] } = useQuery({
    queryKey: ["registro_llamadas_audit"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("security_audit_log")
          .select("id, created_at, actor_email, changed")
          .eq("table_name", "registro_llamadas_consolidacion")
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data.map((item: any) => ({
            id: item.id,
            persona_id: item.changed?.persona_id,
            codificacion: item.changed?.codificacion || "Contestó y atendió",
            observacion: item.changed?.observacion || null,
            fecha_llamada: item.changed?.fecha_llamada || item.created_at,
            consolidador_nombre: item.changed?.consolidador_nombre,
          }));
        }
      } catch (e) {
        console.warn("Llamadas audit fetch warning:", e);
      }
      return [];
    },
  });

  const { data: personasRuta = [], isLoading, refetch } = useQuery({
    queryKey: ["afirmacion_personas_ruta", procesosDB, llamadasAudit],
    queryFn: async () => {
      let personasData: any[] = [];
      try {
        const { data, error } = await supabase
          .from("personas")
          .select(
            "*, grupos(id, nombre, red), persona_procesos(id, proceso_id, estado, fecha_completado, observacion, responsable_id, created_at)"
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Retrying simple query in useAfirmacionRuta:", error);
          const { data: simpleData } = await supabase
            .from("personas")
            .select("*, persona_procesos(id, proceso_id, estado, fecha_completado, observacion, responsable_id, created_at)")
            .order("created_at", { ascending: false });
          personasData = simpleData || [];
        } else {
          personasData = data || [];
        }
      } catch (e) {
        console.error("useAfirmacionRuta exception:", e);
        const { data: fallbackData } = await supabase.from("personas").select("*");
        personasData = fallbackData || [];
      }

      // Build map of procesosDB for easy lookup
      const procMapByNormName = new Map<string, any>();
      procesosDB.forEach((p) => {
        procMapByNormName.set(norm(p.nombre), p);
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayTime = new Date(todayStr).getTime();

      const list: PersonaAfirmacionRuta[] = personasData.map((p: any) => {
        const nombreCompleto = `${p.nombres || ""} ${p.apellidos || ""}`.trim() || "Sin Nombre";
        const rawIngreso = p.fecha_ingreso || p.ingreso_proceso || p.created_at || todayStr;
        const entryDateObj = new Date(rawIngreso);
        const entryTime = isNaN(entryDateObj.getTime()) ? todayTime : entryDateObj.getTime();
        const fechaIngresoStr = new Date(entryTime).toISOString().slice(0, 10);

        const diasDesdeIngreso = Math.max(
          0,
          Math.floor((todayTime - entryTime) / (1000 * 60 * 60 * 24))
        );

        const consolidadorNombre =
          p.seguimiento_por || p.lider_responsable || "Sin asignación";
        const redNombre = p.grupos?.red || p.grupos?.nombre || "Red General";

        // Map persona_procesos
        const ppMap = new Map<string, any>();
        (p.persona_procesos || []).forEach((pp: any) => {
          if (pp.proceso_id) ppMap.set(pp.proceso_id, pp);
        });

        // Calls logged for this persona
        const pLlamadas = llamadasAudit.filter((l: any) => l.persona_id === p.id);

        let hitosCompletadosCount = 0;
        let primerHitoPendienteIndex = -1;
        let tieneAtrasos = false;

        const hitosEstados: PersonaHitoEstado[] = HITOS_AFIRMACION_16.map((hitoDef) => {
          const procMatch = procMapByNormName.get(norm(hitoDef.nombre));
          const procId = procMatch?.id;
          const pp = procId ? ppMap.get(procId) : null;

          // Scheduled Date = Fecha Ingreso + offsetDias
          const progDate = new Date(entryTime + hitoDef.offsetDias * 86400000);
          const fechaProgramada = progDate.toISOString().slice(0, 10);

          let estado: "Pendiente" | "En curso" | "Finalizado" = "Pendiente";
          let fechaRealizada: string | null = null;
          let observacion: string | null = null;
          let responsableNombre: string | null = consolidadorNombre;
          let resultadoLlamada: string | null = null;
          let realizada = false;

          if (pp) {
            const rawEst = String(pp.estado || "").toLowerCase().trim();
            if (rawEst === "completado" || rawEst === "realizado" || rawEst === "finalizado") {
              estado = "Finalizado";
              realizada = true;
            } else if (rawEst === "en curso" || rawEst === "en proceso") {
              estado = "En curso";
            }
            fechaRealizada = pp.fecha_completado || null;
            observacion = pp.observacion || null;
          }

          // If it's a call milestone, check logged calls history
          if (hitoDef.tipo === "llamada") {
            const callEntry = pLlamadas.find((l: any) =>
              l.observacion?.toLowerCase().includes(`llamada ${hitoDef.index}`) ||
              l.observacion?.toLowerCase().includes(`llamada de consolidación ${hitoDef.index}`)
            ) || pLlamadas[hitoDef.index - 1];

            if (callEntry) {
              resultadoLlamada = callEntry.codificacion;
              if (callEntry.codificacion === "Contestó y atendió") {
                estado = "Finalizado";
                realizada = true;
                if (!fechaRealizada) fechaRealizada = callEntry.fecha_llamada?.slice(0, 10) || null;
              } else if (estado !== "Finalizado") {
                estado = "En curso";
              }
            }
          }

          const isPastDueDate = progDate.getTime() < todayTime;
          const atrasado = isPastDueDate && estado !== "Finalizado";
          if (atrasado) tieneAtrasos = true;

          if (estado === "Finalizado") {
            hitosCompletadosCount++;
          } else if (primerHitoPendienteIndex === -1) {
            primerHitoPendienteIndex = hitoDef.index;
          }

          return {
            hitoDef,
            procesoId: procId,
            estado,
            fechaProgramada,
            fechaRealizada,
            responsableNombre,
            observacion,
            resultadoLlamada,
            realizada,
            atrasado,
          };
        });

        const porcentajeCompletado = Math.round((hitosCompletadosCount / 16) * 100);
        const hitoActualNum = primerHitoPendienteIndex !== -1 ? primerHitoPendienteIndex : 16;
        const hitoActualNombre = HITOS_AFIRMACION_16[hitoActualNum - 1]?.nombre || "Completado";
        const proximoHitoNombre =
          primerHitoPendienteIndex !== -1 && primerHitoPendienteIndex < 16
            ? HITOS_AFIRMACION_16[primerHitoPendienteIndex]?.nombre
            : "Ruta Finalizada";

        const estadoGeneral: "Pendiente" | "En curso" | "Finalizado" =
          hitosCompletadosCount === 16
            ? "Finalizado"
            : hitosCompletadosCount > 0
            ? "En curso"
            : "Pendiente";

        return {
          id: p.id,
          nombres: p.nombres || "",
          apellidos: p.apellidos || "",
          nombreCompleto,
          telefono: p.telefono || p.whatsapp || null,
          whatsapp: p.whatsapp || p.telefono || null,
          fotoUrl: p.foto_url || null,
          fechaIngreso: fechaIngresoStr,
          diasDesdeIngreso,
          consolidadorNombre,
          redNombre,
          hitos: hitosEstados,
          hitosCompletados: hitosCompletadosCount,
          totalHitos: 16,
          porcentajeCompletado,
          hitoActualNum,
          hitoActualNombre,
          proximoHitoNombre,
          estadoGeneral,
          tieneAtrasos,
        };
      });

      return list;
    },
  });

  // Update milestone mutation
  const updateHitoMutation = useMutation({
    mutationFn: async (payload: {
      personaId: string;
      procesoId?: string;
      hitoNombre: string;
      estado: "Pendiente" | "En curso" | "Finalizado";
      fechaRealizada?: string | null;
      observacion?: string | null;
      codificacionLlamada?: string | null;
      consolidadorNombre?: string | null;
    }) => {
      const {
        personaId,
        procesoId,
        hitoNombre,
        estado,
        fechaRealizada,
        observacion,
        codificacionLlamada,
        consolidadorNombre,
      } = payload;

      // 1. Ensure procesoId exists
      let targetProcesoId = procesoId;
      if (!targetProcesoId) {
        const { data: pFind } = await supabase
          .from("procesos_crecimiento")
          .select("id")
          .ilike("nombre", `%${hitoNombre}%`)
          .single();

        if (pFind?.id) {
          targetProcesoId = pFind.id;
        } else {
          // Create process step dynamically if missing
          const { data: pNew } = await supabase
            .from("procesos_crecimiento")
            .insert({ nombre: hitoNombre, orden: 99 })
            .select("id")
            .single();
          targetProcesoId = pNew?.id;
        }
      }

      if (!targetProcesoId) {
        throw new Error("No se pudo identificar el hito en la base de datos");
      }

      // 2. Upsert persona_procesos
      const dbEstado = estado === "Finalizado" ? "Completado" : estado;
      const { error: ppErr } = await supabase.from("persona_procesos").upsert(
        {
          persona_id: personaId,
          proceso_id: targetProcesoId,
          estado: dbEstado,
          fecha_completado: estado === "Finalizado" ? fechaRealizada || new Date().toISOString().slice(0, 10) : null,
          observacion: observacion || null,
        },
        { onConflict: "persona_id,proceso_id" }
      );

      if (ppErr) throw ppErr;

      // 3. If codificacionLlamada provided or it's a call milestone, record in audit log
      if (codificacionLlamada || hitoNombre.toLowerCase().includes("llamada")) {
        const { data: userAuth } = await supabase.auth.getUser();
        await supabase.from("security_audit_log").insert({
          table_name: "registro_llamadas_consolidacion",
          operation: "INSERT",
          actor_email: userAuth.user?.email || "admin@iglesiacmg.org",
          changed: {
            persona_id: personaId,
            codificacion: codificacionLlamada || "Contestó y atendió",
            observacion: `Hito: ${hitoNombre}. ${observacion || ""}`,
            fecha_llamada: fechaRealizada || new Date().toISOString(),
            consolidador_nombre: consolidadorNombre || "Consolidador",
          },
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["afirmacion_personas_ruta"] });
      queryClient.invalidateQueries({ queryKey: ["consolidacion-llamadas"] });
      queryClient.invalidateQueries({ queryKey: ["persona-detalle"] });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      toast.success("Hito actualizado correctamente");
    },
    onError: (err: any) => {
      toast.error("Error al actualizar hito: " + (err.message || err));
    },
  });

  // Calculate global Dashboard stats with REAL DB data
  const stats = useMemo(() => {
    const totalPersonasEnAfirmacion = personasRuta.length;
    const personasEnProceso = personasRuta.filter((p) => p.porcentajeCompletado > 0 && p.porcentajeCompletado < 100).length;
    const hitosCompletadosTotales = personasRuta.reduce((acc, p) => acc + p.hitosCompletados, 0);
    const totalPosibleHitos = totalPersonasEnAfirmacion * 16;
    const porcentajeAvanceGeneral =
      totalPosibleHitos > 0 ? Math.round((hitosCompletadosTotales / totalPosibleHitos) * 100) : 0;

    const totalLlamadasRegistradas = personasRuta.reduce(
      (acc, p) => acc + p.hitos.filter((h) => h.hitoDef.tipo === "llamada" && h.estado === "Finalizado").length,
      0
    );

    const seguimientosPendientes = personasRuta.reduce(
      (acc, p) => acc + p.hitos.filter((h) => h.estado === "Pendiente" || h.estado === "En curso").length,
      0
    );

    const seguimientosAtrasados = personasRuta.reduce(
      (acc, p) => acc + p.hitos.filter((h) => h.atrasado).length,
      0
    );

    return {
      totalPersonasEnAfirmacion,
      personasEnProceso,
      hitosCompletadosTotales,
      totalLlamadasRegistradas,
      seguimientosPendientes,
      seguimientosAtrasados,
      porcentajeAvanceGeneral,
    };
  }, [personasRuta]);

  return {
    personasRuta,
    isLoading,
    refetch,
    stats,
    updateHito: updateHitoMutation.mutateAsync,
    isUpdating: updateHitoMutation.isPending,
  };
}
