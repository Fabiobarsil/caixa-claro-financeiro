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
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          account_id: string
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
          account_id: string
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
          account_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_schedules: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          due_date: string
          edited_at: string | null
          edited_by: string | null
          entry_id: string
          id: string
          installment_number: number
          installments_total: number
          paid_at: string | null
          previous_status: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          status: Database["public"]["Enums"]["entry_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          due_date: string
          edited_at?: string | null
          edited_by?: string | null
          entry_id: string
          id?: string
          installment_number?: number
          installments_total?: number
          paid_at?: string | null
          previous_status?: string | null
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          due_date?: string
          edited_at?: string | null
          edited_by?: string | null
          entry_id?: string
          id?: string
          installment_number?: number
          installments_total?: number
          paid_at?: string | null
          previous_status?: string | null
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          status?: Database["public"]["Enums"]["entry_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_schedules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_schedules_transaction_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string
          category: string
          created_at: string
          date: string
          exclude_from_profit: boolean
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["entry_status"]
          type: Database["public"]["Enums"]["expense_type"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          account_id: string
          category: string
          created_at?: string
          date?: string
          exclude_from_profit?: boolean
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          type: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          date?: string
          exclude_from_profit?: boolean
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          type?: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_events: {
        Row: {
          created_at: string | null
          event_date: string
          event_type: string
          id: number
          source_id: string
          source_table: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          event_date: string
          event_type: string
          id?: never
          source_id: string
          source_table: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: never
          source_id?: string
          source_table?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          company_name: string | null
          cpf: string | null
          created_at: string
          email: string
          first_activity_at: string | null
          id: string
          is_active: boolean
          is_system_admin: boolean
          name: string
          next_billing_date: string | null
          onboarding_done: boolean
          paid_until: string | null
          phone: string | null
          plan_type: string
          selected_plan: string | null
          subscription_expiration_date: string | null
          subscription_plan: string | null
          subscription_source: string
          subscription_start_date: string | null
          subscription_status: string
          terms_accepted_at: string | null
          trial_days: number
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
          vacation_end: string | null
          vacation_start: string | null
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          company_name?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          first_activity_at?: string | null
          id?: string
          is_active?: boolean
          is_system_admin?: boolean
          name: string
          next_billing_date?: string | null
          onboarding_done?: boolean
          paid_until?: string | null
          phone?: string | null
          plan_type?: string
          selected_plan?: string | null
          subscription_expiration_date?: string | null
          subscription_plan?: string | null
          subscription_source?: string
          subscription_start_date?: string | null
          subscription_status?: string
          terms_accepted_at?: string | null
          trial_days?: number
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          company_name?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          first_activity_at?: string | null
          id?: string
          is_active?: boolean
          is_system_admin?: boolean
          name?: string
          next_billing_date?: string | null
          onboarding_done?: boolean
          paid_until?: string | null
          phone?: string | null
          plan_type?: string
          selected_plan?: string | null
          subscription_expiration_date?: string | null
          subscription_plan?: string | null
          subscription_source?: string
          subscription_start_date?: string | null
          subscription_status?: string
          terms_accepted_at?: string | null
          trial_days?: number
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      services_products: {
        Row: {
          account_id: string
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
          account_id: string
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
          account_id?: string
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
        Relationships: [
          {
            foreignKeyName: "services_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_states: {
        Row: {
          account_id: string
          created_at: string
          generated_at: string
          id: string
          message: string
          severity: string
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          generated_at?: string
          id?: string
          message: string
          severity: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          generated_at?: string
          id?: string
          message?: string
          severity?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_states_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string
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
          account_id: string
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
          account_id?: string
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
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          account_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          account_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          account_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptance_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: Database["public"]["Enums"]["transaction_category"] | null
          client_id: string
          created_at: string
          date: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          quantity: number
          service_product_id: string | null
          status: Database["public"]["Enums"]["entry_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: Database["public"]["Enums"]["transaction_category"] | null
          client_id: string
          created_at?: string
          date?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          service_product_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"] | null
          client_id?: string
          created_at?: string
          date?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          service_product_id?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_service_product_id_fkey"
            columns: ["service_product_id"]
            isOneToOne: false
            referencedRelation: "services_products"
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
      webhook_events: {
        Row: {
          created_at: string
          email: string
          email_sent: boolean | null
          email_type: string | null
          error_message: string | null
          expiration_date_applied: string | null
          id: string
          normalized_event: string
          normalized_plan: string | null
          profile_id: string | null
          raw_event: string
          raw_product: string | null
          subscription_status_applied: string
          success: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_type?: string | null
          error_message?: string | null
          expiration_date_applied?: string | null
          id?: string
          normalized_event: string
          normalized_plan?: string | null
          profile_id?: string | null
          raw_event: string
          raw_product?: string | null
          subscription_status_applied: string
          success?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_type?: string | null
          error_message?: string | null
          expiration_date_applied?: string | null
          id?: string
          normalized_event?: string
          normalized_plan?: string | null
          profile_id?: string | null
          raw_event?: string
          raw_product?: string | null
          subscription_status_applied?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_requests: {
        Row: {
          created_at: string
          headers: Json | null
          id: string
          raw_body: string | null
          reason: string | null
          source: string | null
          status_code: number
        }
        Insert: {
          created_at?: string
          headers?: Json | null
          id?: string
          raw_body?: string | null
          reason?: string | null
          source?: string | null
          status_code: number
        }
        Update: {
          created_at?: string
          headers?: Json | null
          id?: string
          raw_body?: string | null
          reason?: string | null
          source?: string | null
          status_code?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_financial_competencia: {
        Row: {
          account_id: string | null
          categoria: string | null
          competencia: string | null
          master_id: string | null
          origem: string | null
          origem_id: string | null
          status: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: []
      }
      v_month_profit_paid: {
        Row: {
          account_id: string | null
          month: string | null
          profit_paid: number | null
          total_expenses_paid: number | null
          total_received_paid: number | null
        }
        Relationships: []
      }
      v_month_summary: {
        Row: {
          account_id: string | null
          expenses_open: number | null
          expenses_paid: number | null
          month: string | null
          profit_paid: number | null
          received_open: number | null
          received_paid: number | null
        }
        Relationships: []
      }
      v_month_summary_canon: {
        Row: {
          account_id: string | null
          expenses_open: number | null
          expenses_paid: number | null
          month: string | null
          profit_paid: number | null
          received_open: number | null
          received_paid: number | null
        }
        Relationships: []
      }
      v_month_summary_v2: {
        Row: {
          account_id: string | null
          expenses_open: number | null
          expenses_paid: number | null
          month: string | null
          profit_paid: number | null
          received_open: number | null
          received_paid: number | null
        }
        Relationships: []
      }
      v_prolabore_mvp: {
        Row: {
          account_id: string | null
          profit_m: number | null
          recommended_prolabore: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_profiles_masked: {
        Args: never
        Returns: {
          account_id: string
          company_name: string
          cpf_masked: string
          created_at: string
          email_masked: string
          id: string
          phone_masked: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_list_profiles_masked_for_account: {
        Args: { p_account_id: string }
        Returns: {
          account_id: string
          company_name: string
          cpf_masked: string
          created_at: string
          email_masked: string
          id: string
          phone_masked: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_list_profiles_masked_v2: {
        Args: never
        Returns: {
          account_id: string
          company_name: string
          cpf_masked: string
          created_at: string
          email_masked: string
          id: string
          phone_masked: string
          updated_at: string
          user_id: string
        }[]
      }
      current_account_id: { Args: never; Returns: string }
      expire_trials: { Args: never; Returns: number }
      get_dashboard_totals: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_prolabore_suggestion: {
        Args: { p_account: string; p_month: string; p_rate?: number }
        Returns: {
          profit_paid: number
          prolabore_suggested: number
        }[]
      }
      get_user_account_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_system_admin: { Args: never; Returns: boolean }
      my_account_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "operador"
      entry_status: "pendente" | "pago"
      expense_type: "fixa" | "variavel"
      item_type: "servico" | "produto"
      payment_method: "dinheiro" | "pix" | "cartao_credito" | "cartao_debito"
      schedule_type: "single" | "installment" | "monthly_package"
      subscription_plan: "mensal" | "semestral" | "anual"
      subscription_status:
        | "ativo"
        | "pendente"
        | "em_atraso"
        | "cancelado"
        | "expirado"
      transaction_category: "servico" | "produto" | "outro"
      transaction_type: "entrada" | "saida"
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
      subscription_plan: ["mensal", "semestral", "anual"],
      subscription_status: [
        "ativo",
        "pendente",
        "em_atraso",
        "cancelado",
        "expirado",
      ],
      transaction_category: ["servico", "produto", "outro"],
      transaction_type: ["entrada", "saida"],
    },
  },
} as const
