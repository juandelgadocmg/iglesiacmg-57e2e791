/**
 * Plantillas ISO de programación por ministerio.
 * Cada plantilla define el encabezado normativo y las "estaciones" (cargos)
 * que conforman las columnas del formato.
 *
 * Piloto inicial: Afirmación y Comunicaciones.
 * Próximos: Danzas, Diaconado, FEL, Intercesión, Kabod, Kings Army.
 */

export interface IsoMinisterioTemplate {
  /** Nombre del ministerio en `prog_ministerios.nombre` (case-insensitive match). */
  nombreMinisterio: string;
  /** Código normativo ISO (ej. FO-EC-PA01). */
  codigo: string;
  /** Versión del formato. */
  version: string;
  /** Fecha de emisión del formato (dd/mm/aaaa). */
  fechaVigencia: string;
  /** Título grande del PDF. */
  titulo: string;
  /** Estaciones/columnas del cuadro (en orden). Se crean como cargos del ministerio. */
  estaciones: string[];
  /** Texto del bloque "Importante" (puede ser vacío). */
  importante?: string;
  /** Responsabilidades / nota al pie. */
  responsabilidades: string;
  /** Firmas (Elaborado / Revisado / Autorizado). */
  firmas: {
    elaboradoPor: { nombre: string; cargo: string };
    revisadoPor: { nombre: string; cargo: string };
    autorizadoPor: { nombre: string; cargo: string };
  };
}

const FIRMAS_DEFAULT: IsoMinisterioTemplate["firmas"] = {
  elaboradoPor: { nombre: "Edith Carolina Niño Martinez", cargo: "Dirección de Procesos" },
  revisadoPor: { nombre: "Tania Alexandra Grimaldos B", cargo: "Pastora" },
  autorizadoPor: { nombre: "Carlos Alberto Delgado A.", cargo: "Pastor" },
};

const RESPONSABILIDADES_DEFAULT =
  "Para poder servir se debe cumplir con todas las Responsabilidades: " +
  "*Miembro activo de una casa de paz, * haber terminado las escuelas, " +
  "*asistir a los servicios básicos de la Iglesia: Viernes y Domingo. " +
  "*Ser fiel en los Diezmos y Ofrendas *asistir a la reunión de Liderazgo. " +
  "NOTA: Quien no pueda asistir debe buscar quien lo reemplace e informar al Líder de ministerio.";

export const ISO_TEMPLATES: IsoMinisterioTemplate[] = [
  {
    nombreMinisterio: "Afirmación",
    codigo: "FO-EC-PA01",
    version: "01",
    fechaVigencia: "18/07/2024",
    titulo: "FORMATO PROGRAMACIÓN MINISTERIO AFIRMACIÓN",
    estaciones: [
      "Aseo",
      "Devocional",
      "Lateral Derecho",
      "Lateral Derecho - Centro",
      "Centro",
      "Lateral Izquierdo",
      "Lateral Izquierdo - Centro",
    ],
    importante:
      "Todo el ministerio debe asistir con el uniforme asignado sin excusas. " +
      "Hora de llegada viernes 6:30 pm (máx. 6:40 pm). Hora de llegada domingo 7:00 am (máx. 7:10 am). " +
      "Quien llegue después de la hora estipulada no está habilitado para servir ese día. " +
      "Recordar sentarse durante el servicio en la 4, 5 y 6 fila detrás de la alabanza.",
    responsabilidades: RESPONSABILIDADES_DEFAULT,
    firmas: FIRMAS_DEFAULT,
  },
  {
    nombreMinisterio: "Comunicaciones",
    codigo: "FO-EC-PC01",
    version: "01",
    fechaVigencia: "11/07/2024",
    titulo: "FORMATO PROGRAMACIÓN MINISTERIO COMUNICACIONES",
    estaciones: [
      "Aseo Oficina",
      "Transmisión",
      "Apoyo a Transmisión",
      "Cámara 1 Alabanza",
      "Cámara 2 Alabanza",
      "Cámara 1 Prédica",
      "Cámara 2 Prédica",
      "Fotografía",
    ],
    importante:
      "Transmisión: iniciar antes del servicio, colocar canciones y versículos en el Open, supervisar videobeam. " +
      "Apoyo: pendiente del zello y de los comentarios en Live (responder por CMG). " +
      "Cámaras: buenos planos, foco en la prédica, montar/desmontar cámaras al inicio/final. " +
      "Fotografía: imagen de la iglesia, fotos que ministren desde la entrada hasta la salida.",
    responsabilidades: RESPONSABILIDADES_DEFAULT,
    firmas: FIRMAS_DEFAULT,
  },
];

/** Normaliza un nombre para comparar (minúsculas, sin tildes ni espacios extra). */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Busca la plantilla ISO de un ministerio por nombre. */
export function findIsoTemplate(nombreMinisterio: string): IsoMinisterioTemplate | null {
  const n = norm(nombreMinisterio);
  return ISO_TEMPLATES.find((t) => norm(t.nombreMinisterio) === n) || null;
}
