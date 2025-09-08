import { VaultService } from '../services/VaultService.js';
import { RebalancingService } from '../services/RebalancingService.js';
import { Repository } from '../services/db/Repository.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Address } from '../types/index.js';

/**
 * API routes for working with Veyra vaults.
 */
export async function vaultRoutes(fastify: FastifyInstance) {
  // Set up our services once and reuse them for all requests.
  const vaultService = new VaultService();
  const rebalancingService = new RebalancingService(vaultService);

  // List configured vaults and default (from env)
  fastify.get('/', async (_request: FastifyRequest, _reply: FastifyReply) => {
    try {
      const list = (process.env.VAULT_ADDRESSES || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const def = process.env.DEFAULT_VAULT_ID || null;
      return { success: true, data: { vaults: list, defaultVaultId: def } };
    } catch (error) {
      fastify.log.error(error);
      return { success: false, error: 'Failed to load vault list' };
    }
  });

  // Get the key stats for a vault - total funds, average yield, and how money
  // is currently split across strategies. Use the vault's contract address as the ID.
  fastify.get<{ Params: { vaultId: Address } }>('/:vaultId/metrics', async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
    try {
      const { vaultId } = request.params;
      const metrics = await vaultService.getVaultMetrics(vaultId);
      return { success: true, data: metrics };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to fetch vault metrics' });
    }
  });

  // Get latest stored allocation recommendation (from Supabase)
  fastify.get<{ Params: { vaultId: Address } }>('/:vaultId/strategy', async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
    try {
      const { vaultId } = request.params;
      const row = await Repository.getLatestAgentDecision(vaultId);
      if (!row) return reply.status(404).send({ success: false, error: 'No recommendation found' });
      const allocations = row.allocations as Record<Address, number>;
      return {
        success: true,
        data: {
          vaultId,
          recommendedAllocation: allocations,
          expectedApy: row.expectedApyBp ?? 0,
          riskScore: row.riskScore ?? 0,
          reasoning: row.reasoning ?? 'Latest DB recommendation',
          confidence: row.confidence ?? 0,
          marketContext: row.marketContext ?? 'N/A',
        }
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to fetch latest strategy' });
    }
  });

  // Get detailed AI-powered rebalancing recommendation with risk analysis
  fastify.get<{ Params: { vaultId: Address } }>('/:vaultId/ai-rebalance', async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
    try {
      const { vaultId } = request.params;
      const latest = await Repository.getLatestAgentDecision(vaultId);
      if (!latest) return reply.status(404).send({ success: false, error: 'No recommendation found' });
      const recommendation = await rebalancingService.getRebalanceRecommendation(vaultId);
      return { success: true, data: recommendation };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to generate AI rebalance recommendation' });
    }
  });

  // Execute AI-powered rebalancing
  fastify.post<{ Params: { vaultId: Address } }>(
    '/:vaultId/ai-rebalance',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      // Admin auth: require x-admin-key header to match ADMIN_API_KEY
      const adminKey = (request.headers['x-admin-key'] || request.headers['X-Admin-Key']) as string | undefined;
      if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
      try {
        const { vaultId } = request.params;
        const result = await rebalancingService.executeRebalancing(vaultId);

        if (result.success) {
          return { success: true, data: result };
        } else {
          reply.status(400).send({ success: false, error: result.error });
        }
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to execute AI rebalancing' });
      }
    });

  // Get detailed strategy analysis for debugging/monitoring
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/strategies/analysis',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const details = await vaultService.getStrategyDetails(vaultId);
        return { success: true, data: details };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to analyze strategies' });
      }
    });

  // Aggregated vault overview combining on-chain metrics
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/overview',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const metrics = await vaultService.getVaultMetrics(vaultId);
        // Latest allocations are derived from on-chain state directly
        return { success: true, data: { ...metrics, latestAllocations: metrics.strategyAllocation } };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch overview' });
      }
    }
  );
  // AI agent decisions (from Supabase)
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/agent/decisions',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const data = await Repository.listAgentDecisions(vaultId, 20);
        const items = data.map((r) => ({
          id: r.id,
          vault_address: r.vault,
          allocations_json: r.allocations,
          expected_apy_bp: r.expectedApyBp,
          risk_score: r.riskScore,
          confidence: r.confidence,
          reasoning: r.reasoning,
          market_context: r.marketContext,
          created_at: r.createdAt,
        }));
        return { success: true, data: items };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch agent decisions' });
      }
    }
  );

}
