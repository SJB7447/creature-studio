export type Plan = 'free' | 'creator' | 'studio'
export type TransactionType = 'charge' | 'use' | 'bonus' | 'refund'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          plan: string
          credits: number
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          plan?: string
          credits?: number
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          plan?: string
          credits?: number
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          feature: string | null
          model_used: string | null
          cost_krw: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          feature?: string | null
          model_used?: string | null
          cost_krw?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          feature?: string | null
          model_used?: string | null
          cost_krw?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan: string
          status: string
          started_at: string
          expires_at: string | null
          toss_payment_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan: string
          status: string
          started_at: string
          expires_at?: string | null
          toss_payment_key?: string | null
          created_at?: string
        }
        Update: {
          status?: string
          expires_at?: string | null
          toss_payment_key?: string | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          id: string
          name: string
          credits: number
          price_krw: number
          bonus_credits: number
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          credits: number
          price_krw: number
          bonus_credits?: number
          is_active?: boolean
        }
        Update: {
          name?: string
          credits?: number
          price_krw?: number
          bonus_credits?: number
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Row type aliases for convenience
export type SupabaseUser = Database['public']['Tables']['users']['Row']
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type CreditPackage = Database['public']['Tables']['credit_packages']['Row']
