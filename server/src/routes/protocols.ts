import { FastifyInstance } from 'fastify'
import { ProtocolService } from '../services/ProtocolService.js'

export async function protocolRoutes(fastify: FastifyInstance) {
  const protocolService = new ProtocolService()

  // Get yield opportunities across all protocols
  fastify.get('/opportunities', async (request, reply) => {
    try {
      const opportunities = await protocolService.getAllYieldOpportunities()
      return {
        success: true,
        data: opportunities,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: 'Failed to fetch yield opportunities'
      })
    }
  })

  // Get specific protocol data
  fastify.get('/:protocol', async (request, reply) => {
    try {
      const { protocol } = request.params as { protocol: string }
      const data = await protocolService.getProtocolData(protocol)
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: `Failed to fetch ${(request.params as any).protocol} data`
      })
    }
  })
}