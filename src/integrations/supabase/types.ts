export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asistencia: {
        Row: {
          clasificacion: string | null
          created_at: string
          es_nuevo: boolean | null
          id: string
          persona_id: string
          presente: boolean
          servicio_id: string
        }
        Insert: {
          clasificacion?: string | null
          created_at?: string
          es_nuevo?: boolean | null
          id?: string
          persona_id: string
          presente?: boolean
          servicio_id: string
        }
        Update: {
          clasificacion?: string | null
          created_at?: string
          es_nuevo?: boolean | null
          id?: string
          persona_id?: string
          presente?: boolean
          servicio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      asistencia_materias: {
        Row: {
          created_at: string
          fecha: string
          id: string
          materia_id: string
          matricula_id: string
          presente: boolean
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          materia_id: string
          matricula_id: string
          presente?: boolean
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          materia_id?: string
          matricula_id?: string
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "asistencia_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asistencia_materias_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          activo: boolean
          created_at: string
          direccion: string | null
          id: string
          nombre: string
          sede: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
          sede?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
          sede?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          estado: string
          id: string
          imagen_url: string
          orden: number
          titulo: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          imagen_url: string
          orden?: number
          titulo: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          imagen_url?: string
          orden?: number
          titulo?: string
        }
        Relationships: []
      }
      calificaciones: {
        Row: {
          created_at: string
          id: string
          item_id: string
          matricula_id: string
          nota: number | null
          observacion: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          matricula_id: string
          nota?: number | null
          observacion?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          matricula_id?: string
          nota?: number | null
          observacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_calificables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financieras: {
        Row: {
          created_at: string
          id: string
          nombre: string
          parent_id: string | null
          tipo: Database["public"]["Enums"]["tipo_finanza"]
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          parent_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_finanza"]
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          parent_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_finanza"]
        }
        Relationships: [
          {
            foreignKeyName: "categorias_financieras_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categorias_financieras"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          codigo: string
          created_at: string
          curso_id: string | null
          fecha_emision: string
          id: string
          matricula_id: string | null
          persona_id: string
          tipo_certificado: string | null
        }
        Insert: {
          codigo?: string
          created_at?: string
          curso_id?: string | null
          fecha_emision?: string
          id?: string
          matricula_id?: string | null
          persona_id: string
          tipo_certificado?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          curso_id?: string | null
          fecha_emision?: string
          id?: string
          matricula_id?: string | null
          persona_id?: string
          tipo_certificado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: true
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      citas_consejeria: {
        Row: {
          consejero_email: string | null
          consejero_nombre: string | null
          consejero_persona_id: string
          created_at: string
          created_by: string | null
          enlace_virtual: string | null
          estado: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          lugar: string | null
          modalidad: string
          motivo_cancelacion: string | null
          motivo_categoria: string
          motivo_descripcion: string | null
          notas_admin: string | null
          requiere_consolidacion: boolean
          requiere_intercesion: boolean
          solicitante_email: string | null
          solicitante_nombre: string
          solicitante_persona_id: string | null
          solicitante_telefono: string | null
          solicitante_user_id: string | null
          updated_at: string
        }
        Insert: {
          consejero_email?: string | null
          consejero_nombre?: string | null
          consejero_persona_id: string
          created_at?: string
          created_by?: string | null
          enlace_virtual?: string | null
          estado?: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          lugar?: string | null
          modalidad: string
          motivo_cancelacion?: string | null
          motivo_categoria?: string
          motivo_descripcion?: string | null
          notas_admin?: string | null
          requiere_consolidacion?: boolean
          requiere_intercesion?: boolean
          solicitante_email?: string | null
          solicitante_nombre: string
          solicitante_persona_id?: string | null
          solicitante_telefono?: string | null
          solicitante_user_id?: string | null
          updated_at?: string
        }
        Update: {
          consejero_email?: string | null
          consejero_nombre?: string | null
          consejero_persona_id?: string
          created_at?: string
          created_by?: string | null
          enlace_virtual?: string | null
          estado?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          lugar?: string | null
          modalidad?: string
          motivo_cancelacion?: string | null
          motivo_categoria?: string
          motivo_descripcion?: string | null
          notas_admin?: string | null
          requiere_consolidacion?: boolean
          requiere_intercesion?: boolean
          solicitante_email?: string | null
          solicitante_nombre?: string
          solicitante_persona_id?: string | null
          solicitante_telefono?: string | null
          solicitante_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conceptos_pago: {
        Row: {
          created_at: string
          curso_id: string
          id: string
          monto: number
          nombre: string
        }
        Insert: {
          created_at?: string
          curso_id: string
          id?: string
          monto?: number
          nombre: string
        }
        Update: {
          created_at?: string
          curso_id?: string
          id?: string
          monto?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "conceptos_pago_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_iglesia: {
        Row: {
          ciudad: string | null
          color_primario: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          email: string | null
          horario_servicios: string | null
          id: string
          logo_url: string | null
          moneda: string | null
          nombre_iglesia: string
          pais: string | null
          pastor_principal: string | null
          senal_en_vivo_activa: boolean | null
          senal_en_vivo_url: string | null
          sitio_web: string | null
          telefono: string | null
          tema_semana_descripcion: string | null
          tema_semana_titulo: string | null
          tema_semana_url: string | null
          tesoreria_cdp_dias_mora: number
          tesoreria_cdp_tolerancia_abs: number
          tesoreria_cdp_tolerancia_pct: number
          updated_at: string
          zona_horaria: string | null
        }
        Insert: {
          ciudad?: string | null
          color_primario?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email?: string | null
          horario_servicios?: string | null
          id?: string
          logo_url?: string | null
          moneda?: string | null
          nombre_iglesia?: string
          pais?: string | null
          pastor_principal?: string | null
          senal_en_vivo_activa?: boolean | null
          senal_en_vivo_url?: string | null
          sitio_web?: string | null
          telefono?: string | null
          tema_semana_descripcion?: string | null
          tema_semana_titulo?: string | null
          tema_semana_url?: string | null
          tesoreria_cdp_dias_mora?: number
          tesoreria_cdp_tolerancia_abs?: number
          tesoreria_cdp_tolerancia_pct?: number
          updated_at?: string
          zona_horaria?: string | null
        }
        Update: {
          ciudad?: string | null
          color_primario?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          email?: string | null
          horario_servicios?: string | null
          id?: string
          logo_url?: string | null
          moneda?: string | null
          nombre_iglesia?: string
          pais?: string | null
          pastor_principal?: string | null
          senal_en_vivo_activa?: boolean | null
          senal_en_vivo_url?: string | null
          sitio_web?: string | null
          telefono?: string | null
          tema_semana_descripcion?: string | null
          tema_semana_titulo?: string | null
          tema_semana_url?: string | null
          tesoreria_cdp_dias_mora?: number
          tesoreria_cdp_tolerancia_abs?: number
          tesoreria_cdp_tolerancia_pct?: number
          updated_at?: string
          zona_horaria?: string | null
        }
        Relationships: []
      }
      consejeros_horarios: {
        Row: {
          activo: boolean
          consejero_persona_id: string
          created_at: string
          dia_semana: number
          duracion_minutos: number
          enlace_virtual: string | null
          hora_fin: string
          hora_inicio: string
          id: string
          lugar: string | null
          modalidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          consejero_persona_id: string
          created_at?: string
          dia_semana: number
          duracion_minutos?: number
          enlace_virtual?: string | null
          hora_fin: string
          hora_inicio: string
          id?: string
          lugar?: string | null
          modalidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          consejero_persona_id?: string
          created_at?: string
          dia_semana?: number
          duracion_minutos?: number
          enlace_virtual?: string | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          lugar?: string | null
          modalidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      cortes_academicos: {
        Row: {
          created_at: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          numero: number
          periodo_id: string
          porcentaje: number
        }
        Insert: {
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          numero?: number
          periodo_id: string
          porcentaje?: number
        }
        Update: {
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          numero?: number
          periodo_id?: string
          porcentaje?: number
        }
        Relationships: [
          {
            foreignKeyName: "cortes_academicos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_academicos"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          created_at: string
          cupos: number | null
          descripcion: string | null
          duracion_semanas: number | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          instructor: string | null
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cupos?: number | null
          descripcion?: string | null
          duracion_semanas?: number | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          instructor?: string | null
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cupos?: number | null
          descripcion?: string | null
          duracion_semanas?: number | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          instructor?: string | null
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      donaciones: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string | null
          fecha: string
          id: string
          metodo_pago: string | null
          monto: number
          persona_id: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto: number
          persona_id?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          persona_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      equipos_ministeriales: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          id: string
          lider_id: string | null
          lider2_id: string | null
          nombre: string
          parent_id: string | null
          red: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          lider_id?: string | null
          lider2_id?: string | null
          nombre: string
          parent_id?: string | null
          red?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          lider_id?: string | null
          lider2_id?: string | null
          nombre?: string
          parent_id?: string | null
          red?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipos_ministeriales_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_ministeriales_lider2_id_fkey"
            columns: ["lider2_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_ministeriales_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "equipos_ministeriales"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_categorias: {
        Row: {
          aforo: number | null
          created_at: string
          evento_id: string
          id: string
          inscritos: number | null
          nombre: string
        }
        Insert: {
          aforo?: number | null
          created_at?: string
          evento_id: string
          id?: string
          inscritos?: number | null
          nombre: string
        }
        Update: {
          aforo?: number | null
          created_at?: string
          evento_id?: string
          id?: string
          inscritos?: number | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_categorias_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_encargados: {
        Row: {
          created_at: string
          evento_id: string
          id: string
          persona_id: string
          rol: string | null
        }
        Insert: {
          created_at?: string
          evento_id: string
          id?: string
          persona_id: string
          rol?: string | null
        }
        Update: {
          created_at?: string
          evento_id?: string
          id?: string
          persona_id?: string
          rol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_encargados_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_encargados_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_servidores: {
        Row: {
          clasificacion: string | null
          created_at: string
          evento_id: string
          id: string
          persona_id: string
        }
        Insert: {
          clasificacion?: string | null
          created_at?: string
          evento_id: string
          id?: string
          persona_id: string
        }
        Update: {
          clasificacion?: string | null
          created_at?: string
          evento_id?: string
          id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_servidores_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_servidores_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          color: string | null
          created_at: string
          cupos: number | null
          descripcion: string | null
          estado: string
          fecha_cierre_inscripciones: string | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          lugar: string | null
          motivo_cancelacion: string | null
          nombre: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          cupos?: number | null
          descripcion?: string | null
          estado?: string
          fecha_cierre_inscripciones?: string | null
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          lugar?: string | null
          motivo_cancelacion?: string | null
          nombre: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          cupos?: number | null
          descripcion?: string | null
          estado?: string
          fecha_cierre_inscripciones?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          lugar?: string | null
          motivo_cancelacion?: string | null
          nombre?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      finanzas: {
        Row: {
          categoria_id: string | null
          categoria_nombre: string | null
          codigo_puc: string | null
          comprobante: string | null
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          metodo_pago: string | null
          monto: number
          persona_id: string | null
          registrado_por: string | null
          tipo: Database["public"]["Enums"]["tipo_finanza"]
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          categoria_nombre?: string | null
          codigo_puc?: string | null
          comprobante?: string | null
          created_at?: string
          descripcion?: string | null
          fecha: string
          id?: string
          metodo_pago?: string | null
          monto: number
          persona_id?: string | null
          registrado_por?: string | null
          tipo: Database["public"]["Enums"]["tipo_finanza"]
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          categoria_nombre?: string | null
          codigo_puc?: string | null
          comprobante?: string | null
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          persona_id?: string | null
          registrado_por?: string | null
          tipo?: Database["public"]["Enums"]["tipo_finanza"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finanzas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financieras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_miembros: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          persona_id: string
          rol: string | null
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          persona_id: string
          rol?: string | null
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          persona_id?: string
          rol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupo_miembros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_miembros_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          created_at: string
          descripcion: string | null
          dia_reunion: string | null
          estado: string
          hora_reunion: string | null
          id: string
          latitud: number | null
          lider_id: string | null
          longitud: number | null
          nombre: string
          red: string | null
          tipo: Database["public"]["Enums"]["tipo_grupo"]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          dia_reunion?: string | null
          estado?: string
          hora_reunion?: string | null
          id?: string
          latitud?: number | null
          lider_id?: string | null
          longitud?: number | null
          nombre: string
          red?: string | null
          tipo: Database["public"]["Enums"]["tipo_grupo"]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          dia_reunion?: string | null
          estado?: string
          hora_reunion?: string | null
          id?: string
          latitud?: number | null
          lider_id?: string | null
          longitud?: number | null
          nombre?: string
          red?: string | null
          tipo?: Database["public"]["Enums"]["tipo_grupo"]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      homologaciones: {
        Row: {
          calificacion_obtenida: number | null
          created_at: string
          fecha_homologacion: string
          id: string
          institucion_origen: string
          materia_id: string | null
          materia_nombre: string
          observaciones: string | null
          persona_id: string
        }
        Insert: {
          calificacion_obtenida?: number | null
          created_at?: string
          fecha_homologacion?: string
          id?: string
          institucion_origen: string
          materia_id?: string | null
          materia_nombre: string
          observaciones?: string | null
          persona_id: string
        }
        Update: {
          calificacion_obtenida?: number | null
          created_at?: string
          fecha_homologacion?: string
          id?: string
          institucion_origen?: string
          materia_id?: string | null
          materia_nombre?: string
          observaciones?: string | null
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homologaciones_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologaciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones: {
        Row: {
          confirmado: boolean | null
          created_at: string
          estado_pago: string | null
          evento_id: string
          id: string
          persona_id: string
        }
        Insert: {
          confirmado?: boolean | null
          created_at?: string
          estado_pago?: string | null
          evento_id: string
          id?: string
          persona_id: string
        }
        Update: {
          confirmado?: boolean | null
          created_at?: string
          estado_pago?: string | null
          evento_id?: string
          id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      items_calificables: {
        Row: {
          corte_id: string
          created_at: string
          es_calificable: boolean
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          materia_id: string
          nombre: string
          porcentaje: number | null
          tipo: string
          visible_estudiante: boolean
        }
        Insert: {
          corte_id: string
          created_at?: string
          es_calificable?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          materia_id: string
          nombre: string
          porcentaje?: number | null
          tipo?: string
          visible_estudiante?: boolean
        }
        Update: {
          corte_id?: string
          created_at?: string
          es_calificable?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          materia_id?: string
          nombre?: string
          porcentaje?: number | null
          tipo?: string
          visible_estudiante?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "items_calificables_corte_id_fkey"
            columns: ["corte_id"]
            isOneToOne: false
            referencedRelation: "cortes_academicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_calificables_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          alerta_inasistencias: boolean
          asistencias_minimas: number
          aula: string | null
          aula_id: string | null
          cantidad_inasistencias_alerta: number
          codigo: string | null
          created_at: string
          cupos: number | null
          descripcion: string | null
          estado: string
          hab_asistencia: boolean
          hab_auto_matricula: boolean
          hab_calificaciones: boolean
          horario: string | null
          id: string
          maestro_id: string | null
          maestro_nombre: string | null
          nombre: string
          periodo_id: string
        }
        Insert: {
          alerta_inasistencias?: boolean
          asistencias_minimas?: number
          aula?: string | null
          aula_id?: string | null
          cantidad_inasistencias_alerta?: number
          codigo?: string | null
          created_at?: string
          cupos?: number | null
          descripcion?: string | null
          estado?: string
          hab_asistencia?: boolean
          hab_auto_matricula?: boolean
          hab_calificaciones?: boolean
          horario?: string | null
          id?: string
          maestro_id?: string | null
          maestro_nombre?: string | null
          nombre: string
          periodo_id: string
        }
        Update: {
          alerta_inasistencias?: boolean
          asistencias_minimas?: number
          aula?: string | null
          aula_id?: string | null
          cantidad_inasistencias_alerta?: number
          codigo?: string | null
          created_at?: string
          cupos?: number | null
          descripcion?: string | null
          estado?: string
          hab_asistencia?: boolean
          hab_auto_matricula?: boolean
          hab_calificaciones?: boolean
          horario?: string | null
          id?: string
          maestro_id?: string | null
          maestro_nombre?: string | null
          nombre?: string
          periodo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materias_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_maestro_id_fkey"
            columns: ["maestro_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_academicos"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          created_at: string
          curso_id: string
          estado: string
          fecha_matricula: string
          id: string
          materia_id: string | null
          nota_final: number | null
          periodo_id: string | null
          persona_id: string
        }
        Insert: {
          created_at?: string
          curso_id: string
          estado?: string
          fecha_matricula?: string
          id?: string
          materia_id?: string | null
          nota_final?: number | null
          periodo_id?: string | null
          persona_id: string
        }
        Update: {
          created_at?: string
          curso_id?: string
          estado?: string
          fecha_matricula?: string
          id?: string
          materia_id?: string | null
          nota_final?: number | null
          periodo_id?: string | null
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "periodos_academicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          pref_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          pref_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          pref_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_role_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          pref_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          pref_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          pref_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      observaciones_consejeria: {
        Row: {
          cita_id: string
          created_at: string
          created_by: string | null
          estado_caso: string
          fecha_seguimiento: string | null
          id: string
          notas: string | null
          proxima_accion: string | null
          updated_at: string
        }
        Insert: {
          cita_id: string
          created_at?: string
          created_by?: string | null
          estado_caso?: string
          fecha_seguimiento?: string | null
          id?: string
          notas?: string | null
          proxima_accion?: string | null
          updated_at?: string
        }
        Update: {
          cita_id?: string
          created_at?: string
          created_by?: string | null
          estado_caso?: string
          fecha_seguimiento?: string | null
          id?: string
          notas?: string | null
          proxima_accion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observaciones_consejeria_cita_id_fkey"
            columns: ["cita_id"]
            isOneToOne: false
            referencedRelation: "citas_consejeria"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_matricula: {
        Row: {
          concepto_pago_id: string
          created_at: string
          estado: string
          fecha_pago: string | null
          id: string
          matricula_id: string
          monto_pagado: number | null
        }
        Insert: {
          concepto_pago_id: string
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          id?: string
          matricula_id: string
          monto_pagado?: number | null
        }
        Update: {
          concepto_pago_id?: string
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          id?: string
          matricula_id?: string
          monto_pagado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_matricula_concepto_pago_id_fkey"
            columns: ["concepto_pago_id"]
            isOneToOne: false
            referencedRelation: "conceptos_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_matricula_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_academicos: {
        Row: {
          created_at: string
          escuela_id: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_matricula_fin: string | null
          fecha_matricula_inicio: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escuela_id: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_matricula_fin?: string | null
          fecha_matricula_inicio?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escuela_id?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_matricula_fin?: string | null
          fecha_matricula_inicio?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_academicos_escuela_id_fkey"
            columns: ["escuela_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_procesos: {
        Row: {
          created_at: string
          estado: string
          fecha_completado: string | null
          id: string
          observacion: string | null
          persona_id: string
          proceso_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_completado?: string | null
          id?: string
          observacion?: string | null
          persona_id: string
          proceso_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_completado?: string | null
          id?: string
          observacion?: string | null
          persona_id?: string
          proceso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_procesos_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_procesos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "procesos_crecimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          apellidos: string
          created_at: string
          direccion: string | null
          documento: string | null
          email: string | null
          estado_civil: string | null
          estado_iglesia: Database["public"]["Enums"]["estado_iglesia"]
          fecha_bautismo: string | null
          fecha_conversion: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          foto_url: string | null
          grupo_id: string | null
          id: string
          invitado_por: string | null
          lider_responsable: string | null
          ministerio: string | null
          nacionalidad: string | null
          nombres: string
          observaciones: string | null
          ocupacion: string | null
          qr_code: string | null
          seguimiento_por: string | null
          sexo: string | null
          telefono: string | null
          tipo_documento: string | null
          tipo_persona: Database["public"]["Enums"]["tipo_persona"]
          tipos_persona: string[] | null
          updated_at: string
          vinculacion: string | null
          whatsapp: string | null
        }
        Insert: {
          apellidos: string
          created_at?: string
          direccion?: string | null
          documento?: string | null
          email?: string | null
          estado_civil?: string | null
          estado_iglesia?: Database["public"]["Enums"]["estado_iglesia"]
          fecha_bautismo?: string | null
          fecha_conversion?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          foto_url?: string | null
          grupo_id?: string | null
          id?: string
          invitado_por?: string | null
          lider_responsable?: string | null
          ministerio?: string | null
          nacionalidad?: string | null
          nombres: string
          observaciones?: string | null
          ocupacion?: string | null
          qr_code?: string | null
          seguimiento_por?: string | null
          sexo?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          tipo_persona?: Database["public"]["Enums"]["tipo_persona"]
          tipos_persona?: string[] | null
          updated_at?: string
          vinculacion?: string | null
          whatsapp?: string | null
        }
        Update: {
          apellidos?: string
          created_at?: string
          direccion?: string | null
          documento?: string | null
          email?: string | null
          estado_civil?: string | null
          estado_iglesia?: Database["public"]["Enums"]["estado_iglesia"]
          fecha_bautismo?: string | null
          fecha_conversion?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          foto_url?: string | null
          grupo_id?: string | null
          id?: string
          invitado_por?: string | null
          lider_responsable?: string | null
          ministerio?: string | null
          nacionalidad?: string | null
          nombres?: string
          observaciones?: string | null
          ocupacion?: string | null
          qr_code?: string | null
          seguimiento_por?: string | null
          sexo?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          tipo_persona?: Database["public"]["Enums"]["tipo_persona"]
          tipos_persona?: string[] | null
          updated_at?: string
          vinculacion?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_personas_grupo"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      peticiones_oracion: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          fecha_respuesta: string | null
          fecha_seguimiento: string | null
          id: string
          notas_seguimiento: string | null
          persona_id: string | null
          prioridad: string
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_respuesta?: string | null
          fecha_seguimiento?: string | null
          id?: string
          notas_seguimiento?: string | null
          persona_id?: string | null
          prioridad?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_respuesta?: string | null
          fecha_seguimiento?: string | null
          id?: string
          notas_seguimiento?: string | null
          persona_id?: string | null
          prioridad?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peticiones_oracion_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      planificaciones_grupo: {
        Row: {
          casa_de_paz: string | null
          created_at: string
          created_by: string | null
          evaluacion_equipo: Json | null
          fecha_ayuno: string | null
          fecha_evangelizacion: string | null
          grupo_id: string
          id: string
          lider_nombre: string
          medios_invitacion: string[] | null
          medios_recordar: string[] | null
          personas_invitadas: number | null
          red: string | null
          responsable_adoracion: string | null
          responsable_ayudas: string | null
          responsable_consolidacion: string | null
          responsable_datos: string | null
          responsable_dinamicas: string | null
          responsable_invitacion: string | null
          responsable_oracion: string | null
          responsable_predicacion: string | null
          responsable_recordar: string | null
          responsable_seguimiento: string | null
          responsable_testimonios: string | null
        }
        Insert: {
          casa_de_paz?: string | null
          created_at?: string
          created_by?: string | null
          evaluacion_equipo?: Json | null
          fecha_ayuno?: string | null
          fecha_evangelizacion?: string | null
          grupo_id: string
          id?: string
          lider_nombre: string
          medios_invitacion?: string[] | null
          medios_recordar?: string[] | null
          personas_invitadas?: number | null
          red?: string | null
          responsable_adoracion?: string | null
          responsable_ayudas?: string | null
          responsable_consolidacion?: string | null
          responsable_datos?: string | null
          responsable_dinamicas?: string | null
          responsable_invitacion?: string | null
          responsable_oracion?: string | null
          responsable_predicacion?: string | null
          responsable_recordar?: string | null
          responsable_seguimiento?: string | null
          responsable_testimonios?: string | null
        }
        Update: {
          casa_de_paz?: string | null
          created_at?: string
          created_by?: string | null
          evaluacion_equipo?: Json | null
          fecha_ayuno?: string | null
          fecha_evangelizacion?: string | null
          grupo_id?: string
          id?: string
          lider_nombre?: string
          medios_invitacion?: string[] | null
          medios_recordar?: string[] | null
          personas_invitadas?: number | null
          red?: string | null
          responsable_adoracion?: string | null
          responsable_ayudas?: string | null
          responsable_consolidacion?: string | null
          responsable_datos?: string | null
          responsable_dinamicas?: string | null
          responsable_invitacion?: string | null
          responsable_oracion?: string | null
          responsable_predicacion?: string | null
          responsable_recordar?: string | null
          responsable_seguimiento?: string | null
          responsable_testimonios?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planificaciones_grupo_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      procesos_crecimiento: {
        Row: {
          created_at: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          grupo_id: string | null
          id: string
          red: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          grupo_id?: string | null
          id?: string
          red?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          grupo_id?: string | null
          id?: string
          red?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos_academicos: {
        Row: {
          archivo_nombre: string | null
          archivo_url: string | null
          created_at: string
          descripcion: string | null
          id: string
          maestro_id: string | null
          materia_id: string
          tipo: string
          titulo: string
          url: string | null
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_url?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          maestro_id?: string | null
          materia_id: string
          tipo?: string
          titulo: string
          url?: string | null
        }
        Update: {
          archivo_nombre?: string | null
          archivo_url?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          maestro_id?: string | null
          materia_id?: string
          tipo?: string
          titulo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recursos_academicos_maestro_id_fkey"
            columns: ["maestro_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recursos_academicos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
        ]
      }
      relaciones_familiares: {
        Row: {
          created_at: string
          familiar_id: string | null
          familiar_nombre: string | null
          id: string
          parentesco: string
          persona_id: string
        }
        Insert: {
          created_at?: string
          familiar_id?: string | null
          familiar_nombre?: string | null
          id?: string
          parentesco: string
          persona_id: string
        }
        Update: {
          created_at?: string
          familiar_id?: string | null
          familiar_nombre?: string | null
          id?: string
          parentesco?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relaciones_familiares_familiar_id_fkey"
            columns: ["familiar_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relaciones_familiares_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      reporte_asistencia: {
        Row: {
          created_at: string
          es_nuevo: boolean
          id: string
          motivo_ausencia: string | null
          persona_id: string
          presente: boolean
          reporte_id: string
        }
        Insert: {
          created_at?: string
          es_nuevo?: boolean
          id?: string
          motivo_ausencia?: string | null
          persona_id: string
          presente?: boolean
          reporte_id: string
        }
        Update: {
          created_at?: string
          es_nuevo?: boolean
          id?: string
          motivo_ausencia?: string | null
          persona_id?: string
          presente?: boolean
          reporte_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporte_asistencia_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporte_asistencia_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "reportes_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      reportes_grupos: {
        Row: {
          created_at: string
          estado: string
          fecha: string
          fecha_verificacion: string | null
          grupo_id: string
          id: string
          ingreso_verificado_sobre: number | null
          lider_id: string | null
          mensaje: string
          no_realizado: boolean | null
          observaciones: string | null
          ofrenda_casa_paz: number | null
          total_reportado: number | null
          updated_at: string
          verificado_por: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha?: string
          fecha_verificacion?: string | null
          grupo_id: string
          id?: string
          ingreso_verificado_sobre?: number | null
          lider_id?: string | null
          mensaje?: string
          no_realizado?: boolean | null
          observaciones?: string | null
          ofrenda_casa_paz?: number | null
          total_reportado?: number | null
          updated_at?: string
          verificado_por?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          fecha?: string
          fecha_verificacion?: string | null
          grupo_id?: string
          id?: string
          ingreso_verificado_sobre?: number | null
          lider_id?: string | null
          mensaje?: string
          no_realizado?: boolean | null
          observaciones?: string | null
          ofrenda_casa_paz?: number | null
          total_reportado?: number | null
          updated_at?: string
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reportes_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_anuncios: {
        Row: {
          autor_user_id: string | null
          created_at: string
          id: string
          mensaje: string
          oferta_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_user_id?: string | null
          created_at?: string
          id?: string
          mensaje: string
          oferta_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_user_id?: string | null
          created_at?: string
          id?: string
          mensaje?: string
          oferta_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_anuncios_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "sem_ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_anuncios_lecturas: {
        Row: {
          anuncio_id: string
          id: string
          leido_at: string
          persona_id: string
          user_id: string | null
        }
        Insert: {
          anuncio_id: string
          id?: string
          leido_at?: string
          persona_id: string
          user_id?: string | null
        }
        Update: {
          anuncio_id?: string
          id?: string
          leido_at?: string
          persona_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_anuncios_lecturas_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "sem_anuncios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_anuncios_lecturas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_asistencias: {
        Row: {
          created_at: string
          estado: string
          fecha: string
          id: string
          inscripcion_materia_id: string
          observacion: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha: string
          id?: string
          inscripcion_materia_id: string
          observacion?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          inscripcion_materia_id?: string
          observacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_asistencias_inscripcion_materia_id_fkey"
            columns: ["inscripcion_materia_id"]
            isOneToOne: false
            referencedRelation: "sem_inscripcion_materias"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          inscripcion_id: string | null
          materia_id: string | null
          oferta_id: string | null
          persona_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          inscripcion_id?: string | null
          materia_id?: string | null
          oferta_id?: string | null
          persona_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          inscripcion_id?: string | null
          materia_id?: string | null
          oferta_id?: string | null
          persona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_audit_log_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: false
            referencedRelation: "sem_inscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_audit_log_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_audit_log_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "sem_ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_audit_log_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_calificaciones: {
        Row: {
          created_at: string
          evaluacion_id: string
          id: string
          inscripcion_materia_id: string
          nota: number
          observacion: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluacion_id: string
          id?: string
          inscripcion_materia_id: string
          nota: number
          observacion?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluacion_id?: string
          id?: string
          inscripcion_materia_id?: string
          nota?: number
          observacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_calificaciones_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "sem_evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_calificaciones_inscripcion_materia_id_fkey"
            columns: ["inscripcion_materia_id"]
            isOneToOne: false
            referencedRelation: "sem_inscripcion_materias"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_entregas: {
        Row: {
          archivo_nombre: string | null
          archivo_path: string | null
          archivo_tamano: number | null
          archivo_tipo: string | null
          archivo_url: string | null
          calificado_por: string | null
          comentario: string | null
          created_at: string
          estado: string
          evaluacion_id: string
          id: string
          inscripcion_materia_id: string
          persona_id: string
          retroalimentacion: string | null
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_path?: string | null
          archivo_tamano?: number | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          calificado_por?: string | null
          comentario?: string | null
          created_at?: string
          estado?: string
          evaluacion_id: string
          id?: string
          inscripcion_materia_id: string
          persona_id: string
          retroalimentacion?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          archivo_nombre?: string | null
          archivo_path?: string | null
          archivo_tamano?: number | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          calificado_por?: string | null
          comentario?: string | null
          created_at?: string
          estado?: string
          evaluacion_id?: string
          id?: string
          inscripcion_materia_id?: string
          persona_id?: string
          retroalimentacion?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sem_entregas_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "sem_evaluaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_entregas_inscripcion_materia_id_fkey"
            columns: ["inscripcion_materia_id"]
            isOneToOne: false
            referencedRelation: "sem_inscripcion_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_entregas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_evaluaciones: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha: string | null
          id: string
          nombre: string
          oferta_id: string
          peso: number
          publicada: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha?: string | null
          id?: string
          nombre: string
          oferta_id: string
          peso?: number
          publicada?: boolean
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha?: string | null
          id?: string
          nombre?: string
          oferta_id?: string
          peso?: number
          publicada?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_evaluaciones_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "sem_ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_foro_mensajes: {
        Row: {
          autor_avatar: string | null
          autor_nombre: string | null
          autor_user_id: string | null
          created_at: string
          foro_id: string
          id: string
          mensaje: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          autor_avatar?: string | null
          autor_nombre?: string | null
          autor_user_id?: string | null
          created_at?: string
          foro_id: string
          id?: string
          mensaje: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          autor_avatar?: string | null
          autor_nombre?: string | null
          autor_user_id?: string | null
          created_at?: string
          foro_id?: string
          id?: string
          mensaje?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_foro_mensajes_foro_id_fkey"
            columns: ["foro_id"]
            isOneToOne: false
            referencedRelation: "sem_foros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_foro_mensajes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sem_foro_mensajes"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_foros: {
        Row: {
          autor_nombre: string | null
          autor_user_id: string | null
          cerrado: boolean
          created_at: string
          descripcion: string | null
          fijado: boolean
          id: string
          oferta_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_nombre?: string | null
          autor_user_id?: string | null
          cerrado?: boolean
          created_at?: string
          descripcion?: string | null
          fijado?: boolean
          id?: string
          oferta_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_nombre?: string | null
          autor_user_id?: string | null
          cerrado?: boolean
          created_at?: string
          descripcion?: string | null
          fijado?: boolean
          id?: string
          oferta_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_foros_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "sem_ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_inscripcion_materias: {
        Row: {
          created_at: string
          estado: string
          id: string
          inscripcion_id: string
          materia_id: string
          nota_final: number | null
          oferta_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          inscripcion_id: string
          materia_id: string
          nota_final?: number | null
          oferta_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          inscripcion_id?: string
          materia_id?: string
          nota_final?: number | null
          oferta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_inscripcion_materias_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: false
            referencedRelation: "sem_inscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_inscripcion_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_inscripcion_materias_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "sem_ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_inscripciones: {
        Row: {
          created_at: string
          estado: string
          id: string
          observaciones: string | null
          periodo_id: string
          persona_id: string
          programa_id: string
          promedio_acumulado: number | null
          semestre_actual: number | null
          total_creditos_aprobados: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          observaciones?: string | null
          periodo_id: string
          persona_id: string
          programa_id: string
          promedio_acumulado?: number | null
          semestre_actual?: number | null
          total_creditos_aprobados?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          observaciones?: string | null
          periodo_id?: string
          persona_id?: string
          programa_id?: string
          promedio_acumulado?: number | null
          semestre_actual?: number | null
          total_creditos_aprobados?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_inscripciones_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "sem_periodos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_inscripciones_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_inscripciones_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "sem_programas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_materia_prerequisitos: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          prerequisito_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          prerequisito_id: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          prerequisito_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_materia_prerequisitos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_materia_prerequisitos_prerequisito_id_fkey"
            columns: ["prerequisito_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_materias: {
        Row: {
          activo: boolean
          area: string | null
          codigo: string
          color: string | null
          created_at: string
          creditos: number
          descripcion: string | null
          id: string
          intensidad_horaria: number | null
          nombre: string
          programa_id: string
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          activo?: boolean
          area?: string | null
          codigo: string
          color?: string | null
          created_at?: string
          creditos?: number
          descripcion?: string | null
          id?: string
          intensidad_horaria?: number | null
          nombre: string
          programa_id: string
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          activo?: boolean
          area?: string | null
          codigo?: string
          color?: string | null
          created_at?: string
          creditos?: number
          descripcion?: string | null
          id?: string
          intensidad_horaria?: number | null
          nombre?: string
          programa_id?: string
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_materias_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "sem_programas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_ofertas: {
        Row: {
          aula: string | null
          created_at: string
          cupos: number | null
          docente_nombre: string | null
          docente_persona_id: string | null
          estado: string
          horario: string | null
          id: string
          materia_id: string
          modalidad: string | null
          periodo_id: string
          updated_at: string
          zoom_link: string | null
          zoom_meeting_id: string | null
          zoom_password: string | null
        }
        Insert: {
          aula?: string | null
          created_at?: string
          cupos?: number | null
          docente_nombre?: string | null
          docente_persona_id?: string | null
          estado?: string
          horario?: string | null
          id?: string
          materia_id: string
          modalidad?: string | null
          periodo_id: string
          updated_at?: string
          zoom_link?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
        }
        Update: {
          aula?: string | null
          created_at?: string
          cupos?: number | null
          docente_nombre?: string | null
          docente_persona_id?: string | null
          estado?: string
          horario?: string | null
          id?: string
          materia_id?: string
          modalidad?: string | null
          periodo_id?: string
          updated_at?: string
          zoom_link?: string | null
          zoom_meeting_id?: string | null
          zoom_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_ofertas_docente_persona_id_fkey"
            columns: ["docente_persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_ofertas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_ofertas_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "sem_periodos"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_pagos_inscripcion: {
        Row: {
          comprobante_url: string | null
          concepto: string
          created_at: string
          estado: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          inscripcion_id: string
          metodo_pago: string | null
          updated_at: string
          valor: number
          valor_pagado: number | null
        }
        Insert: {
          comprobante_url?: string | null
          concepto: string
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          inscripcion_id: string
          metodo_pago?: string | null
          updated_at?: string
          valor: number
          valor_pagado?: number | null
        }
        Update: {
          comprobante_url?: string | null
          concepto?: string
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          inscripcion_id?: string
          metodo_pago?: string | null
          updated_at?: string
          valor?: number
          valor_pagado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_pagos_inscripcion_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: false
            referencedRelation: "sem_inscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_pensum_materias: {
        Row: {
          created_at: string
          id: string
          materia_id: string
          obligatoria: boolean
          orden: number | null
          semestre_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          materia_id: string
          obligatoria?: boolean
          orden?: number | null
          semestre_id: string
        }
        Update: {
          created_at?: string
          id?: string
          materia_id?: string
          obligatoria?: boolean
          orden?: number | null
          semestre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_pensum_materias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_pensum_materias_semestre_id_fkey"
            columns: ["semestre_id"]
            isOneToOne: false
            referencedRelation: "sem_pensum_semestres"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_pensum_semestres: {
        Row: {
          created_at: string
          creditos_totales: number | null
          id: string
          nombre: string
          numero: number
          programa_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creditos_totales?: number | null
          id?: string
          nombre: string
          numero: number
          programa_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creditos_totales?: number | null
          id?: string
          nombre?: string
          numero?: number
          programa_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_pensum_semestres_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "sem_programas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_periodos: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          fecha_fin: string
          fecha_fin_inscripcion: string | null
          fecha_inicio: string
          fecha_inicio_inscripcion: string | null
          id: string
          nombre: string
          programa_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          fecha_fin: string
          fecha_fin_inscripcion?: string | null
          fecha_inicio: string
          fecha_inicio_inscripcion?: string | null
          id?: string
          nombre: string
          programa_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          fecha_fin?: string
          fecha_fin_inscripcion?: string | null
          fecha_inicio?: string
          fecha_inicio_inscripcion?: string | null
          id?: string
          nombre?: string
          programa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sem_periodos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "sem_programas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_programas: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          duracion_anios: number | null
          id: string
          modalidad: string | null
          nombre: string
          total_creditos: number | null
          total_semestres: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          duracion_anios?: number | null
          id?: string
          modalidad?: string | null
          nombre: string
          total_creditos?: number | null
          total_semestres?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          duracion_anios?: number | null
          id?: string
          modalidad?: string | null
          nombre?: string
          total_creditos?: number | null
          total_semestres?: number
          updated_at?: string
        }
        Relationships: []
      }
      sem_recursos: {
        Row: {
          autor: string | null
          created_at: string
          descripcion: string | null
          id: string
          materia_id: string | null
          periodo_id: string | null
          programa_id: string | null
          publicado: boolean
          storage_path: string | null
          tipo: string
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          materia_id?: string | null
          periodo_id?: string | null
          programa_id?: string | null
          publicado?: boolean
          storage_path?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          materia_id?: string | null
          periodo_id?: string | null
          programa_id?: string | null
          publicado?: boolean
          storage_path?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_recursos_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "sem_materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_recursos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "sem_periodos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sem_recursos_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "sem_programas"
            referencedColumns: ["id"]
          },
        ]
      }
      sem_zoom_config: {
        Row: {
          account_id_masked: string | null
          created_at: string
          default_duration_minutes: number
          host_email: string | null
          id: string
          last_validation_at: string | null
          last_validation_message: string | null
          last_validation_status: string | null
          mode: string
          singleton: boolean
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          account_id_masked?: string | null
          created_at?: string
          default_duration_minutes?: number
          host_email?: string | null
          id?: string
          last_validation_at?: string | null
          last_validation_message?: string | null
          last_validation_status?: string | null
          mode?: string
          singleton?: boolean
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          account_id_masked?: string | null
          created_at?: string
          default_duration_minutes?: number
          host_email?: string | null
          id?: string
          last_validation_at?: string | null
          last_validation_message?: string | null
          last_validation_status?: string | null
          mode?: string
          singleton?: boolean
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: []
      }
      sem_zoom_sesiones: {
        Row: {
          created_at: string
          duration_minutes: number | null
          grabacion_url: string | null
          id: string
          join_url: string | null
          meeting_id: string | null
          oferta_id: string
          password: string | null
          raw: Json | null
          realizada: boolean
          start_time: string | null
          start_url: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          grabacion_url?: string | null
          id?: string
          join_url?: string | null
          meeting_id?: string | null
          oferta_id: string
          password?: string | null
          raw?: Json | null
          realizada?: boolean
          start_time?: string | null
          start_url?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          grabacion_url?: string | null
          id?: string
          join_url?: string | null
          meeting_id?: string | null
          oferta_id?: string
          password?: string | null
          raw?: Json | null
          realizada?: boolean
          start_time?: string | null
          start_url?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sem_zoom_sesiones_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "sem_ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios: {
        Row: {
          aforo: number | null
          created_at: string
          descripcion: string | null
          dia_reunion: string | null
          estado: string
          fecha: string
          habilitado_reserva: boolean | null
          hora: string | null
          id: string
          lugar: string | null
          nombre: string
          predicador: string | null
          sede: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"]
          updated_at: string
        }
        Insert: {
          aforo?: number | null
          created_at?: string
          descripcion?: string | null
          dia_reunion?: string | null
          estado?: string
          fecha: string
          habilitado_reserva?: boolean | null
          hora?: string | null
          id?: string
          lugar?: string | null
          nombre: string
          predicador?: string | null
          sede?: string | null
          tipo: Database["public"]["Enums"]["tipo_servicio"]
          updated_at?: string
        }
        Update: {
          aforo?: number | null
          created_at?: string
          descripcion?: string | null
          dia_reunion?: string | null
          estado?: string
          fecha?: string
          habilitado_reserva?: boolean | null
          hora?: string | null
          id?: string
          lugar?: string | null
          nombre?: string
          predicador?: string | null
          sede?: string | null
          tipo?: Database["public"]["Enums"]["tipo_servicio"]
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tesoreria_consignacion_historial: {
        Row: {
          cambiado_por: string | null
          consignacion_semanal_id: string | null
          created_at: string
          fecha_consignacion: string | null
          id: string
          motivo_cambio: string | null
          registro_id: string | null
          soporte_url: string | null
          valor_consignado: number | null
        }
        Insert: {
          cambiado_por?: string | null
          consignacion_semanal_id?: string | null
          created_at?: string
          fecha_consignacion?: string | null
          id?: string
          motivo_cambio?: string | null
          registro_id?: string | null
          soporte_url?: string | null
          valor_consignado?: number | null
        }
        Update: {
          cambiado_por?: string | null
          consignacion_semanal_id?: string | null
          created_at?: string
          fecha_consignacion?: string | null
          id?: string
          motivo_cambio?: string | null
          registro_id?: string | null
          soporte_url?: string | null
          valor_consignado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tesoreria_consignacion_historial_consignacion_semanal_id_fkey"
            columns: ["consignacion_semanal_id"]
            isOneToOne: false
            referencedRelation: "tesoreria_consignacion_semanal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tesoreria_consignacion_historial_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "tesoreria_ofrendas_cdp"
            referencedColumns: ["id"]
          },
        ]
      }
      tesoreria_consignacion_semanal: {
        Row: {
          consignacion_completada: boolean
          created_at: string
          fecha_consignacion: string | null
          id: string
          observacion: string | null
          registrado_por: string | null
          semana_fin: string
          semana_inicio: string
          soporte_consignacion_url: string | null
          updated_at: string
          valor_consignado: number
          valor_total_entregado: number
        }
        Insert: {
          consignacion_completada?: boolean
          created_at?: string
          fecha_consignacion?: string | null
          id?: string
          observacion?: string | null
          registrado_por?: string | null
          semana_fin: string
          semana_inicio: string
          soporte_consignacion_url?: string | null
          updated_at?: string
          valor_consignado?: number
          valor_total_entregado?: number
        }
        Update: {
          consignacion_completada?: boolean
          created_at?: string
          fecha_consignacion?: string | null
          id?: string
          observacion?: string | null
          registrado_por?: string | null
          semana_fin?: string
          semana_inicio?: string
          soporte_consignacion_url?: string | null
          updated_at?: string
          valor_consignado?: number
          valor_total_entregado?: number
        }
        Relationships: []
      }
      tesoreria_ofrendas_cdp: {
        Row: {
          consignacion_completada: boolean
          created_at: string
          fecha_consignacion: string | null
          fecha_entrega: string | null
          grupo_id: string
          id: string
          observacion: string | null
          registrado_por: string | null
          semana_fin: string
          semana_inicio: string
          soporte_consignacion_url: string | null
          updated_at: string
          valor_consignado: number
          valor_entregado: number
          valor_reportado_override: number | null
        }
        Insert: {
          consignacion_completada?: boolean
          created_at?: string
          fecha_consignacion?: string | null
          fecha_entrega?: string | null
          grupo_id: string
          id?: string
          observacion?: string | null
          registrado_por?: string | null
          semana_fin: string
          semana_inicio: string
          soporte_consignacion_url?: string | null
          updated_at?: string
          valor_consignado?: number
          valor_entregado?: number
          valor_reportado_override?: number | null
        }
        Update: {
          consignacion_completada?: boolean
          created_at?: string
          fecha_consignacion?: string | null
          fecha_entrega?: string | null
          grupo_id?: string
          id?: string
          observacion?: string | null
          registrado_por?: string | null
          semana_fin?: string
          semana_inicio?: string
          soporte_consignacion_url?: string | null
          updated_at?: string
          valor_consignado?: number
          valor_entregado?: number
          valor_reportado_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tesoreria_ofrendas_cdp_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos_iglesia: {
        Row: {
          created_at: string
          estado: string
          id: string
          orden: number
          titulo: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          orden?: number
          titulo: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          orden?: number
          titulo?: string
          youtube_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_users_for_export: {
        Args: never
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      sem_calcular_promedio: {
        Args: { _persona_id: string; _programa_id: string }
        Returns: number
      }
      sem_estudiante_tiene_mora: {
        Args: { _persona_id: string }
        Returns: boolean
      }
      sem_is_staff: { Args: { _uid: string }; Returns: boolean }
      sem_is_tesoreria: { Args: { _uid: string }; Returns: boolean }
      sem_puede_inscribir: {
        Args: { _materia_id: string; _persona_id: string }
        Returns: boolean
      }
      sem_recalcular_inscripcion: {
        Args: { _persona_id: string; _programa_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "pastor"
        | "lider"
        | "secretaria"
        | "tesoreria"
        | "maestro"
        | "consulta"
        | "super_admin"
        | "consolidador_lider"
        | "consolidador"
        | "lider_intercesion"
        | "lider_red"
        | "lider_casa_paz"
        | "seminario_admin"
        | "seminario_docente"
        | "seminario_estudiante"
      estado_iglesia: "Activo" | "Inactivo" | "En proceso"
      tipo_finanza: "Ingreso" | "Gasto"
      tipo_grupo:
        | "Células"
        | "Jóvenes"
        | "Mujeres"
        | "Hombres"
        | "Niños"
        | "Alabanza"
        | "Ujieres"
        | "Liderazgo"
        | "Discipulado"
        | "Casas de paz"
        | "Grupos encuentro"
      tipo_persona:
        | "Miembro"
        | "Visitante"
        | "Líder"
        | "Servidor"
        | "CDP"
        | "Iglesia Virtual"
        | "Estudiante Seminario"
        | "Discípulo"
        | "Maestro Seminario"
        | "Miembro No Activo"
        | "Líder Casa de Paz"
        | "Líder de Red"
        | "Mentor"
        | "Pastor Principal"
        | "Maestro Discipulado"
      tipo_servicio:
        | "Culto general"
        | "Oración"
        | "Reunión de líderes"
        | "Escuela bíblica"
        | "Vigilia"
        | "Servicio especial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "pastor",
        "lider",
        "secretaria",
        "tesoreria",
        "maestro",
        "consulta",
        "super_admin",
        "consolidador_lider",
        "consolidador",
        "lider_intercesion",
        "lider_red",
        "lider_casa_paz",
        "seminario_admin",
        "seminario_docente",
        "seminario_estudiante",
      ],
      estado_iglesia: ["Activo", "Inactivo", "En proceso"],
      tipo_finanza: ["Ingreso", "Gasto"],
      tipo_grupo: [
        "Células",
        "Jóvenes",
        "Mujeres",
        "Hombres",
        "Niños",
        "Alabanza",
        "Ujieres",
        "Liderazgo",
        "Discipulado",
        "Casas de paz",
        "Grupos encuentro",
      ],
      tipo_persona: [
        "Miembro",
        "Visitante",
        "Líder",
        "Servidor",
        "CDP",
        "Iglesia Virtual",
        "Estudiante Seminario",
        "Discípulo",
        "Maestro Seminario",
        "Miembro No Activo",
        "Líder Casa de Paz",
        "Líder de Red",
        "Mentor",
        "Pastor Principal",
        "Maestro Discipulado",
      ],
      tipo_servicio: [
        "Culto general",
        "Oración",
        "Reunión de líderes",
        "Escuela bíblica",
        "Vigilia",
        "Servicio especial",
      ],
    },
  },
} as const
