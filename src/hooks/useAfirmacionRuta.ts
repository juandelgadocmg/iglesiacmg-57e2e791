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
  origen: "Directo" | "Grupo"; // Siempre "Directo": las personas de Casas de Paz se excluyen antes de llegar aquí
  origenLabel: string;
  grupoId: string | null;
  grupoNombre: string | null; // CDP asignada como referencia de seguimiento (no determina inclusión)
  barrio: string | null;
  direccion: string | null;
  email: string | null;
  documento: string | null;
  invitadoPor: string | null;
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

function parseAnyDateToISO(rawDateStr: any, fallbackStr?: any): string {
  const tryParse = (strVal: any): string | null => {
    if (!strVal) return null;
    const str = String(strVal).trim();
    if (!str) return null;

    // Match YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, "0");
      const d = isoMatch[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    // Match DD/MM/YYYY or DD-MM-YYYY
    const latMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (latMatch) {
      const d = latMatch[1].padStart(2, "0");
      const m = latMatch[2].padStart(2, "0");
      const y = latMatch[3];
      return `${y}-${m}-${d}`;
    }

    // Standard JS Date parse fallback
    const dObj = new Date(str);
    if (!isNaN(dObj.getTime())) {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, "0");
      const d = String(dObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    return null;
  };

  const parsedPrimary = tryParse(rawDateStr);
  if (parsedPrimary) return parsedPrimary;

  const parsedFallback = tryParse(fallbackStr);
  if (parsedFallback) return parsedFallback;

  return new Date().toISOString().slice(0, 10);
}

function matchHitoWithProceso(hitoDef: HitoAfirmacionDef, procNombre: string): boolean {
  const pNorm = norm(procNombre);
  const hNorm = norm(hitoDef.nombre);

  if (!pNorm) return false;
  if (pNorm.includes(hNorm) || hNorm.includes(pNorm)) return true;

  if (hitoDef.key === "llamada_1" && (pNorm.includes("llamada 1") || pNorm.includes("consolidacion 1") || pNorm.includes("1ra llamada") || pNorm.includes("primer llamada"))) return true;
  if (hitoDef.key === "llamada_2" && (pNorm.includes("llamada 2") || pNorm.includes("consolidacion 2") || pNorm.includes("2da llamada") || pNorm.includes("segunda llamada"))) return true;
  if (hitoDef.key === "llamada_3" && (pNorm.includes("llamada 3") || pNorm.includes("consolidacion 3") || pNorm.includes("3ra llamada") || pNorm.includes("tercer llamada"))) return true;

  if (hitoDef.key === "mensaje_1" && (pNorm.includes("mensaje 1") || pNorm.includes("1er mensaje") || pNorm.includes("primer mensaje"))) return true;
  if (hitoDef.key === "mensaje_2" && (pNorm.includes("mensaje 2") || pNorm.includes("2do mensaje") || pNorm.includes("segundo mensaje"))) return true;
  if (hitoDef.key === "mensaje_3" && (pNorm.includes("mensaje 3") || pNorm.includes("3er mensaje") || pNorm.includes("tercer mensaje"))) return true;
  if (hitoDef.key === "mensaje_4" && (pNorm.includes("mensaje 4") || pNorm.includes("4to mensaje"))) return true;
  if (hitoDef.key === "mensaje_5" && (pNorm.includes("mensaje 5") || pNorm.includes("5to mensaje"))) return true;
  if (hitoDef.key === "mensaje_6" && (pNorm.includes("mensaje 6") || pNorm.includes("6to mensaje"))) return true;

  if (hitoDef.key === "visita" && pNorm.includes("visita")) return true;
  if (hitoDef.key === "consejeria" && (pNorm.includes("consejeria") || pNorm.includes("consejería"))) return true;
  if (hitoDef.key === "fiesta_bienvenida" && (pNorm.includes("bienvenida") || pNorm.includes("fiesta"))) return true;
  if (hitoDef.key === "naci_triunfar_1" && (pNorm.includes("triunfar") || pNorm.includes("npt"))) return true;

  if (hitoDef.key === "semana_poder_1" && (pNorm.includes("semana de poder 1") || pNorm.includes("semana poder 1") || pNorm.includes("sdp 1") || pNorm.includes("sdp1") || pNorm.includes("tsdp"))) return true;
  if (hitoDef.key === "semana_poder_2" && (pNorm.includes("semana de poder 2") || pNorm.includes("semana poder 2") || pNorm.includes("sdp 2") || pNorm.includes("sdp2"))) return true;
  if (hitoDef.key === "semana_poder_3" && (pNorm.includes("semana de poder 3") || pNorm.includes("semana poder 3") || pNorm.includes("sdp 3") || pNorm.includes("sdp3"))) return true;

  return false;
}

export const PROCESOS_HARDCODED_MAP: Record<string, string> = {
  "Ingreso a la Iglesia": "533cfe37-15fa-42ce-8b5c-23e9dd685d99",
  "Llamada de Consolidación 1": "f61eb6d6-059c-49c4-8a50-02f3fb2fd382",
  "Mensaje 1": "beb09fb3-d9ec-4766-a104-973afd0774b9",
  "Llamada de Consolidación 2": "987cf897-c292-4a5c-a46a-ab6166f2a0eb",
  "Mensaje 2": "98976585-2920-4317-8c94-97201d121131",
  "Llamada de Consolidación 3": "184e1f0e-de0c-49f8-8dad-a5a76669f378",
  "Mensaje 3": "235b788e-ccb2-48a4-9753-4b4c212bc43f",
  "Mensaje 4": "dc200a35-6369-472b-9e2b-be673bc46431",
  "Mensaje 5": "94d5b9eb-99ed-4b63-94b6-79011066bcea",
  "Mensaje 6": "9e95eee6-ccbb-48d8-ac9f-48cee65cb39f",
  "Visita": "dfe05ecf-9eae-42a0-ad57-251dca1cb630",
  "Consejería": "3e1ff265-f694-4c67-8b70-c9c045ad1904",
  "Fiesta de Bienvenida": "67056560-78cc-41f0-aae3-9879a34fdc80",
  "Nací para Triunfar Día 1": "18db1d26-851a-47be-b695-8ae7ead452a0",
  "Semana de Poder 1": "923c9bf3-feb5-4112-a758-0e75a44cb46b",
  "Semana de Poder 2": "923c9bf3-feb5-4112-a758-0e75a44cb46c",
  "Semana de Poder 3": "923c9bf3-feb5-4112-a758-0e75a44cb46d",
};

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
      let list = data || [];

      // Auto-insert any missing 16 hitos into procesos_crecimiento in Supabase
      const missingHitos = HITOS_AFIRMACION_16.filter(
        (hDef) => !list.some((dbP) => matchHitoWithProceso(hDef, dbP.nombre))
      );

      if (missingHitos.length > 0) {
        try {
          const toInsert = missingHitos.map((hDef) => ({
            nombre: hDef.nombre,
            orden: hDef.index,
          }));
          const { data: inserted } = await supabase
            .from("procesos_crecimiento")
            .insert(toInsert)
            .select("id, nombre, orden");

          if (inserted && inserted.length > 0) {
            list = [...list, ...inserted];
          }
        } catch (e) {
          console.warn("Auto-insert missing hitos error:", e);
        }
      }

      return list;
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
          .order("created_at", { ascending: false })
          .limit(500);

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
    queryKey: ["afirmacion_personas_ruta", procesosDB.length, llamadasAudit.length],
    queryFn: async () => {
      // Fetch ALL rows from Supabase using chunked range pagination (overcoming default 1000 row PostgREST limit)
      let personasData: any[] = [];
      let pageFrom = 0;
      const CHUNK_SIZE = 1000;
      let hasMorePages = true;

      // IMPORTANTE: se filtra "tipo_persona" DIRECTAMENTE en la base de datos (no en el
      // cliente) para no descargar ni procesar los miles de registros creados por Casas de
      // Paz que este módulo nunca muestra. Esto es lo que hace que el módulo cargue rápido.
      while (hasMorePages) {
        try {
          const { data, error } = await supabase
            .from("personas")
            .select("*, grupos(id, nombre), persona_procesos(proceso_id, estado, fecha_completado, observacion)")
            .order("created_at", { ascending: false })
            .range(pageFrom, pageFrom + CHUNK_SIZE - 1);

          if (error) {
            console.warn("[Afirmacion] primary query page error, fallback simple range:", error.message);
            const { data: simple } = await supabase
              .from("personas")
              .select("*")
              .order("created_at", { ascending: false })
              .range(pageFrom, pageFrom + CHUNK_SIZE - 1);

            if (simple && simple.length > 0) {
              personasData = personasData.concat(simple);
            }
            if (!simple || simple.length < CHUNK_SIZE) {
              hasMorePages = false;
            }
          } else {
            if (data && data.length > 0) {
              personasData = personasData.concat(data);
            }
            if (!data || data.length < CHUNK_SIZE) {
              hasMorePages = false;
            }
          }
        } catch (e) {
          console.error("[Afirmacion] chunk exception:", e);
          hasMorePages = false;
        }
        pageFrom += CHUNK_SIZE;
      }

      const personasVisitantesAfirmacion = personasData;

      console.log(`[Afirmacion] Total personas cargadas para Afirmación: ${personasVisitantesAfirmacion.length}`);

      // Build map of procesosDB for easy lookup (by name AND by id, including hardcoded UUIDs)
      const procMapByNormName = new Map<string, any>();
      const procMapById = new Map<string, any>();

      // First populate with hardcoded UUID map
      Object.entries(PROCESOS_HARDCODED_MAP).forEach(([name, uuid]) => {
        const obj = { id: uuid, nombre: name };
        procMapByNormName.set(norm(name), obj);
        procMapById.set(uuid, obj);
      });

      // Then overwrite/augment with real database records
      procesosDB.forEach((p) => {
        procMapByNormName.set(norm(p.nombre), p);
        procMapById.set(p.id, p);
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayTime = new Date(todayStr).getTime();

      const list: PersonaAfirmacionRuta[] = personasVisitantesAfirmacion.map((p: any) => {
        const nombreCompleto = `${p.nombres || ""} ${p.apellidos || ""}`.trim() || "Sin Nombre";
        const fechaIngresoStr = parseAnyDateToISO(
          p.fecha_ingreso || p.ingreso_proceso,
          p.created_at
        );

        const parts = fechaIngresoStr.split("-");
        const entryYear = Number(parts[0]);
        const entryMonth = Number(parts[1]) - 1;
        const entryDay = Number(parts[2] || 1);
        const entryTime = new Date(entryYear, entryMonth, entryDay).getTime();
        const nowObj = new Date();
        const todayZeroTime = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate()).getTime();

        const diasDesdeIngreso = Math.max(
          0,
          Math.floor((todayZeroTime - entryTime) / (1000 * 60 * 60 * 24))
        );

        const consolidadorNombre =
          p.seguimiento_por || p.lider_responsable || "Sin asignación";
        const redNombre = p.red || p.grupos?.nombre || "Red General";

        // Processes registered for this persona (from embedded join)
        const pPpList = Array.isArray(p.persona_procesos) ? p.persona_procesos : [];

        // Calls logged for this persona
        const pLlamadas = llamadasAudit.filter((l: any) => l.persona_id === p.id);

        let hitosCompletadosCount = 0;
        let primerHitoPendienteIndex = -1;
        let primerIncompletoEncontrado = false;
        let tieneAtrasos = false;

        const hitosEstados: PersonaHitoEstado[] = HITOS_AFIRMACION_16.map((hitoDef) => {
          const procMatch = procMapByNormName.get(norm(hitoDef.nombre));
          const hardcodedUuid = PROCESOS_HARDCODED_MAP[hitoDef.nombre];

          // Find matching process: check proceso_id, hardcoded UUIDs, or normalized name
          const userPP = pPpList.find((pp: any) => {
            if (procMatch?.id && pp.proceso_id === procMatch.id) return true;
            if (hardcodedUuid && pp.proceso_id === hardcodedUuid) return true;
            const proc = procMapById.get(pp.proceso_id);
            const procName = proc?.nombre || pp.proceso_nombre || pp.nombre || "";
            return matchHitoWithProceso(hitoDef, procName);
          });

          const procId = userPP?.proceso_id || procMatch?.id || hardcodedUuid;

          // Scheduled Date = Fecha Ingreso + offsetDias
          const progDate = new Date(entryTime + hitoDef.offsetDias * 86400000);
          const fechaProgramada = progDate.toISOString().slice(0, 10);

          let estado: "Pendiente" | "En curso" | "Finalizado" = "Pendiente";
          let fechaRealizada: string | null = null;
          let observacion: string | null = null;
          let responsableNombre: string | null = consolidadorNombre;
          let resultadoLlamada: string | null = null;
          let realizada = false;

          if (userPP) {
            const rawEst = String(userPP.estado || "").toLowerCase().trim();
            const isCompleted =
              rawEst === "completado" ||
              rawEst === "realizado" ||
              rawEst === "finalizado" ||
              rawEst === "aprobado" ||
              rawEst === "si" ||
              rawEst === "sí" ||
              rawEst === "1" ||
              rawEst === "true" ||
              Boolean(userPP.fecha_completado);

            if (isCompleted) {
              estado = "Finalizado";
              realizada = true;
            } else if (rawEst === "en curso" || rawEst === "en proceso") {
              estado = "En curso";
            }
            fechaRealizada = userPP.fecha_completado || null;
            observacion = userPP.observacion || null;
          }

          // If it's a call milestone, check logged calls history
          if (hitoDef.tipo === "llamada") {
            const callEntry = pLlamadas.find((l: any) =>
              l.observacion?.toLowerCase().includes(`llamada ${hitoDef.index}`) ||
              l.observacion?.toLowerCase().includes(`llamada de consolidación ${hitoDef.index}`)
            ) || pLlamadas[hitoDef.index - 1];

            if (callEntry) {
              resultadoLlamada = callEntry.codificacion;
              if (estado === "Finalizado" || callEntry.codificacion || callEntry.fecha_llamada) {
                estado = "Finalizado";
                realizada = true;
                if (!fechaRealizada) fechaRealizada = callEntry.fecha_llamada?.slice(0, 10) || null;
              }
            }
          }

          const isPastDueDate = progDate.getTime() < todayTime;
          let atrasado = false;

          if (estado === "Finalizado") {
            hitosCompletadosCount++;
          } else {
            if (primerHitoPendienteIndex === -1) {
              primerHitoPendienteIndex = hitoDef.index;
            }
            if (!primerIncompletoEncontrado) {
              primerIncompletoEncontrado = true;
              if ((estado as string) !== "Finalizado") {
                estado = "En curso";
              }
            } else {
              if ((estado as string) !== "Finalizado") {
                estado = "Pendiente";
              }
            }
            // Count any incomplete milestone past its scheduled date as overdue
            if (isPastDueDate) {
              atrasado = true;
              tieneAtrasos = true;
            }
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

        const esCdp =
          p.tipo_persona === "CDP" ||
          (Array.isArray(p.tipos_persona) && p.tipos_persona.includes("CDP")) ||
          String(p.vinculacion || "").toLowerCase().trim() === "casas de paz";
        const grupoId = p.grupo_id || p.grupos?.id || null;
        const grupoNombre = p.grupos?.nombre || null;
        const origen: "Directo" | "Grupo" = esCdp || grupoId ? "Grupo" : "Directo";
        const origenLabel = esCdp ? "🏠 Casa de Paz" : "🎯 Visitante / Afirmación";

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
          origen,
          origenLabel,
          grupoId,
          grupoNombre,
          barrio: p.barrio || null,
          direccion: p.direccion || null,
          email: p.email || null,
          documento: p.documento || null,
          invitadoPor: p.invitado_por || null,
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

    const conCdpAsignada = personasRuta.filter((p) => !!p.grupoId).length;

    return {
      totalPersonasEnAfirmacion,
      personasEnProceso,
      hitosCompletadosTotales,
      totalLlamadasRegistradas,
      seguimientosPendientes,
      seguimientosAtrasados,
      porcentajeAvanceGeneral,
      conCdpAsignada,
      sinCdpAsignada: totalPersonasEnAfirmacion - conCdpAsignada,
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
