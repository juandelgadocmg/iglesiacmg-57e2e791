export interface Discipulo {
  id: string;
  full_name: string;
  telefono?: string;
  casa_de_paz_id: string | null;
  lider_id: string | null;
  status: 'Activo' | 'En pausa' | 'Completado' | string;
  start_date: string | null;
  notes: string | null;
  last_update_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscipuloVisita {
  id: string;
  discipulo_id: string;
  lider_id: string;
  fecha: string;
  hora: string | null;
  lugar: string;
  direccion: string | null;
  realizada: boolean;
  ungio_casa: 'Sí' | 'No' | 'No aplica' | string;
  oro: boolean;
  enseno: boolean;
  observaciones: string | null;
  proximo_seguimiento: string | null;
  compromiso: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscipuloActividad {
  id: string;
  discipulo_id: string;
  lider_id: string;
  tipo_actividad: string;
  fecha: string;
  hora: string | null;
  descripcion: string;
  referencia_id: string | null;
  created_at: string;
}

export interface DiscipuladoStats {
  totalDiscipulos: number;
  visitados: number;
  ensenados: number;
  orados: number;
  enTresSemanas: number;
  enRetiro: number;
  recuperados: number;
  consolidados: number;
}
