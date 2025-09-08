import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Address } from '../types/index.js'
import { listStrategyEvents, fetchFlows, fetchRebalances, fetchHarvests } from '../services/PostgresClient.js'

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Strategy events (deposit/withdrawal/allocation_updated) via direct SQL, paginated
  fastify.get<{
    Params: { vaultId: Address }
    Querystring: { limit?: string; offset?: string; type?: 'deposit' | 'withdrawal' | 'allocation_updated' }
  }>(
    '/:vaultId/strategy-events',
    async (
      request: FastifyRequest<{
        Params: { vaultId: Address }
        Querystring: { limit?: string; offset?: string; type?: 'deposit' | 'withdrawal' | 'allocation_updated' }
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { vaultId } = request.params
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)))
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10))
        const type = request.query.type

        const { items, nextOffset, hasMore } = await listStrategyEvents(vaultId, limit, offset, type)
        const mapped = items.map((e) => ({
          id: e.id,
          vault: e.vault,
          strategy: e.strategy,
          eventType: e.eventType,
          amount: e.amount ?? null,
          allocation: e.allocation ?? null,
          blockNumber: e.blockNumber,
          timestamp: e.timestamp,
          txHash: e.transactionHash,
        }))
        return { success: true, data: { items: mapped, nextOffset, hasMore } }
      } catch (error) {
        fastify.log.error(error)
        const e = error as unknown as { name?: string }
        if (e && e.name === 'IndexerUnavailable') {
          return reply.status(503).send({ success: false, error: 'Indexer unavailable. Ensure DATABASE_URL is configured correctly.' })
        }
        reply.status(500).send({ success: false, error: 'Failed to fetch strategy events' })
      }
    }
  )

  // Indexed flows (deposits & withdrawals) via direct SQL, paginated
  fastify.get<{
    Params: { vaultId: Address },
    Querystring: { limit?: string; offset?: string }
  }>(
    '/:vaultId/flows',
    async (
      request: FastifyRequest<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { vaultId } = request.params
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)))
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10))
        const rows = await fetchFlows(vaultId, limit, offset)
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
        }))
        const hasMore = items.length === limit
        return { success: true, data: { items, nextOffset: offset + items.length, hasMore } }
      } catch (error) {
        fastify.log.error(error)
        const e = error as unknown as { name?: string }
        if (e && e.name === 'IndexerUnavailable') {
          return reply.status(503).send({ success: false, error: 'Indexer unavailable. Ensure DATABASE_URL is configured correctly.' })
        }
        reply.status(500).send({ success: false, error: 'Failed to fetch flows' })
      }
    }
  )

  // Indexed rebalances via direct SQL, paginated
  fastify.get<{
    Params: { vaultId: Address },
    Querystring: { limit?: string; offset?: string }
  }>(
    '/:vaultId/rebalances',
    async (
      request: FastifyRequest<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { vaultId } = request.params
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)))
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10))
        const rows = await fetchRebalances(vaultId, limit, offset)
        const items = rows.map((r) => ({
          id: r.id,
          vault: r.vault,
          strategies: r.strategies,
          allocations: r.allocations,
          blockNumber: Number(r.blockNumber),
          timestamp: Number(r.timestamp),
          txHash: r.transactionHash,
        }))
        const hasMore = items.length === limit
        return { success: true, data: { items, nextOffset: offset + items.length, hasMore } }
      } catch (error) {
        fastify.log.error(error)
        const e = error as unknown as { name?: string }
        if (e && e.name === 'IndexerUnavailable') {
          return reply.status(503).send({ success: false, error: 'Indexer unavailable. Ensure DATABASE_URL is configured correctly.' })
        }
        reply.status(500).send({ success: false, error: 'Failed to fetch rebalances' })
      }
    }
  )

  // Indexed yield harvests via direct SQL, paginated
  fastify.get<{
    Params: { vaultId: Address },
    Querystring: { limit?: string; offset?: string }
  }>(
    '/:vaultId/harvests',
    async (
      request: FastifyRequest<{ Params: { vaultId: Address }, Querystring: { limit?: string; offset?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { vaultId } = request.params
        const limit = Math.max(1, Math.min(200, parseInt(request.query.limit ?? '50', 10)))
        const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10))
        const rows = await fetchHarvests(vaultId, limit, offset)
        const items = rows.map((r) => ({
          id: r.id,
          vault: r.vault,
          totalYieldWei: r.totalYield,
          blockNumber: Number(r.blockNumber),
          timestamp: Number(r.timestamp),
          txHash: r.transactionHash,
        }))
        const hasMore = items.length === limit
        return { success: true, data: { items, nextOffset: offset + items.length, hasMore } }
      } catch (error) {
        fastify.log.error(error)
        const e = error as unknown as { name?: string }
        if (e && e.name === 'IndexerUnavailable') {
          return reply.status(503).send({ success: false, error: 'Indexer unavailable. Ensure DATABASE_URL is configured correctly.' })
        }
        reply.status(500).send({ success: false, error: 'Failed to fetch harvests' })
      }
    }
  )
}
