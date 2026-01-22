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
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          quantity: number
          service_product_id: string | null
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          service_product_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          service_product_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_service_product_id_fkey"
            columns: ["service_product_id"]
            isOneToOne: false
            referencedRelation: "services_products"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_schedules: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          entry_id: string
          id: string
          installment_number: number
          installments_total: number
          paid_at: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          entry_id: string
          id?: string
          installment_number?: number
          installments_total?: number
          paid_at?: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          entry_id?: string
          id?: string
          installment_number?: number
          installments_total?: number
          paid_at?: string | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_schedules_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          category: string
          created_at: string
          date: string
          id: string
          notes: string | null
          type: Database["public"]["Enums"]["expense_type"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          category: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          type: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_activity_at: string | null
          id: string
          is_active: boolean
          name: string
          paid_until: string | null
          plan_type: string
          subscription_source: string
          subscription_status: string
          trial_days: number
          updated_at: string
          user_id: string
          vacation_end: string | null
          vacation_start: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_activity_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          paid_until?: string | null
          plan_type?: string
          subscription_source?: string
          subscription_status?: string
          trial_days?: number
          updated_at?: string
          user_id: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_activity_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          paid_until?: string | null
          plan_type?: string
          subscription_source?: string
          subscription_status?: string
          trial_days?: number
          updated_at?: string
          user_id?: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Relationships: []
      }
      services_products: {
        Row: {
          base_price: number
          cost: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          stock_quantity: number | null
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          base_price?: number
          cost?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          stock_quantity?: number | null
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          base_price?: number
          cost?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          stock_quantity?: number | null
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smart_states: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          message: string
          severity: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          message: string
          severity: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          message?: string
          severity?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          first_activity_date: string | null
          id: string
          plan_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          trial_days_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          first_activity_date?: string | null
          id?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_days_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          first_activity_date?: string | null
          id?: string
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_days_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador"
      entry_status: "pendente" | "pago"
      expense_type: "fixa" | "variavel"
      item_type: "servico" | "produto"
      payment_method: "dinheiro" | "pix" | "cartao_credito" | "cartao_debito"
      schedule_type: "single" | "installment" | "monthly_package"
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
      app_role: ["admin", "operador"],
      entry_status: ["pendente", "pago"],
      expense_type: ["fixa", "variavel"],
      item_type: ["servico", "produto"],
      payment_method: ["dinheiro", "pix", "cartao_credito", "cartao_debito"],
      schedule_type: ["single", "installment", "monthly_package"],
    },
  },
} as const
