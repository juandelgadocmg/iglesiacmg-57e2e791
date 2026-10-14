// Semáforo logic based on discipleship stage timeline

export type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris' | 'azul';

interface SemaforoInput {
  status: string;
  startDate: string | null;
  progreso: { etapa_code: string; completed: boolean }[];
}

export function calcularSemaforo(input: SemaforoInput): SemaforoColor {
  const { status, startDate, progreso } = input;

  if (status === 'En pausa') return 'gris';
  if (status === 'Completado') return 'azul';

  const estados = calcularEstadoEtapas(startDate, progreso);
  const totalEtapas = estados.length;
  const completadas = estados.filter((e) => e.completada).length;

  // Azul: todas completadas
  if (completadas === totalEtapas) return 'azul';

  // Rojo: alguna etapa vencida
  const tieneVencida = estados.some((e) => e.vencida);
  if (tieneVencida) return 'rojo';

  // Verde: todas las etapas hasta ahora están completadas a tiempo
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const etapasQueDeberianEstarCompletas = estados.filter(
    (e) => e.fechaLimite && e.fechaLimite <= hoy && !e.completada
  );
  const todasAlDia = etapasQueDeberianEstarCompletas.length === 0 && completadas > 0;
  if (todasAlDia) return 'verde';

  // Amarillo: tiene etapas pendientes pero ninguna vencida
  return 'amarillo';
}

export const SEMAFORO_CONFIG: Record<SemaforoColor, { label: string; bgClass: string; dotClass: string }> = {
  verde: { label: 'Al día', bgClass: 'bg-semaforo-verde', dotClass: 'bg-semaforo-verde' },
  amarillo: { label: 'Atención', bgClass: 'bg-semaforo-amarillo', dotClass: 'bg-semaforo-amarillo' },
  rojo: { label: 'Crítico', bgClass: 'bg-semaforo-rojo', dotClass: 'bg-semaforo-rojo' },
  gris: { label: 'En pausa', bgClass: 'bg-semaforo-gris', dotClass: 'bg-semaforo-gris' },
  azul: { label: 'Completado', bgClass: 'bg-semaforo-azul', dotClass: 'bg-semaforo-azul' },
};

export const ETAPAS_ORDER = ['NPT', 'TSDP', 'NVNC', 'RSI', 'DNC', 'ES', 'LCP', 'RLCP'];

export const ETAPAS_LABELS: Record<string, string> = {
  NPT: 'Nací para triunfar',
  TSDP: 'Tres semanas de poder',
  NVNC: 'Nueva vida y nuevo comienzo',
  RSI: 'Retiro de sanidad interior',
  DNC: 'Discipulado nuevo creyente',
  ES: 'Escuela de evangelismo',
  LCP: 'Líderes de casas de paz',
  RLCP: 'Retiro líderes casas de paz',
};

// Duración de cada etapa
export interface EtapaDuracion {
  code: string;
  tipo: 'dias' | 'fechas_fijas';
  dias?: number;
  fechas?: string[]; // formato "DD/MM" para fechas fijas anuales
}

export const ETAPAS_DURACION: EtapaDuracion[] = [
  { code: 'NPT', tipo: 'dias', dias: 3 },
  { code: 'TSDP', tipo: 'dias', dias: 21 },
  { code: 'NVNC', tipo: 'dias', dias: 15 },
  { code: 'RSI', tipo: 'fechas_fijas', fechas: ['23/03', '15/06', '12/10'] },
  { code: 'DNC', tipo: 'dias', dias: 60 },
  { code: 'ES', tipo: 'dias', dias: 30 },
  { code: 'LCP', tipo: 'dias', dias: 30 },
  { code: 'RLCP', tipo: 'fechas_fijas', fechas: ['02/04', '16/11'] },
];

export const ETAPAS_DURACION_MAP: Record<string, EtapaDuracion> = Object.fromEntries(
  ETAPAS_DURACION.map((e) => [e.code, e])
);

// Helper: formato legible de la duración
export function formatDuracion(code: string): string {
  const etapa = ETAPAS_DURACION_MAP[code];
  if (!etapa) return '';
  if (etapa.tipo === 'dias') return `${etapa.dias} días`;
  if (etapa.tipo === 'fechas_fijas' && etapa.fechas) {
    return etapa.fechas.join(', ');
  }
  return '';
}

// Calcula las fechas límite acumuladas para cada etapa dado un start_date
export interface EtapaTimeline {
  code: string;
  startDate: Date;
  endDate: Date;
  diasTotal: number;
  tipo: 'dias' | 'fechas_fijas';
}

function getNextFixedDate(fechas: string[], afterDate: Date): Date {
  const currentYear = afterDate.getFullYear();
  const candidates: Date[] = [];

  for (const f of fechas) {
    const [day, month] = f.split('/').map(Number);
    // Try current year and next year
    candidates.push(new Date(currentYear, month - 1, day));
    candidates.push(new Date(currentYear + 1, month - 1, day));
  }

  // Find the earliest date that is >= afterDate
  const valid = candidates.filter((d) => d >= afterDate).sort((a, b) => a.getTime() - b.getTime());
  return valid[0] || candidates[candidates.length - 1];
}

export function calcularTimeline(startDateStr: string | null): EtapaTimeline[] {
  if (!startDateStr) return [];

  const timeline: EtapaTimeline[] = [];
  let cursor = new Date(startDateStr);

  for (const etapa of ETAPAS_DURACION) {
    const start = new Date(cursor);

    if (etapa.tipo === 'dias' && etapa.dias) {
      const end = new Date(start);
      end.setDate(end.getDate() + etapa.dias);
      timeline.push({ code: etapa.code, startDate: start, endDate: end, diasTotal: etapa.dias, tipo: 'dias' });
      cursor = end;
    } else if (etapa.tipo === 'fechas_fijas' && etapa.fechas) {
      const nextDate = getNextFixedDate(etapa.fechas, start);
      const dias = Math.max(1, Math.ceil((nextDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      timeline.push({ code: etapa.code, startDate: start, endDate: nextDate, diasTotal: dias, tipo: 'fechas_fijas' });
      // After the fixed date event, move cursor to the day after
      const afterEvent = new Date(nextDate);
      afterEvent.setDate(afterEvent.getDate() + 1);
      cursor = afterEvent;
    }
  }

  return timeline;
}

// Calcula estado temporal de una etapa para un discípulo
export interface EtapaEstado {
  code: string;
  completada: boolean;
  diasRestantes: number | null; // null si completada o sin timeline
  diasTranscurridos: number;
  diasTotal: number;
  porcentajeTiempo: number; // 0-100
  vencida: boolean;
  fechaLimite: Date | null;
  tipo: 'dias' | 'fechas_fijas';
  fechasTexto?: string;
}

export function calcularEstadoEtapas(
  startDate: string | null,
  progreso: { etapa_code: string; completed: boolean }[]
): EtapaEstado[] {
  const timeline = calcularTimeline(startDate);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return ETAPAS_ORDER.map((code) => {
    const tl = timeline.find((t) => t.code === code);
    const completada = progreso.some((p) => p.etapa_code === code && p.completed);
    const etapaDur = ETAPAS_DURACION_MAP[code];

    if (!tl) {
      return {
        code,
        completada,
        diasRestantes: null,
        diasTranscurridos: 0,
        diasTotal: etapaDur?.dias || 0,
        porcentajeTiempo: 0,
        vencida: false,
        fechaLimite: null,
        tipo: etapaDur?.tipo || 'dias',
        fechasTexto: etapaDur?.tipo === 'fechas_fijas' ? etapaDur.fechas?.join(', ') : undefined,
      };
    }

    const diasTranscurridos = Math.max(0, Math.ceil((hoy.getTime() - tl.startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const diasRestantes = Math.ceil((tl.endDate.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    const porcentajeTiempo = Math.min(100, Math.round((diasTranscurridos / tl.diasTotal) * 100));

    return {
      code,
      completada,
      diasRestantes: completada ? null : diasRestantes,
      diasTranscurridos,
      diasTotal: tl.diasTotal,
      porcentajeTiempo: completada ? 100 : porcentajeTiempo,
      vencida: !completada && diasRestantes < 0,
      fechaLimite: tl.endDate,
      tipo: tl.tipo,
      fechasTexto: etapaDur?.tipo === 'fechas_fijas' ? etapaDur.fechas?.join(', ') : undefined,
    };
  });
}
