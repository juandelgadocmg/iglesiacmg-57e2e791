import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

export interface AppNotification {
  id: string;
  type: "event" | "birthday" | "service" | "payment" | "seminario";
  title: string;
  description: string;
  date: string;
  daysLeft: number;
  icon: "calendar" | "cake" | "church" | "dollar" | "alert";
  href?: string;
}

export function useNotifications() {
  const { data: prefs } = useNotificationPreferences();
  const enabled = (k: string) => prefs?.[k] !== false;
  const { data: personas } = useQuery({
    queryKey: ["notif-personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("id, nombres, apellidos, fecha_nacimiento");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: eventos } = useQuery({
    queryKey: ["notif-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, nombre, fecha_inicio, lugar")
        .gte("fecha_inicio", new Date().toISOString().split("T")[0])
        .order("fecha_inicio", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: pagosVencidos } = useQuery({
    queryKey: ["notif-pagos-vencidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagos_matricula")
        .select("id, estado, created_at, matricula_id, concepto_pago_id, conceptos_pago(nombre, monto), matriculas(persona_id, personas(nombres, apellidos))")
        .eq("estado", "Pendiente");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: servicios } = useQuery({
    queryKey: ["notif-servicios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("id, nombre, fecha, hora")
        .eq("estado", "Programado")
        .gte("fecha", new Date().toISOString().split("T")[0])
        .order("fecha", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: semVencidos } = useQuery({
    queryKey: ["notif-seminario-vencidos"],
    queryFn: async () => {
      const sb = supabase as any;
      const { data: ins } = await sb.from("sem_inscripciones")
        .select("id, semestre_actual, programa_id, personas:persona_id(nombres,apellidos)")
        .eq("estado", "activa");
      if (!ins?.length) return [];
      const items: any[] = [];
      for (const i of ins) {
        const { data: pensum } = await sb.from("sem_pensum_materias")
          .select("materia_id, sem_pensum_semestres!inner(numero, programa_id)")
          .eq("sem_pensum_semestres.programa_id", i.programa_id)
          .lt("sem_pensum_semestres.numero", i.semestre_actual || 1);
        const ids = (pensum || []).map((p: any) => p.materia_id);
        if (!ids.length) continue;
        const { data: cursadas } = await sb.from("sem_inscripcion_materias")
          .select("materia_id, estado")
          .eq("inscripcion_id", i.id)
          .in("materia_id", ids);
        const aprob = new Set((cursadas || []).filter((c: any) => c.estado === "aprobada").map((c: any) => c.materia_id));
        const pendientes = ids.filter((id: string) => !aprob.has(id));
        if (pendientes.length) items.push({ id: i.id, persona: i.personas, pendientes: pendientes.length });
      }
      return items;
    },
    staleTime: 10 * 60 * 1000,
  });

  const notifications = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // Upcoming birthdays (within 7 days)
    if (enabled("birthdays")) (personas || []).forEach((p) => {
      if (!p.fecha_nacimiento) return;
      try {
        const bday = parseISO(p.fecha_nacimiento);
        const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate());
        if (thisYearBday < now) thisYearBday.setFullYear(currentYear + 1);
        const days = differenceInDays(thisYearBday, now);
        if (days >= 0 && days <= 7) {
          items.push({
            id: `bday-${p.id}`,
            type: "birthday",
            title: `🎂 ${p.nombres} ${p.apellidos}`,
            description: days === 0 ? "¡Cumple años hoy!" : `Cumple años en ${days} día${days > 1 ? "s" : ""}`,
            date: format(thisYearBday, "dd MMM", { locale: es }),
            daysLeft: days,
            icon: "cake",
          });
        }
      } catch {}
    });

    // Upcoming events (within 14 days)
    if (enabled("events")) (eventos || []).forEach((e) => {
      try {
        const days = differenceInDays(parseISO(e.fecha_inicio), now);
        if (days >= 0 && days <= 14) {
          items.push({
            id: `event-${e.id}`,
            type: "event",
            title: e.nombre,
            description: days === 0 ? "¡Es hoy!" : `En ${days} día${days > 1 ? "s" : ""} · ${e.lugar || ""}`,
            date: e.fecha_inicio,
            daysLeft: days,
            icon: "calendar",
          });
        }
      } catch {}
    });

    // Upcoming services (within 7 days)
    if (enabled("services")) (servicios || []).forEach((s) => {
      try {
        const days = differenceInDays(parseISO(s.fecha), now);
        if (days >= 0 && days <= 7) {
          items.push({
            id: `svc-${s.id}`,
            type: "service",
            title: s.nombre,
            description: days === 0 ? `Hoy a las ${s.hora || ""}` : `En ${days} día${days > 1 ? "s" : ""} · ${s.hora || ""}`,
            date: s.fecha,
            daysLeft: days,
            icon: "church",
          });
        }
      } catch {}
    });

    // Overdue payments (pending for more than 30 days)
    const OVERDUE_DAYS = 30;
    if (enabled("payments")) (pagosVencidos || []).forEach((p: any) => {
      try {
        const createdDate = parseISO(p.created_at);
        const daysSinceCreated = differenceInDays(now, createdDate);
        if (daysSinceCreated >= OVERDUE_DAYS) {
          const persona = p.matriculas?.personas;
          const nombreCompleto = persona ? `${persona.nombres} ${persona.apellidos}` : "Estudiante";
          const concepto = p.conceptos_pago?.nombre || "Pago";
          const monto = p.conceptos_pago?.monto || 0;
          items.push({
            id: `pago-${p.id}`,
            type: "payment",
            title: `💰 ${nombreCompleto}`,
            description: `${concepto} ($${monto}) pendiente hace ${daysSinceCreated} días`,
            date: format(createdDate, "dd MMM", { locale: es }),
            daysLeft: -daysSinceCreated,
            icon: "dollar",
          });
        }
      } catch {}
    });

    // Seminario: semestres vencidos con materias sin aprobar
    (semVencidos || []).forEach((s: any) => {
      const nom = s.persona ? `${s.persona.nombres} ${s.persona.apellidos}` : "Estudiante";
      items.push({
        id: `sem-${s.id}`,
        type: "seminario",
        title: `⚠ ${nom}`,
        description: `${s.pendientes} materia${s.pendientes > 1 ? "s" : ""} pendiente${s.pendientes > 1 ? "s" : ""} de semestres anteriores`,
        date: "Seminario",
        daysLeft: -1,
        icon: "alert",
        href: "/seminario",
      });
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [personas, eventos, servicios, pagosVencidos, semVencidos]);

  return { notifications, count: notifications.length };
}
