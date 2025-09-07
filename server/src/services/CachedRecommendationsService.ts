import type { RecommendedAllocation } from '../types/ai.js';
import type { Address } from '../types/common.js';
import { AgentCache } from '../cache/agent/AgentCache.js';
import { VaultService } from './VaultService.js';

export class CachedRecommendationsService {
  constructor(private readonly vaultService: VaultService) { }

  async getLatest(vaultId: Address): Promise<RecommendedAllocation | null> {
    const row = AgentCache.getLatest(vaultId);
    if (!row) return null;
    const allocations = JSON.parse(row.allocations_json) as Record<Address, number>;
    return {
      vaultId,
      recommendedAllocation: allocations,
      expectedApy: row.expected_apy_bp,
      riskScore: row.risk_score,
      reasoning: row.reasoning ?? 'Cached recommendation',
      confidence: row.confidence,
      marketContext: row.market_context ?? 'N/A',
    };
  }
}
