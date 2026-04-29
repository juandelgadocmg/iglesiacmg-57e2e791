const normalizeRole = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const ACADEMIA_MAESTRO_ROLES = [
  "Maestro Seminario",
  "Maestro Discipulado",
  "Maestro",
  "Mentor",
  "Pastor Principal",
  "Líder de Red",
];

const ACADEMIA_MAESTRO_ROLE_KEYS = new Set(ACADEMIA_MAESTRO_ROLES.map(normalizeRole));

export const getPersonaTipos = (persona: any): string[] => {
  const tipos = [persona?.tipo_persona, ...(Array.isArray(persona?.tipos_persona) ? persona.tipos_persona : [])]
    .filter(Boolean)
    .map((tipo: string) => String(tipo).trim())
    .filter(Boolean);

  return [...new Set(tipos)];
};

export const isAcademiaMaestro = (persona: any) =>
  getPersonaTipos(persona).some((tipo) => ACADEMIA_MAESTRO_ROLE_KEYS.has(normalizeRole(tipo)));

export const getAcademiaMaestroTipo = (persona: any) =>
  getPersonaTipos(persona).find((tipo) => ACADEMIA_MAESTRO_ROLE_KEYS.has(normalizeRole(tipo))) || persona?.tipo_persona || "Maestro";