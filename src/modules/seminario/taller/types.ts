export type NivelResultado =
  | "EXCELENTE DOMINIO"
  | "MUY BUEN DOMINIO"
  | "BUEN DOMINIO"
  | "DEBE REFORZAR"
  | "NECESITA REPASAR";

export type EstadoTaller = "no_iniciado" | "en_progreso" | "completado" | "requiere_revision";

export interface SubAreaPuntaje {
  id: string;
  nombre: string;
  maxPuntos: number;
  puntosObtenidos: number;
}

export interface ResultadoTaller {
  puntajeTotal: number; // 0 - 100
  nivel: NivelResultado;
  subareas: SubAreaPuntaje[];
  fortalezas: string[];
  debeReforzar: string[];
  fechaCompletado?: string;
}

export interface RespuestaSeleccion {
  actividadId: number;
  opcionId: string;
  esCorrecta?: boolean;
  puntajeObtenido?: number;
}

export interface RespuestaAbierta {
  preguntaId: string;
  preguntaTexto: string;
  respuesta: string;
}

export interface Desafio60SegundosRespuesta {
  conceptoId: string;
  conceptoNombre: string;
  respuestaTexto: string;
  duracionSegundos?: number;
  completado: boolean;
}

export interface TallerProgressState {
  version: number;
  tallerId: string;
  personaId?: string;
  personaNombre?: string;
  estado: EstadoTaller;
  actividadActual: number; // 1 to 10 + 11 (desafío) + 12 (resultado)
  respuestas: Record<string, any>; // idPregunta -> idRespuesta o objeto
  respuestasAbiertas: Record<string, string>; // idPregunta -> texto
  desafio60s?: Desafio60SegundosRespuesta;
  resultado?: ResultadoTaller;
  updatedAt: string;
}

export interface EstudianteIntentoItem {
  id: string;
  personaId: string;
  personaNombre: string;
  personaDocumento?: string;
  estado: EstadoTaller;
  actividadActual: number;
  puntajeTotal: number;
  nivel: NivelResultado;
  fechaInicio: string;
  fechaFin?: string;
  respuestasAbiertas: Record<string, string>;
  desafio60s?: Desafio60SegundosRespuesta;
  retroalimentacionDocente?: string;
  calificacionDocente?: number;
}
