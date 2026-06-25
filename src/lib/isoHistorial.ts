/**
 * Historial de versiones (snapshots) por ministerio para programaciones ISO.
 * Persistencia: localStorage. Máximo 20 versiones por ministerio.
 */

export interface IsoSnapshotEvento {
  id: string;
  fecha: string;
  titulo: string;
  hora: string | null;
  /** estacion(normKey) -> nombres concatenados */
  asignaciones: Record<string, string>;
  uniforme: string;
  observacion: string;
}

export interface IsoSnapshot {
  id: string;
  ts: number;
  etiqueta: string;
  definitiva: boolean;
  mes: string;
  liderNombre: string;
  eventos: IsoSnapshotEvento[];
}

const MAX = 20;

const keyFor = (ministerioId: string) => `iso-history:${ministerioId}`;

export function readHistorial(ministerioId: string): IsoSnapshot[] {
  try {
    const raw = localStorage.getItem(keyFor(ministerioId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(ministerioId: string, snap: Omit<IsoSnapshot, "id" | "ts">): IsoSnapshot {
  const full: IsoSnapshot = {
    ...snap,
    id: crypto.randomUUID(),
    ts: Date.now(),
  };
  const prev = readHistorial(ministerioId);
  const next = [full, ...prev].slice(0, MAX);
  localStorage.setItem(keyFor(ministerioId), JSON.stringify(next));
  return full;
}

export function deleteSnapshot(ministerioId: string, snapId: string) {
  const next = readHistorial(ministerioId).filter((s) => s.id !== snapId);
  localStorage.setItem(keyFor(ministerioId), JSON.stringify(next));
}

export function formatSnapTs(ts: number): string {
  try {
    return new Date(ts).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ts);
  }
}
