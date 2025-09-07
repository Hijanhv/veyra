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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      _ponder_checkpoint: {
        Row: {
          chain_id: number
          chain_name: string
          finalized_checkpoint: string
          latest_checkpoint: string
          safe_checkpoint: string
        }
        Insert: {
          chain_id: number
          chain_name: string
          finalized_checkpoint: string
          latest_checkpoint: string
          safe_checkpoint: string
        }
        Update: {
          chain_id?: number
          chain_name?: string
          finalized_checkpoint?: string
          latest_checkpoint?: string
          safe_checkpoint?: string
        }
        Relationships: []
      }
      _ponder_meta: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      _reorg__deposits: {
        Row: {
          assets: number
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id: number
          owner: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          assets: number
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id?: number
          owner: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          assets?: number
          block_number?: number
          checkpoint?: string
          id?: string
          operation?: number
          operation_id?: number
          owner?: string
          sender?: string
          shares?: number
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      _reorg__rebalances: {
        Row: {
          allocations: number[]
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id: number
          strategies: string[]
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          allocations: number[]
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id?: number
          strategies: string[]
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          allocations?: number[]
          block_number?: number
          checkpoint?: string
          id?: string
          operation?: number
          operation_id?: number
          strategies?: string[]
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      _reorg__strategy_events: {
        Row: {
          allocation: number | null
          amount: number | null
          block_number: number
          checkpoint: string
          event_type: string
          id: string
          operation: number
          operation_id: number
          strategy: string
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          allocation?: number | null
          amount?: number | null
          block_number: number
          checkpoint: string
          event_type: string
          id: string
          operation: number
          operation_id?: number
          strategy: string
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          allocation?: number | null
          amount?: number | null
          block_number?: number
          checkpoint?: string
          event_type?: string
          id?: string
          operation?: number
          operation_id?: number
          strategy?: string
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      _reorg__user_balances: {
        Row: {
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id: number
          shares: number
          updated_at: number
          user: string
          vault: string
        }
        Insert: {
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id?: number
          shares: number
          updated_at: number
          user: string
          vault: string
        }
        Update: {
          block_number?: number
          checkpoint?: string
          id?: string
          operation?: number
          operation_id?: number
          shares?: number
          updated_at?: number
          user?: string
          vault?: string
        }
        Relationships: []
      }
      _reorg__vault_metrics: {
        Row: {
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id: number
          share_price: number
          total_assets: number
          total_supply: number
          updated_at: number
        }
        Insert: {
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id?: number
          share_price: number
          total_assets: number
          total_supply: number
          updated_at: number
        }
        Update: {
          block_number?: number
          checkpoint?: string
          id?: string
          operation?: number
          operation_id?: number
          share_price?: number
          total_assets?: number
          total_supply?: number
          updated_at?: number
        }
        Relationships: []
      }
      _reorg__withdrawals: {
        Row: {
          assets: number
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id: number
          owner: string
          receiver: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          assets: number
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id?: number
          owner: string
          receiver: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          assets?: number
          block_number?: number
          checkpoint?: string
          id?: string
          operation?: number
          operation_id?: number
          owner?: string
          receiver?: string
          sender?: string
          shares?: number
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      _reorg__yield_harvests: {
        Row: {
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id: number
          timestamp: number
          total_yield: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          block_number: number
          checkpoint: string
          id: string
          operation: number
          operation_id?: number
          timestamp: number
          total_yield: number
          transaction_hash: string
          vault: string
        }
        Update: {
          block_number?: number
          checkpoint?: string
          id?: string
          operation?: number
          operation_id?: number
          timestamp?: number
          total_yield?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      agent_decisions: {
        Row: {
          allocations_json: Json
          chain_id: number
          confidence: number
          created_at: string | null
          expected_apy_bp: number
          id: number
          market_context: string | null
          reasoning: string | null
          risk_score: number
          vault_address: string
        }
        Insert: {
          allocations_json: Json
          chain_id: number
          confidence: number
          created_at?: string | null
          expected_apy_bp: number
          id?: number
          market_context?: string | null
          reasoning?: string | null
          risk_score: number
          vault_address: string
        }
        Update: {
          allocations_json?: Json
          chain_id?: number
          confidence?: number
          created_at?: string | null
          expected_apy_bp?: number
          id?: number
          market_context?: string | null
          reasoning?: string | null
          risk_score?: number
          vault_address?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          assets: number
          block_number: number
          id: string
          owner: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          assets: number
          block_number: number
          id: string
          owner: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          assets?: number
          block_number?: number
          id?: string
          owner?: string
          sender?: string
          shares?: number
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      rebalances: {
        Row: {
          allocations: number[]
          block_number: number
          id: string
          strategies: string[]
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          allocations: number[]
          block_number: number
          id: string
          strategies: string[]
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          allocations?: number[]
          block_number?: number
          id?: string
          strategies?: string[]
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string | null
          metadata: Json | null
          strategy_address: string
          type: string | null
          vault_address: string | null
        }
        Insert: {
          created_at?: string | null
          metadata?: Json | null
          strategy_address: string
          type?: string | null
          vault_address?: string | null
        }
        Update: {
          created_at?: string | null
          metadata?: Json | null
          strategy_address?: string
          type?: string | null
          vault_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategies_vault_address_fkey"
            columns: ["vault_address"]
            isOneToOne: false
            referencedRelation: "vaults"
            referencedColumns: ["vault_address"]
          },
        ]
      }
      strategy_events: {
        Row: {
          allocation: number | null
          amount: number | null
          block_number: number
          event_type: string
          id: string
          strategy: string
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          allocation?: number | null
          amount?: number | null
          block_number: number
          event_type: string
          id: string
          strategy: string
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          allocation?: number | null
          amount?: number | null
          block_number?: number
          event_type?: string
          id?: string
          strategy?: string
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          block_number: number
          id: string
          shares: number
          updated_at: number
          user: string
          vault: string
        }
        Insert: {
          block_number: number
          id: string
          shares: number
          updated_at: number
          user: string
          vault: string
        }
        Update: {
          block_number?: number
          id?: string
          shares?: number
          updated_at?: number
          user?: string
          vault?: string
        }
        Relationships: []
      }
      vault_metrics: {
        Row: {
          block_number: number
          id: string
          share_price: number
          total_assets: number
          total_supply: number
          updated_at: number
        }
        Insert: {
          block_number: number
          id: string
          share_price: number
          total_assets: number
          total_supply: number
          updated_at: number
        }
        Update: {
          block_number?: number
          id?: string
          share_price?: number
          total_assets?: number
          total_supply?: number
          updated_at?: number
        }
        Relationships: []
      }
      vaults: {
        Row: {
          asset_address: string | null
          created_at: string | null
          decimals: number | null
          name: string | null
          vault_address: string
        }
        Insert: {
          asset_address?: string | null
          created_at?: string | null
          decimals?: number | null
          name?: string | null
          vault_address: string
        }
        Update: {
          asset_address?: string | null
          created_at?: string | null
          decimals?: number | null
          name?: string | null
          vault_address?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          assets: number
          block_number: number
          id: string
          owner: string
          receiver: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          assets: number
          block_number: number
          id: string
          owner: string
          receiver: string
          sender: string
          shares: number
          timestamp: number
          transaction_hash: string
          vault: string
        }
        Update: {
          assets?: number
          block_number?: number
          id?: string
          owner?: string
          receiver?: string
          sender?: string
          shares?: number
          timestamp?: number
          transaction_hash?: string
          vault?: string
        }
        Relationships: []
      }
      yield_harvests: {
        Row: {
          block_number: number
          id: string
          timestamp: number
          total_yield: number
          transaction_hash: string
          vault: string
        }
        Insert: {
          block_number: number
          id: string
          timestamp: number
          total_yield: number
          transaction_hash: string
          vault: string
        }
        Update: {
          block_number?: number
          id?: string
          timestamp?: number
          total_yield?: number
          transaction_hash?: string
          vault?: string
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
    Enums: {},
  },
} as const
