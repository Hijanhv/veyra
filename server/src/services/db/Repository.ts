import { getSupabase } from './SupabaseClient.js';
import type { Database } from '../../types/supabase.generated.js';

export type Address = string;

type Tables = Database['public']['Tables'];
// Removed custom indexer; indexer_state helpers/types no longer required
type RebalanceRow = Tables['rebalances']['Row'];
type RebalanceInsert = Tables['rebalances']['Insert'];
type StrategyFlowRow = Tables['strategy_flows']['Row'];
type StrategyFlowInsert = Tables['strategy_flows']['Insert'];
type HarvestRow = Tables['harvests']['Row'];
type HarvestInsert = Tables['harvests']['Insert'];
// Row type for erc4626_flows not needed until we add a read endpoint
type Erc4626FlowInsert = Tables['erc4626_flows']['Insert'];
type AgentDecisionRow = Tables['agent_decisions']['Row'];
type AgentDecisionInsert = Tables['agent_decisions']['Insert'];

export const Repository = {

  async insertRebalance(e: {
    chainId: number; txHash: string; logIndex: number; blockNumber: number; ts: string;
    vault: Address; beforeAlloc?: Record<Address, number> | null; afterAlloc: Record<Address, number>
  }) {
    const sb = getSupabase();
    if (!sb) return;
    const row: RebalanceInsert = {
      chain_id: e.chainId,
      tx_hash: e.txHash,
      log_index: e.logIndex,
      block_number: e.blockNumber,
      ts: e.ts,
      vault_address: e.vault,
      before_alloc_json: (e.beforeAlloc ?? null) as unknown as RebalanceRow['before_alloc_json'],
      after_alloc_json: e.afterAlloc as unknown as RebalanceRow['after_alloc_json']
    };
    await sb.from('rebalances').upsert(row, { onConflict: 'chain_id,tx_hash,log_index' });
  },

  async insertStrategyFlow(e: {
    chainId: number; txHash: string; logIndex: number; blockNumber: number; ts: string;
    vault: Address; strategy: Address; action: 'deploy' | 'withdraw' | 'harvest'; asset?: Address | null; amountWei?: string | number | null
  }) {
    const sb = getSupabase();
    if (!sb) return;
    const row: StrategyFlowInsert = {
      chain_id: e.chainId,
      tx_hash: e.txHash,
      log_index: e.logIndex,
      block_number: e.blockNumber,
      ts: e.ts,
      vault_address: e.vault,
      strategy_address: e.strategy,
      action: e.action,
      asset_address: e.asset ?? null,
      amount_wei: e.amountWei == null ? null : e.amountWei.toString()
    } as unknown as StrategyFlowInsert;
    await sb.from('strategy_flows').upsert(row, { onConflict: 'chain_id,tx_hash,log_index' });
  },

  async insertHarvest(e: { chainId: number; txHash: string; logIndex: number; blockNumber: number; ts: string; vault: Address; totalYieldWei: string | number }) {
    const sb = getSupabase();
    if (!sb) return;
    const row: HarvestInsert = {
      chain_id: e.chainId,
      tx_hash: e.txHash,
      log_index: e.logIndex,
      block_number: e.blockNumber,
      ts: e.ts,
      vault_address: e.vault,
      total_yield_wei: e.totalYieldWei.toString()
    } as unknown as HarvestInsert;
    await sb.from('harvests').upsert(row, { onConflict: 'chain_id,tx_hash,log_index' });
  },

  async insertERC4626Flow(e: {
    chainId: number; txHash: string; logIndex: number; blockNumber: number; ts: string;
    vault: Address; action: 'deposit' | 'withdraw'; caller?: Address | null; owner?: Address | null; receiver?: Address | null; assetsWei: string | number; sharesWei: string | number
  }) {
    const sb = getSupabase();
    if (!sb) return;
    const row: Erc4626FlowInsert = {
      chain_id: e.chainId,
      tx_hash: e.txHash,
      log_index: e.logIndex,
      block_number: e.blockNumber,
      ts: e.ts,
      vault_address: e.vault,
      caller: e.caller ?? null,
      owner: e.owner ?? null,
      receiver: e.receiver ?? null,
      action: e.action,
      assets_wei: e.assetsWei.toString(),
      shares_wei: e.sharesWei.toString()
    } as unknown as Erc4626FlowInsert;
    await sb.from('erc4626_flows').upsert(row, { onConflict: 'chain_id,tx_hash,log_index' });
  },

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

  // Reads for routes
  async getRecentFlows(vault: Address, limit = 50): Promise<{ data: StrategyFlowRow[] }> {
    const sb = getSupabase();
    if (!sb) return { data: [] };
    const { data } = await sb.from('strategy_flows').select('*').eq('vault_address', vault).order('ts', { ascending: false }).limit(limit);
    return { data: data ?? [] };
  },

  async getRecentRebalances(vault: Address, limit = 50): Promise<{ data: RebalanceRow[] }> {
    const sb = getSupabase();
    if (!sb) return { data: [] };
    const { data } = await sb.from('rebalances').select('*').eq('vault_address', vault).order('ts', { ascending: false }).limit(limit);
    return { data: data ?? [] };
  },

  async getRecentHarvests(vault: Address, limit = 50): Promise<{ data: HarvestRow[] }> {
    const sb = getSupabase();
    if (!sb) return { data: [] };
    const { data } = await sb.from('harvests').select('*').eq('vault_address', vault).order('ts', { ascending: false }).limit(limit);
    return { data: data ?? [] };
  },

  async getAgentDecisions(vault: Address, limit = 20): Promise<{ data: AgentDecisionRow[] }> {
    const sb = getSupabase();
    if (!sb) return { data: [] };
    const { data } = await sb.from('agent_decisions').select('*').eq('vault_address', vault).order('created_at', { ascending: false }).limit(limit);
    return { data: data ?? [] };
  }
};
