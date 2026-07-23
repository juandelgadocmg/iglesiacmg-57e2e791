/**
 * Fecha límite de las planeaciones de Casas de Paz:
 * cada martes a las 11:59 PM hora de Bogotá (UTC-5, sin DST).
 */

const BOGOTA_OFFSET_HOURS = -5;

/** Convierte una fecha UTC a componentes en hora Bogotá. */
function toBogota(d: Date) {
  return new Date(d.getTime() + BOGOTA_OFFSET_HOURS * 3600_000);
}

/** Devuelve el próximo (o mismo) martes 23:59 Bogotá >= `from`, como Date UTC. */
export function tuesdayDeadlineFor(from: Date | string = new Date()): Date {
  const base = typeof from === "string" ? new Date(from) : from;
  const b = toBogota(base);
  // getUTCDay en b representa el día en Bogotá (0=dom, 2=mar)
  const dow = b.getUTCDay();
  let daysUntilTue = (2 - dow + 7) % 7;
  const bTime = b.getUTCHours() * 60 + b.getUTCMinutes();
  // Si ya es martes después de 23:59, mover al siguiente martes
  if (daysUntilTue === 0 && bTime > 23 * 60 + 59) daysUntilTue = 7;
  const deadlineBogota = new Date(Date.UTC(
    b.getUTCFullYear(),
    b.getUTCMonth(),
    b.getUTCDate() + daysUntilTue,
    23, 59, 0, 0,
  ));
  // Regresar a UTC restando el offset
  return new Date(deadlineBogota.getTime() - BOGOTA_OFFSET_HOURS * 3600_000);
}

export function formatDeadlineBogota(d: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  }).format(d);
}

export function deadlineCountdown(deadline: Date, now: Date = new Date()): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) {
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3600_000);
    if (h < 24) return `Vencida hace ${h}h`;
    return `Vencida hace ${Math.floor(h / 24)}d`;
  }
  const h = Math.floor(ms / 3600_000);
  if (h < 1) return `Vence en ${Math.max(1, Math.floor(ms / 60_000))} min`;
  if (h < 24) return `Vence en ${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `Vence en ${d}d ${rh}h`;
}

/** Para una planeación existente: ¿se creó a tiempo respecto al martes de esa semana? */
export function wasOnTime(createdAt: string | Date): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const deadline = tuesdayDeadlineFor(created);
  return created.getTime() <= deadline.getTime();
}
