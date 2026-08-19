import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMiPersona } from "@/hooks/useSeminarioStudent";
import { supabase } from "@/integrations/supabase/client";
import {
  TallerProgressState,
  ResultadoTaller,
  NivelResultado,
  SubAreaPuntaje,
  Desafio60SegundosRespuesta,
} from "./types";
import {
  ACTIVIDAD_2_DATA,
  ACTIVIDAD_3_DATA,
  ACTIVIDAD_4_DATA,
  ACTIVIDAD_5_DATA,
  ACTIVIDAD_6_DATA,
  ACTIVIDAD_7_DATA,
  ACTIVIDAD_8_DATA,
} from "./neumatologiaData";

const STORAGE_KEY_PREFIX = "doxa_taller_neumatologia_v1_";
const sb = supabase as any;

export function useTallerState() {
  const { user } = useAuth();
  const { data: persona } = useMiPersona();

  const storageKey = useMemo(() => {
    const id = persona?.id || user?.id || "guest";
    return `${STORAGE_KEY_PREFIX}${id}`;
  }, [persona?.id, user?.id]);

  const [state, setState] = useState<TallerProgressState>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.actividadActual === "number") {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Error leyendo localStorage de taller neumatologia:", err);
    }
    return {
      version: 1,
      tallerId: "taller_neumatologia",
      personaId: persona?.id,
      personaNombre: persona ? `${persona.nombres} ${persona.apellidos}` : undefined,
      estado: "no_iniciado",
      actividadActual: 1,
      respuestas: {},
      respuestasAbiertas: {},
      updatedAt: new Date().toISOString(),
    };
  });

  // Guardar en localStorage ante cambios
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error("Error guardando taller state en localStorage", e);
    }
  }, [state, storageKey]);

  // Actualizar datos de usuario si cambian
  useEffect(() => {
    if (persona && (!state.personaId || state.personaId !== persona.id)) {
      setState((prev) => ({
        ...prev,
        personaId: persona.id,
        personaNombre: `${persona.nombres} ${persona.apellidos}`,
      }));
    }
  }, [persona]);

  // Función para calcular puntaje y subáreas
  const calcularPuntaje = useCallback(
    (respuestas: Record<string, any>): ResultadoTaller => {
      // 1. Conceptos fundamentales (Actividad 1): 15 pts
      const act1Done = respuestas["act1_done"] === true;
      const ptsAct1 = act1Done ? 15 : 0;

      // 2. Siete Espíritus (Actividad 2): 10 pts (5 casos, 2pts cada uno)
      let ptsAct2 = 0;
      ACTIVIDAD_2_DATA.casos.forEach((c) => {
        if (respuestas[c.id] === c.respuestaCorrecta) ptsAct2 += 2;
      });

      // 3. Dones (Actividad 3 casos don + Actividad 6 9casos): 15 pts
      // Act 3 don (2casos de don = 3pts c/u = 6pts) + Act 6 (9casos = 1pt c/u = 9pts)
      let ptsDones = 0;
      if (respuestas["a3_c1"] === "DON") ptsDones += 3;
      if (respuestas["a3_c4"] === "DON") ptsDones += 3;
      ACTIVIDAD_6_DATA.casos.forEach((c) => {
        if (respuestas[c.id] === c.respuestaCorrecta) ptsDones += 1;
      });
      ptsDones = Math.min(15, ptsDones);

      // 4. Operaciones (Actividad 3 casos op): 10 pts (2 casos = 5pts c/u)
      let ptsOperaciones = 0;
      if (respuestas["a3_c3"] === "OPERACIÓN") ptsOperaciones += 5;
      if (respuestas["a3_c6"] === "OPERACIÓN") ptsOperaciones += 5;

      // 5. Falsificación (Actividad 4): 15 pts (5 casos = 3pts c/u)
      let ptsFalsificacion = 0;
      ACTIVIDAD_4_DATA.casos.forEach((c) => {
        if (respuestas[c.id] === c.respuestaCorrecta) ptsFalsificacion += 3;
      });

      // 6. Discernimiento (Actividad 5): 15 pts (4 casos = 3.75 pts c/u)
      let ptsDiscernimiento = 0;
      ACTIVIDAD_5_DATA.casos.forEach((c) => {
        if (respuestas[c.id] === c.respuestaCorrecta) ptsDiscernimiento += 3.75;
      });
      ptsDiscernimiento = Math.round(ptsDiscernimiento * 10) / 10;

      // 7. Ancianos / Diáconos / Ayudas / Gobiernos (Actividad 7 + Act 3 ministerios): 10 pts (4 casos Act 7 = 2.5 pts c/u)
      let ptsLiderazgo = 0;
      ACTIVIDAD_7_DATA.casos.forEach((c) => {
        if (respuestas[c.id] === c.respuestaCorrecta) ptsLiderazgo += 2.5;
      });

      // 8. Caso integral (Actividad 8): 10 pts (6 decisiones, ~1.66 pts c/u)
      let ptsCasoIntegral = 0;
      ACTIVIDAD_8_DATA.pasos.forEach((p) => {
        if (respuestas[`a8_paso_${p.numero}`] === p.respuestaCorrectaId) {
          ptsCasoIntegral += 1.666;
        }
      });
      ptsCasoIntegral = Math.round(ptsCasoIntegral * 10) / 10;

      const subareas: SubAreaPuntaje[] = [
        { id: "conceptos", nombre: "Conceptos fundamentales", maxPuntos: 15, puntosObtenidos: ptsAct1 },
        { id: "siete_espiritus", nombre: "Siete Espíritus", maxPuntos: 10, puntosObtenidos: ptsAct2 },
        { id: "dones", nombre: "Dones espirituales", maxPuntos: 15, puntosObtenidos: Math.round(ptsDones) },
        { id: "operaciones", nombre: "Operaciones", maxPuntos: 10, puntosObtenidos: ptsOperaciones },
        { id: "falsificacion", nombre: "Falsificación de dones", maxPuntos: 15, puntosObtenidos: ptsFalsificacion },
        { id: "discernimiento", nombre: "Discernimiento espiritual", maxPuntos: 15, puntosObtenidos: Math.round(ptsDiscernimiento) },
        { id: "liderazgo", nombre: "Ancianos / Diáconos / Ayudas / Gobiernos", maxPuntos: 10, puntosObtenidos: Math.round(ptsLiderazgo) },
        { id: "caso_integral", nombre: "Caso integral", maxPuntos: 10, puntosObtenidos: Math.round(ptsCasoIntegral) },
      ];

      const puntajeTotal = Math.min(
        100,
        Math.round(
          ptsAct1 +
            ptsAct2 +
            ptsDones +
            ptsOperaciones +
            ptsFalsificacion +
            ptsDiscernimiento +
            ptsLiderazgo +
            ptsCasoIntegral
        )
      );

      let nivel: NivelResultado = "NECESITA REPASAR";
      if (puntajeTotal >= 90) nivel = "EXCELENTE DOMINIO";
      else if (puntajeTotal >= 80) nivel = "MUY BUEN DOMINIO";
      else if (puntajeTotal >= 70) nivel = "BUEN DOMINIO";
      else if (puntajeTotal >= 60) nivel = "DEBE REFORZAR";

      const fortalezas: string[] = [];
      const debeReforzar: string[] = [];

      subareas.forEach((sa) => {
        const pct = (sa.puntosObtenidos / sa.maxPuntos) * 100;
        if (pct >= 80) fortalezas.push(sa.nombre);
        else if (pct < 70) debeReforzar.push(sa.nombre);
      });

      if (fortalezas.length === 0) fortalezas.push("Disposición de aprendizaje práctico");
      if (debeReforzar.length === 0) debeReforzar.push("Continuar consolidación doctrinal");

      return {
        puntajeTotal,
        nivel,
        subareas,
        fortalezas,
        debeReforzar,
        fechaCompletado: new Date().toISOString(),
      };
    },
    []
  );

  const setRespuesta = useCallback((idPregunta: string, valor: any) => {
    setState((prev) => {
      const nextRespuestas = { ...prev.respuestas, [idPregunta]: valor };
      return {
        ...prev,
        estado: prev.estado === "no_iniciado" ? "en_progreso" : prev.estado,
        respuestas: nextRespuestas,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const setRespuestaAbierta = useCallback((idPregunta: string, texto: string) => {
    setState((prev) => {
      const nextAbiertas = { ...prev.respuestasAbiertas, [idPregunta]: texto };
      return {
        ...prev,
        estado: prev.estado === "no_iniciado" ? "en_progreso" : prev.estado,
        respuestasAbiertas: nextAbiertas,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const setDesafio60s = useCallback((desafio: Desafio60SegundosRespuesta) => {
    setState((prev) => ({
      ...prev,
      desafio60s: desafio,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const irAActividad = useCallback((num: number) => {
    setState((prev) => ({
      ...prev,
      actividadActual: Math.max(1, Math.min(12, num)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const siguienteActividad = useCallback(() => {
    setState((prev) => {
      const nextAct = Math.min(12, prev.actividadActual + 1);
      return {
        ...prev,
        actividadActual: nextAct,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const anteriorActividad = useCallback(() => {
    setState((prev) => ({
      ...prev,
      actividadActual: Math.max(1, prev.actividadActual - 1),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const finalizarTaller = useCallback(async () => {
    const resultadoCalculado = calcularPuntaje(state.respuestas);
    const tieneAbiertas =
      Object.keys(state.respuestasAbiertas).length > 0 || !!state.desafio60s?.respuestaTexto;
    const nuevoEstado = tieneAbiertas ? "requiere_revision" : "completado";

    const nextState: TallerProgressState = {
      ...state,
      estado: nuevoEstado,
      actividadActual: 12, // Pantalla de resultado final
      resultado: resultadoCalculado,
      updatedAt: new Date().toISOString(),
    };

    setState(nextState);

    // Intentar sincronizar con Supabase si personaId o user existe
    try {
      if (persona?.id) {
        await sb.from("sem_entregas").upsert(
          {
            persona_id: persona.id,
            evaluacion_id: "taller_final_neumatologia",
            inscripcion_materia_id: persona.id, // Fallback id
            comentario: JSON.stringify({
              puntaje: resultadoCalculado.puntajeTotal,
              nivel: resultadoCalculado.nivel,
              respuestasAbiertas: state.respuestasAbiertas,
              desafio60s: state.desafio60s,
            }),
            estado: nuevoEstado,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "persona_id,evaluacion_id" }
        );
      }
    } catch (e) {
      console.warn("No se pudo sincronizar entrega con Supabase:", e);
    }

    return resultadoCalculado;
  }, [state, calcularPuntaje, persona?.id]);

  const reiniciarTaller = useCallback(() => {
    const newState: TallerProgressState = {
      version: 1,
      tallerId: "taller_neumatologia",
      personaId: persona?.id,
      personaNombre: persona ? `${persona.nombres} ${persona.apellidos}` : undefined,
      estado: "no_iniciado",
      actividadActual: 1,
      respuestas: {},
      respuestasAbiertas: {},
      updatedAt: new Date().toISOString(),
    };
    setState(newState);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error(e);
    }
  }, [persona, storageKey]);

  return {
    state,
    setRespuesta,
    setRespuestaAbierta,
    setDesafio60s,
    irAActividad,
    siguienteActividad,
    anteriorActividad,
    finalizarTaller,
    reiniciarTaller,
    calcularPuntaje: () => calcularPuntaje(state.respuestas),
  };
}
