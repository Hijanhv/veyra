import { VaultService } from '../services/VaultService.js';
import { InvestmentAgent } from '../services/InvestmentAgent.js';
import { RebalancingService } from '../services/RebalancingService.js';
import { Repository } from '../services/db/Repository.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Address } from '../types/index.js';

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

  // Aggregated vault overview combining on-chain metrics with last known allocations
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/overview',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const metrics = await vaultService.getVaultMetrics(vaultId);
        const rebalances = await Repository.getRecentRebalances(vaultId, 1);
        const latestAlloc = (rebalances.data?.[0]?.after_alloc_json) || metrics.strategyAllocation;
        return { success: true, data: { ...metrics, latestAllocations: latestAlloc } };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch overview' });
      }
    }
  );

  // Recent on-chain flows (strategy deploy/withdraw/harvest)
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/flows',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const flows = await Repository.getRecentFlows(vaultId, 100);
        return { success: true, data: flows.data };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch flows' });
      }
    }
  );

  // Allocation history (rebalances)
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/allocations/history',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const items = await Repository.getRecentRebalances(vaultId, 50);
        return { success: true, data: items.data };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch allocation history' });
      }
    }
  );

  // Harvest history
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/harvests',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const items = await Repository.getRecentHarvests(vaultId, 50);
        return { success: true, data: items.data };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to fetch harvests' });
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

  // Derived current positions per strategy from flows
  fastify.get<{ Params: { vaultId: Address } }>(
    '/:vaultId/positions',
    async (request: FastifyRequest<{ Params: { vaultId: Address } }>, reply: FastifyReply) => {
      try {
        const { vaultId } = request.params;
        const flows = await Repository.getRecentFlows(vaultId, 1000);
        const map: Record<string, number> = {};
        for (const f of flows.data as any[]) {
          if (!f.strategy_address) continue;
          const amt = Number(f.amount_wei || 0);
          if (!map[f.strategy_address]) map[f.strategy_address] = 0;
          if (f.action === 'deploy') map[f.strategy_address] += amt;
          if (f.action === 'withdraw') map[f.strategy_address] -= amt;
        }
        return { success: true, data: map };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ success: false, error: 'Failed to compute positions' });
      }
    }
  );
}
