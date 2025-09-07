import { getSupabase } from './SupabaseClient.js';
import type { Database, Json } from '../../types/supabase.generated.js';

export type Address = string;

type Tables = Database['public']['Tables'];
export type AgentDecisionRow = Tables['agent_decisions']['Row'];
export type AgentDecisionInsert = Tables['agent_decisions']['Insert'];

export type AgentDecision = {
  id: number;
  chainId: number;
  vault: Address;
  allocations: Record<Address, number>;
  expectedApyBp: number;
  riskScore: number;
  confidence: number;
  reasoning: string | null;
  marketContext: string | null;
  createdAt: string | null;
};

export const Repository = {

  async insertAgentDecision(e: {
    chainId: number; vault: Address; allocations: Record<Address, number>; expectedApyBp: number; riskScore: number; confidence: number; reasoning?: string; marketContext?: string
  }) {
    const sb = getSupabase();
    if (!sb) return;
    const row: AgentDecisionInsert = {
      chain_id: e.chainId,
      vault_address: e.vault,
      allocations_json: e.allocations as unknown as AgentDecisionRow['allocations_json'],
      expected_apy_bp: e.expectedApyBp,
      risk_score: e.riskScore,
      confidence: e.confidence,
      reasoning: e.reasoning ?? null,
      market_context: e.marketContext ?? null
    };
    await sb.from('agent_decisions').insert(row);
  },

  async getAgentDecisions(vault: Address, limit = 20): Promise<{ data: AgentDecisionRow[] }> {
    const sb = getSupabase();
    if (!sb) return { data: [] };
    const { data } = await sb.from('agent_decisions').select('*').eq('vault_address', vault).order('created_at', { ascending: false }).limit(limit);
    return { data: data ?? [] };
  },

  async getLatestAgentDecision(vault: Address): Promise<AgentDecision | null> {
    const { data } = await this.getAgentDecisions(vault, 1);
    const row = data[0];
    if (!row) return null;
    const allocations = (row.allocations_json as Json);
    const parsed: Record<Address, number> = typeof allocations === 'object' && allocations !== null ? (allocations as Record<string, number>) : {};
    return {
      id: row.id,
      chainId: row.chain_id,
      vault: row.vault_address,
      allocations: parsed as Record<Address, number>,
      expectedApyBp: row.expected_apy_bp,
      riskScore: row.risk_score,
      confidence: row.confidence,
      reasoning: row.reasoning,
      marketContext: row.market_context,
      createdAt: row.created_at,
    };
  },

  async listAgentDecisions(vault: Address, limit = 20): Promise<AgentDecision[]> {
    const { data } = await this.getAgentDecisions(vault, limit);
    return (data ?? []).map((row) => {
      const allocations = (row.allocations_json as Json);
      const parsed: Record<Address, number> = typeof allocations === 'object' && allocations !== null ? (allocations as Record<string, number>) : {};
      return {
        id: row.id,
        chainId: row.chain_id,
        vault: row.vault_address,
        allocations: parsed as Record<Address, number>,
        expectedApyBp: row.expected_apy_bp,
        riskScore: row.risk_score,
        confidence: row.confidence,
        reasoning: row.reasoning,
        marketContext: row.market_context,
        createdAt: row.created_at,
      };
    });
  }
};
