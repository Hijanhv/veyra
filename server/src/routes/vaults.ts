import { VaultService } from '../services/VaultService.js';
import { InvestmentAgent } from '../services/InvestmentAgent.js';
import { RebalancingService } from '../services/RebalancingService.js';
import { Repository } from '../services/db/Repository.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Address } from '../types/index.js';
import { fetchFlows, fetchRebalances, fetchHarvests } from '../services/PonderClient.js';

/**
 * API routes for working with Veyra vaults.
 * Two main endpoints: vault stats and allocation recommendations.
 * Additional endpoints can be added for operations like triggering rebalances.
 */
export async function vaultRoutes(fastify: FastifyInstance) {
  // Set up our services once and reuse them for all requests.
  // VaultService handles blockchain communication, InvestmentAgent makes allocation decisions.
  const vaultService = new VaultService();
  const agent = new InvestmentAgent(vaultService);
  const rebalancingService = new RebalancingService(agent, vaultService);

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

  // Get allocation recommendations based on current yields and risk factors.
  // The InvestmentAgent analyzes all strategies and suggests how to split your funds
  // for the best risk-adjusted returns. Recommendation only - no actual
  // transactions are made.
  fastify.get<{ Params: { vaultId: Address } }>('/:vaultId/strategy', async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
    try {
      const { vaultId } = request.params;
      const recommendation = await agent.getOptimalAllocation(vaultId);
      return { success: true, data: recommendation };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to generate strategy' });
    }
  });

  // Get detailed AI-powered rebalancing recommendation with risk analysis
  fastify.get<{ Params: { vaultId: Address } }>('/:vaultId/ai-rebalance', async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
    try {
      const { vaultId } = request.params;
      const recommendation = await rebalancingService.getRebalanceRecommendation(vaultId);
      return { success: true, data: recommendation };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to generate AI rebalance recommendation' });
    }
  });

  // Execute AI-powered rebalancing (requires proper authentication in production)
  fastify.post<{ Params: { vaultId: Address } }>(
    '/:vaultId/ai-rebalance',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      // Simple admin auth: require x-admin-key header to match ADMIN_API_KEY
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
  // AI agent decisions (off-chain)
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/agent/decisions',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const items = await Repository.getAgentDecisions(vaultId, 20);
        return { success: true, data: items.data };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch agent decisions' });
      }
    }
  );

  // Indexed flows (deposits & withdrawals) via Ponder, paginated
  fastify.get<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>(
    '/:vaultId/flows',
    async (request: FastifyRequest<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)));
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
        const rows = await fetchFlows(vaultId, limit, offset);
        const items = rows.map((r) => ({
          id: r.id,
          vault: r.vault,
          type: r.action,
          sender: r.sender,
          owner: r.owner,
          receiver: r.receiver ?? null,
          assetsWei: r.assets,
          sharesWei: r.shares,
          blockNumber: Number(r.blockNumber),
          timestamp: Number(r.timestamp),
          txHash: r.transactionHash,
        }));
        const hasMore = items.length === limit; // heuristic without count
        return { success: true, data: { items, nextOffset: offset + items.length, hasMore } };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch flows' });
      }
    }
  );

  // Indexed rebalances via Ponder, paginated
  fastify.get<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>(
    '/:vaultId/rebalances',
    async (request: FastifyRequest<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)));
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
        const rows = await fetchRebalances(vaultId, limit, offset);
        const items = rows.map((r) => ({
          id: r.id,
          vault: r.vault,
          strategies: r.strategies,
          allocations: r.allocations,
          blockNumber: Number(r.blockNumber),
          timestamp: Number(r.timestamp),
          txHash: r.transactionHash,
        }));
        const hasMore = items.length === limit;
        return { success: true, data: { items, nextOffset: offset + items.length, hasMore } };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch rebalances' });
      }
    }
  );

  // Indexed yield harvests via Ponder, paginated
  fastify.get<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>(
    '/:vaultId/harvests',
    async (request: FastifyRequest<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)));
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
        const rows = await fetchHarvests(vaultId, limit, offset);
        const items = rows.map((r) => ({
          id: r.id,
          vault: r.vault,
          totalYieldWei: r.totalYield,
          blockNumber: Number(r.blockNumber),
          timestamp: Number(r.timestamp),
          txHash: r.transactionHash,
        }));
        const hasMore = items.length === limit;
        return { success: true, data: { items, nextOffset: offset + items.length, hasMore } };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch harvests' });
      }
    }
  );
}
