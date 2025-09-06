import { getSupabase } from './SupabaseClient.js';
import type { Database } from '../../types/supabase.generated.js';

export type Address = string;

type Tables = Database['public']['Tables'];
// Removed custom indexer; indexer_state helpers/types no longer required
// Supabase now stores only off-chain AI decisions (and optional metadata)
type AgentDecisionRow = Tables['agent_decisions']['Row'];
type AgentDecisionInsert = Tables['agent_decisions']['Insert'];

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
  }
};
