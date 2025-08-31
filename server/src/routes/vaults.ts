import { FastifyInstance } from 'fastify'
import { VaultService } from '../services/VaultService.js'

export async function vaultRoutes(fastify: FastifyInstance) {
  const vaultService = new VaultService()

  // Get vault performance metrics
  fastify.get('/:vaultId/metrics', async (request, reply) => {
    try {
      const { vaultId } = request.params as { vaultId: string }
      const metrics = await vaultService.getVaultMetrics(vaultId)
      return {
        success: true,
        data: metrics
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch vault metrics'
      })
    }
  })

  // Get AI strategy recommendations
  fastify.get('/:vaultId/strategy', async (request, reply) => {
    try {
      const { vaultId } = request.params as { vaultId: string }
      const strategy = await vaultService.getOptimalStrategy(vaultId)
      return {
        success: true,
        data: strategy
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: 'Failed to generate strategy'
      })
    }
  })
}