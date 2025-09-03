import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { VaultService } from '../services/VaultService.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Address } from '../types/index.js';

/**
 * API routes for analytics and market insights. These endpoints give you
 * the big picture view of DeFi markets - sentiment analysis, yield forecasts,
 * and risk assessments. They use vault data but don't directly interact
 * with the blockchain contracts.
 */
export async function analyticsRoutes(fastify: FastifyInstance) {
  // Set up our services - VaultService talks to the blockchain, AnalyticsEngine crunches the data
  const vaultService = new VaultService();
  const analytics = new AnalyticsEngine(vaultService);

  // Get market insights for a vault - shows sentiment, best opportunities, and risks.
  // Based on APY analysis and risk factor detection.
  fastify.get<{ Querystring: { vaultId?: Address } }>(
    '/insights',
    async (request: FastifyRequest<{ Querystring: { vaultId?: Address } }>, reply: FastifyReply) => {
    try {
      // Figure out which vault to analyze - use the vaultId parameter or fall back to default
      const { vaultId } = request.query;
      const targetVault = vaultId || process.env.DEFAULT_VAULT_ID;
      if (!targetVault) {
        reply.status(400).send({ success: false, error: 'Missing vaultId parameter' });
        return;
      }
      const insights = await analytics.generateMarketInsights(targetVault);
      return { success: true, data: insights };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to generate insights' });
    }
  });

  // Get yield predictions for all strategies in a vault. Shows where yields
  // might be heading in the next week and month, plus confidence levels.
  // Informational only
  fastify.get<{ Querystring: { vaultId?: Address } }>(
    '/predictions',
    async (request: FastifyRequest<{ Querystring: { vaultId?: Address } }>, reply: FastifyReply) => {
    try {
      const { vaultId } = request.query;
      const targetVault = vaultId || process.env.DEFAULT_VAULT_ID;
      if (!targetVault) {
        reply.status(400).send({ success: false, error: 'Missing vaultId parameter' });
        return;
      }
      const predictions = await analytics.predictYieldTrends(targetVault);
      return { success: true, data: predictions };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ success: false, error: 'Failed to generate predictions' });
    }
  });
}
