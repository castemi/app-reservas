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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string
          created_at: string
          estado: Database["public"]["Enums"]["appointment_status"]
          fecha_hora: string
          id: string
          service_id: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["appointment_status"]
          fecha_hora: string
          id?: string
          service_id: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["appointment_status"]
          fecha_hora?: string
          id?: string
          service_id?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          created_at: string | null
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          motivo: string | null
          service_id: string | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          motivo?: string | null
          service_id?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          motivo?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          background_url: string | null
          created_at: string
          dias_laborables: number[]
          direccion: string
          email_contacto: string
          horario_apertura: string
          horario_cierre: string
          id: string
          instagram_url: string | null
          logo_url: string | null
          nombre: string
          stripe_account_id: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          telefono: string
          tipo_negocio: string | null
          updated_at: string
        }
        Insert: {
          background_url?: string | null
          created_at?: string
          dias_laborables?: number[]
          direccion?: string
          email_contacto?: string
          horario_apertura?: string
          horario_cierre?: string
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          nombre?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          telefono?: string
          tipo_negocio?: string | null
          updated_at?: string
        }
        Update: {
          background_url?: string | null
          created_at?: string
          dias_laborables?: number[]
          direccion?: string
          email_contacto?: string
          horario_apertura?: string
          horario_cierre?: string
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          nombre?: string
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          telefono?: string
          tipo_negocio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      day_schedules: {
        Row: {
          activo: boolean
          created_at: string | null
          day_of_week: number
          hora_fin: string
          hora_inicio: string
          id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          day_of_week: number
          hora_fin: string
          hora_inicio: string
          id?: string
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          day_of_week?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          asunto: string
          created_at: string | null
          dias_post_cita: number | null
          estado: string
          fecha_programada: string | null
          id: string
          mensaje: string
          target: string
          tipo: string
        }
        Insert: {
          asunto: string
          created_at?: string | null
          dias_post_cita?: number | null
          estado?: string
          fecha_programada?: string | null
          id?: string
          mensaje: string
          target?: string
          tipo: string
        }
        Update: {
          asunto?: string
          created_at?: string | null
          dias_post_cita?: number | null
          estado?: string
          fecha_programada?: string | null
          id?: string
          mensaje?: string
          target?: string
          tipo?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          created_at: string
          id: string
          leida: boolean
          mensaje: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nombre?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          created_at: string | null
          dias_post_cita: number | null
          estado: string
          fecha_programada: string | null
          id: string
          mensaje: string
          target: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string | null
          dias_post_cita?: number | null
          estado?: string
          fecha_programada?: string | null
          id?: string
          mensaje: string
          target?: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string | null
          dias_post_cita?: number | null
          estado?: string
          fecha_programada?: string | null
          id?: string
          mensaje?: string
          target?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          duracion_minutos: number
          id: string
          image_url: string | null
          nombre: string
          precio: number
        }
        Insert: {
          created_at?: string
          duracion_minutos: number
          id?: string
          image_url?: string | null
          nombre: string
          precio: number
        }
        Update: {
          created_at?: string
          duracion_minutos?: number
          id?: string
          image_url?: string | null
          nombre?: string
          precio?: number
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
      business_settings_public: {
        Row: {
          background_url: string | null
          created_at: string | null
          dias_laborables: number[] | null
          direccion: string | null
          email_contacto: string | null
          horario_apertura: string | null
          horario_cierre: string | null
          id: string | null
          instagram_url: string | null
          logo_url: string | null
          nombre: string | null
          telefono: string | null
          tipo_negocio: string | null
          updated_at: string | null
        }
        Insert: {
          background_url?: string | null
          created_at?: string | null
          dias_laborables?: number[] | null
          direccion?: string | null
          email_contacto?: string | null
          horario_apertura?: string | null
          horario_cierre?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          nombre?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          updated_at?: string | null
        }
        Update: {
          background_url?: string | null
          created_at?: string | null
          dias_laborables?: number[] | null
          direccion?: string | null
          email_contacto?: string | null
          horario_apertura?: string | null
          horario_cierre?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          nombre?: string | null
          telefono?: string | null
          tipo_negocio?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_available_slots: {
        Args: { p_date: string; p_service_id: string }
        Returns: {
          available_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
      appointment_status: "programada" | "completada" | "cancelada"
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
      app_role: ["admin", "cliente"],
      appointment_status: ["programada", "completada", "cancelada"],
    },
  },
} as const
