// Helpers de formato compartidos para el módulo Seminario.
// Centralizar aquí garantiza que la tabla de estudiantes y el combobox
// muestren EXACTAMENTE el mismo texto en el badge "Ya inscrito".

export function periodoLabel(periodo?: { nombre?: string | null; codigo?: string | null } | null): string {
  return periodo?.nombre || periodo?.codigo || "—";
}

export function yaInscritoBadge(periodo?: { nombre?: string | null; codigo?: string | null } | null): string {
  return `Ya inscrito · ${periodoLabel(periodo)}`;
}

export function personaFullName(p?: { nombres?: string | null; apellidos?: string | null } | null): string {
  return `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim();
}
