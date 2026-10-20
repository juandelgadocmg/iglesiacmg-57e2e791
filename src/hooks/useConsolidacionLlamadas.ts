import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CODIFICACIONES_LLAMADA = [
  "Contestó y atendió",
  "No contestó",
  "Buzón de mensajes",
  "Fuera de servicio",
  "Número equivocado",
  "Llamada no efectiva",
  "Otro",
] as const;

export type CodificacionLlamada = (typeof CODIFICACIONES_LLAMADA)[number];

export interface RegistroLlamadaConsolidacion {
  id: string;
  persona_id: string;
  persona_nombre?: string;
  codificacion: CodificacionLlamada;
  observacion: string | null;
  fecha_llamada: string;
  consolidador_email?: string | null;
  consolidador_nombre?: string | null;
  completo_45_dias?: boolean;
  red?: string | null;
  lider_responsable?: string | null;
  created_at: string;
}

const LOCAL_STORAGE_KEY = "iglesia_consolidacion_llamadas_v1";

function getLocalLlamadas(): RegistroLlamadaConsolidacion[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLlamadas(list: RegistroLlamadaConsolidacion[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Error saving local llamadas:", err);
  }
}

export function useConsolidacionLlamadas(personaId?: string) {
  const qc = useQueryClient();

  const { data: llamadas = [], isLoading, refetch } = useQuery({
    queryKey: ["consolidacion-llamadas", personaId],
    queryFn: async () => {
      let dbLlamadas: RegistroLlamadaConsolidacion[] = [];

      // 1. Try querying security_audit_log for stored call entries
      try {
        let q = supabase
          .from("security_audit_log")
          .select("id, created_at, actor_email, changed")
          .eq("table_name", "registro_llamadas_consolidacion")
          .order("created_at", { ascending: false });

        const { data, error } = await q;

        if (!error && data && data.length > 0) {
          dbLlamadas = data.map((item: any) => {
            const ch = item.changed || {};
            return {
              id: item.id,
              persona_id: ch.persona_id,
              persona_nombre: ch.persona_nombre,
              codificacion: ch.codificacion || "Contestó y atendió",
              observacion: ch.observacion || null,
              fecha_llamada: ch.fecha_llamada || item.created_at,
              consolidador_email: item.actor_email || ch.consolidador_email,
              consolidador_nombre: ch.consolidador_nombre,
              completo_45_dias: !!ch.completo_45_dias,
              red: ch.red || null,
              lider_responsable: ch.lider_responsable || null,
              created_at: item.created_at,
            };
          });
        }
      } catch (e) {
        console.warn("Falling back to local storage calls log:", e);
      }

      const localList = getLocalLlamadas();

      // Merge DB & Local uniquely by ID
      const map = new Map<string, RegistroLlamadaConsolidacion>();
      [...dbLlamadas, ...localList].forEach((l) => map.set(l.id, l));

      let result = Array.from(map.values()).sort(
        (a, b) => new Date(b.fecha_llamada).getTime() - new Date(a.fecha_llamada).getTime()
      );

      if (personaId) {
        result = result.filter((l) => l.persona_id === personaId);
      }

      return result;
    },
  });

  // Mutation to add call log
  const registrarLlamadaMutation = useMutation({
    mutationFn: async (input: {
      persona_id: string;
      persona_nombre: string;
      codificacion: CodificacionLlamada;
      observacion?: string | null;
      fecha_llamada?: string;
      completo_45_dias?: boolean;
      red?: string | null;
      lider_responsable?: string | null;
    }) => {
      // Validate mandatory fields
      if (!input.codificacion) {
        throw new Error("Debe seleccionar una codificación de llamada obligatoria.");
      }
      if (input.codificacion === "Otro" && (!input.observacion || !input.observacion.trim())) {
        throw new Error("El campo de observación es obligatorio cuando se selecciona 'Otro'.");
      }

      const { data: authData } = await supabase.auth.getUser();
      const currentUserEmail = authData?.user?.email || "consolidador@iglesia.org";
      const fechaFinal = input.fecha_llamada || new Date().toISOString();

      const newId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const newRecord: RegistroLlamadaConsolidacion = {
        id: newId,
        persona_id: input.persona_id,
        persona_nombre: input.persona_nombre,
        codificacion: input.codificacion,
        observacion: input.observacion?.trim() || null,
        fecha_llamada: fechaFinal,
        consolidador_email: currentUserEmail,
        consolidador_nombre: currentUserEmail.split("@")[0],
        completo_45_dias: !!input.completo_45_dias,
        red: input.red || null,
        lider_responsable: input.lider_responsable || null,
        created_at: new Date().toISOString(),
      };

      // 1. Try persisting into audit log for table 'registro_llamadas_consolidacion'
      try {
        await supabase.from("security_audit_log" as any).insert({
          table_name: "registro_llamadas_consolidacion",
          operation: "INSERT",
          row_id: input.persona_id,
          actor_email: currentUserEmail,
          changed: {
            persona_id: input.persona_id,
            persona_nombre: input.persona_nombre,
            codificacion: input.codificacion,
            observacion: input.observacion?.trim() || null,
            fecha_llamada: fechaFinal,
            completo_45_dias: !!input.completo_45_dias,
            red: input.red || null,
            lider_responsable: input.lider_responsable || null,
          },
        });
      } catch (err) {
        console.warn("Could not write security_audit_log for call:", err);
      }

      // 1b. Sync call step to persona_procesos for cross-device realtime synchronization
      try {
        const { data: procs } = await supabase
          .from("procesos_crecimiento")
          .select("id, nombre")
          .ilike("nombre", "%llamada%");

        if (procs && procs.length > 0) {
          const targetProc = procs[0];
          await supabase.from("persona_procesos").upsert({
            persona_id: input.persona_id,
            proceso_id: targetProc.id,
            estado: input.codificacion === "Contestó y atendió" ? "Realizado" : "En curso",
            fecha_completado: fechaFinal.slice(0, 10),
            observacion: `${input.codificacion}${input.observacion ? ` - ${input.observacion}` : ""}`,
          } as any);
        }
      } catch (procErr) {
        console.warn("Could not sync persona_procesos for call:", procErr);
      }

      // 2. Save locally for guaranteed instant offline/online UI persistence
      const currentLocals = getLocalLlamadas();
      saveLocalLlamadas([newRecord, ...currentLocals]);

      // 3. Trigger Automatic Notification for Network Leader
      try {
        const tituloNotif = `Actualización Consolidación: ${input.persona_nombre}`;
        const descNotif = `Codificación: ${input.codificacion}. ${
          input.observacion ? `Notas: ${input.observacion}` : ""
        } ${input.completo_45_dias ? "🎉 ¡Completó los 45 días de consolidación!" : ""}`;

        await supabase.from("alertas_importantes" as any).insert({
          titulo: tituloNotif,
          descripcion: descNotif,
          categoria: "Consolidación",
          severidad: input.completo_45_dias ? "alta" : "media",
          estado: "pendiente",
          persona_id: input.persona_id,
          created_by_email: currentUserEmail,
          metadata: {
            codificacion: input.codificacion,
            fecha_llamada: fechaFinal,
            lider_responsable: input.lider_responsable,
            red: input.red,
          },
        });
      } catch (notifErr) {
        console.warn("Failed to create leader notification alert:", notifErr);
      }

      // 4. Update persona process "Consolidación" if completed 45 days
      if (input.completo_45_dias) {
        try {
          const { data: procs } = await supabase
            .from("procesos_crecimiento")
            .select("id")
            .ilike("nombre", "%consolidac%");

          if (procs && procs.length > 0) {
            await supabase.from("persona_procesos").upsert(
              {
                persona_id: input.persona_id,
                proceso_id: procs[0].id,
                estado: "Completado",
                fecha_completado: fechaFinal.slice(0, 10),
                observacion: `Consolidación de 45 días finalizada con éxito. Llamada: ${input.codificacion}`,
              } as any,
              { onConflict: "persona_id,proceso_id" }
            );
          }
        } catch (procErr) {
          console.warn("Failed updating persona_procesos for 45 days:", procErr);
        }
      }

      return newRecord;
    },
    onSuccess: (rec) => {
      qc.invalidateQueries({ queryKey: ["consolidacion-llamadas"] });
      qc.invalidateQueries({ queryKey: ["persona-procesos", rec.persona_id] });
      qc.invalidateQueries({ queryKey: ["alertas-importantes"] });
      toast.success(`Llamada a ${rec.persona_nombre} registrada exitosamente`, {
        description: `Resultado: ${rec.codificacion}`,
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al registrar la llamada");
    },
  });

  const deleteLlamadaMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete from local storage
      const locals = getLocalLlamadas();
      const newLocals = locals.filter(l => l.id !== id);
      saveLocalLlamadas(newLocals);

      // 2. Delete from security_audit_log if it exists
      if (!id.startsWith('call_')) {
        await supabase.from("security_audit_log").delete().eq("id", id);
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consolidacion-llamadas"] });
      toast.success("Llamada eliminada correctamente");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al eliminar la llamada");
    }
  });

  // Calculate statistics for 45-day Consolidation Report
  const stats = useMemo(() => {
    const totalLlamadas = llamadas.length;
    const codificacionCounts: Record<CodificacionLlamada, number> = {
      "Buzón de mensajes": 0,
      "Fuera de servicio": 0,
      "No contestó": 0,
      "Contestó y atendió": 0,
      "Número equivocado": 0,
      "Llamada no efectiva": 0,
      Otro: 0,
    };

    const personasEntregadasSet = new Set<string>();
    const personasFinalizadas45DiasSet = new Set<string>();

    llamadas.forEach((l) => {
      if (l.persona_id) {
        personasEntregadasSet.add(l.persona_id);
      }
      if (l.completo_45_dias) {
        personasFinalizadas45DiasSet.add(l.persona_id);
      }
      if (codificacionCounts[l.codificacion] !== undefined) {
        codificacionCounts[l.codificacion]++;
      }
    });

    const contestadas = codificacionCounts["Contestó y atendió"];
    const tasaEfectividad = totalLlamadas > 0 ? Math.round((contestadas / totalLlamadas) * 100) : 0;

    return {
      totalLlamadas,
      personasEntregadasAlConsolidador: personasEntregadasSet.size,
      personasEntregadas45Dias: personasFinalizadas45DiasSet.size,
      codificacionCounts,
      tasaEfectividad,
    };
  }, [llamadas]);

  return {
    llamadas,
    isLoading,
    stats,
    registrarLlamada: registrarLlamadaMutation.mutateAsync,
    isSubmitting: registrarLlamadaMutation.isPending,
    eliminarLlamada: deleteLlamadaMutation.mutateAsync,
    refetch,
  };
}
