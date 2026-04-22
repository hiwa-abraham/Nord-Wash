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
      admin_action_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          updated_at: string
          washer_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          updated_at?: string
          washer_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          updated_at?: string
          washer_id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          expires_at: string
          fetched_at: string
          id: string
          rates: Json
        }
        Insert: {
          base_currency: string
          expires_at?: string
          fetched_at?: string
          id?: string
          rates: Json
        }
        Update: {
          base_currency?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
        }
        Relationships: []
      }
      issues: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["issue_priority"]
          reporter_email: string | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          source: string
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          reporter_email?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          reporter_email?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          customer_phone: string
          id: string
          owner_amount: number
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          pickup_address: string
          pickup_city: string
          pickup_date: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_postal_code: string | null
          pickup_time: string
          service_fee: number
          services: Json
          services_total: number
          special_instructions: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
          transport_fee: number
          updated_at: string
          washer_amount: number
          washer_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_email: string
          customer_id: string
          customer_name: string
          customer_phone: string
          id?: string
          owner_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_address: string
          pickup_city: string
          pickup_date: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_postal_code?: string | null
          pickup_time: string
          service_fee?: number
          services?: Json
          services_total?: number
          special_instructions?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
          transport_fee?: number
          updated_at?: string
          washer_amount?: number
          washer_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          owner_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_address?: string
          pickup_city?: string
          pickup_date?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_postal_code?: string | null
          pickup_time?: string
          service_fee?: number
          services?: Json
          services_total?: number
          special_instructions?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
          transport_fee?: number
          updated_at?: string
          washer_amount?: number
          washer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          completed_jobs: number | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          completed_jobs?: number | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          completed_jobs?: number | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          currency: string
          description: string
          discount_percent: number
          id: string
          is_active: boolean
          name: string
          name_key: string | null
          price_per_kg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          name: string
          name_key?: string | null
          price_per_kg: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          name_key?: string | null
          price_per_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      suspended_users: {
        Row: {
          reason: string | null
          suspended_at: string
          suspended_by: string
          user_id: string
        }
        Insert: {
          reason?: string | null
          suspended_at?: string
          suspended_by: string
          user_id: string
        }
        Update: {
          reason?: string | null
          suspended_at?: string
          suspended_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_issue_priority_weight: {
        Args: { _priority: Database["public"]["Enums"]["issue_priority"] }
        Returns: number
      }
      cleanup_old_audit_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      delete_user_account: { Args: { _user_id: string }; Returns: undefined }
      get_admin_dashboard_metrics: {
        Args: never
        Returns: {
          active_users_last_30_days: number
          failed_logins_last_24h: number
          new_orders_last_7_days: number
          open_issues: number
          revenue_paid_cents: number
          suspicious_activity_last_24h: number
          system_status: string
          total_users: number
        }[]
      }
      get_limited_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          completed_jobs: number
          full_name: string
          rating: number
          user_id: string
        }[]
      }
      get_maintenance_mode: { Args: never; Returns: boolean }
      get_owner_email: { Args: never; Returns: string }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          completed_jobs: number
          created_at: string
          full_name: string
          id: string
          rating: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_washer_order_info: {
        Args: { _order_id: string }
        Returns: {
          created_at: string
          customer_name_initial: string
          id: string
          pickup_city: string
          pickup_date: string
          pickup_time: string
          services: Json
          special_instructions: string
          status: string
          washer_amount: number
        }[]
      }
      get_washer_pickup_details: {
        Args: { _order_id: string }
        Returns: {
          customer_name: string
          customer_phone: string
          id: string
          pickup_address: string
          pickup_city: string
          pickup_date: string
          pickup_postal_code: string
          pickup_time: string
          special_instructions: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_level: { Args: { _user_id: string }; Returns: boolean }
      is_owner_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          _description: string
          _event_type: string
          _ip_address?: string
          _metadata?: Json
          _severity: string
          _user_id?: string
        }
        Returns: string
      }
      safe_query_orders: {
        Args: { _customer_id?: string; _limit?: number; _status?: string }
        Returns: {
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_id: string
          customer_name: string
          customer_phone: string
          id: string
          owner_amount: number
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          pickup_address: string
          pickup_city: string
          pickup_date: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_postal_code: string | null
          pickup_time: string
          service_fee: number
          services: Json
          services_total: number
          special_instructions: string | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
          transport_fee: number
          updated_at: string
          washer_amount: number
          washer_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      update_homepage_content: {
        Args: { _hero_subtitle: string; _hero_title: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "customer" | "washer" | "admin" | "owner_admin"
      issue_priority: "critical" | "high" | "medium" | "low"
      issue_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["customer", "washer", "admin", "owner_admin"],
      issue_priority: ["critical", "high", "medium", "low"],
      issue_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
