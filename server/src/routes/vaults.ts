import { VaultService } from '../services/VaultService.js';
import { InvestmentAgent } from '../services/InvestmentAgent.js';
import { RebalancingService } from '../services/RebalancingService.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Address } from '../types/index.js';

/**
 * API routes for working with Veyra vaults. Kept simple on purpose - just
 * two main endpoints: one to get vault stats and another to get allocation
 * recommendations. You can easily add more endpoints later if you need
 * features like triggering rebalances.
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
}
