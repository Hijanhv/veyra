import { FastifyInstance } from 'fastify'
import { AnalyticsEngine } from '../services/AnalyticsEngine.js'

export async function analyticsRoutes(fastify: FastifyInstance) {
  const analytics = new AnalyticsEngine()

  // Get market insights
  fastify.get('/insights', async (request, reply) => {
    try {
      const insights = await analytics.generateMarketInsights()
      return {
        success: true,
        data: insights
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: 'Failed to generate insights'
      })
    }
  })

  // Get yield predictions
  fastify.get('/predictions', async (request, reply) => {
    try {
      const predictions = await analytics.predictYieldTrends()
      return {
        success: true,
        data: predictions
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: 'Failed to generate predictions'
      })
    }
  })
}