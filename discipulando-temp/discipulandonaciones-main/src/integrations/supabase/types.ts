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
      casas_de_paz: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          red_id: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          red_id?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          red_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "casas_de_paz_red_id_fkey"
            columns: ["red_id"]
            isOneToOne: false
            referencedRelation: "redes"
            referencedColumns: ["id"]
          },
        ]
      }
      discipulos: {
        Row: {
          casa_de_paz_id: string | null
          created_at: string
          full_name: string
          id: string
          last_update_at: string | null
          lider_id: string | null
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          casa_de_paz_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          last_update_at?: string | null
          lider_id?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          casa_de_paz_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_update_at?: string | null
          lider_id?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipulos_casa_de_paz_id_fkey"
            columns: ["casa_de_paz_id"]
            isOneToOne: false
            referencedRelation: "casas_de_paz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipulos_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_discipulado: {
        Row: {
          code: string
          label: string
          order_num: number
        }
        Insert: {
          code: string
          label: string
          order_num: number
        }
        Update: {
          code?: string
          label?: string
          order_num?: number
        }
        Relationships: []
      }
      leaders: {
        Row: {
          casa_de_paz_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          update_token: string | null
          updated_at: string
        }
        Insert: {
          casa_de_paz_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          update_token?: string | null
          updated_at?: string
        }
        Update: {
          casa_de_paz_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          update_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaders_casa_de_paz_id_fkey"
            columns: ["casa_de_paz_id"]
            isOneToOne: false
            referencedRelation: "casas_de_paz"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensuales: {
        Row: {
          casa_de_paz_id: string | null
          created_at: string
          created_by: string | null
          discipulo_id: string | null
          id: string
          lider_id: string | null
          meta_etapas: number
          meta_seguimientos: number
          month_key: string
          notes: string | null
          scope_type: string
          updated_at: string
        }
        Insert: {
          casa_de_paz_id?: string | null
          created_at?: string
          created_by?: string | null
          discipulo_id?: string | null
          id?: string
          lider_id?: string | null
          meta_etapas?: number
          meta_seguimientos?: number
          month_key: string
          notes?: string | null
          scope_type: string
          updated_at?: string
        }
        Update: {
          casa_de_paz_id?: string | null
          created_at?: string
          created_by?: string | null
          discipulo_id?: string | null
          id?: string
          lider_id?: string | null
          meta_etapas?: number
          meta_seguimientos?: number
          month_key?: string
          notes?: string | null
          scope_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_mensuales_casa_de_paz_id_fkey"
            columns: ["casa_de_paz_id"]
            isOneToOne: false
            referencedRelation: "casas_de_paz"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_mensuales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_mensuales_discipulo_id_fkey"
            columns: ["discipulo_id"]
            isOneToOne: false
            referencedRelation: "discipulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_mensuales_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      progreso_discipulo: {
        Row: {
          completed: boolean
          completed_at: string | null
          discipulo_id: string
          etapa_code: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          discipulo_id: string
          etapa_code: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          discipulo_id?: string
          etapa_code?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progreso_discipulo_discipulo_id_fkey"
            columns: ["discipulo_id"]
            isOneToOne: false
            referencedRelation: "discipulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_discipulo_etapa_code_fkey"
            columns: ["etapa_code"]
            isOneToOne: false
            referencedRelation: "etapas_discipulado"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "progreso_discipulo_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      redes: {
        Row: {
          created_at: string
          id: string
          lider_red: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lider_red?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lider_red?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      seguimientos: {
        Row: {
          asistencia: string | null
          created_at: string
          created_by: string | null
          discipulo_id: string
          fecha: string
          id: string
          peticiones_oracion: string | null
          proximos_pasos: string | null
          resumen: string
        }
        Insert: {
          asistencia?: string | null
          created_at?: string
          created_by?: string | null
          discipulo_id: string
          fecha?: string
          id?: string
          peticiones_oracion?: string | null
          proximos_pasos?: string | null
          resumen: string
        }
        Update: {
          asistencia?: string | null
          created_at?: string
          created_by?: string | null
          discipulo_id?: string
          fecha?: string
          id?: string
          peticiones_oracion?: string | null
          proximos_pasos?: string | null
          resumen?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguimientos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguimientos_discipulo_id_fkey"
            columns: ["discipulo_id"]
            isOneToOne: false
            referencedRelation: "discipulos"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "LIDER"
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
      app_role: ["ADMIN", "LIDER"],
    },
  },
} as const
