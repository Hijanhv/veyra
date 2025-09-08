import { createClient, desc, eq, and } from '@ponder/client'
import * as schema from '../../../ponder.schema.js'

const SQL_BASE = process.env.PONDER_SQL_URL || 'http://localhost:42069/sql'

// Create a dedicated typed Ponder client for analytics queries
let _client: ReturnType<typeof createClient> | null = null
function client() {
  if (!_client) _client = createClient(SQL_BASE, { schema })
  return _client
}

export type StrategyEventItem = {
  id: string
  vault: `0x${string}`
  strategy: `0x${string}`
  eventType: 'deposit' | 'withdrawal' | 'allocation_updated'
  amount?: string | null
  allocation?: string | null
  blockNumber: number
  timestamp: number
  transactionHash: `0x${string}`
}

export type Paginated<T> = { items: T[]; nextOffset: number; hasMore: boolean }

export async function listStrategyEvents(
  vault: string,
  limit = 50,
  offset = 0,
  type?: StrategyEventItem['eventType']
): Promise<Paginated<StrategyEventItem>> {
  const db = client().db
  const v = vault.toLowerCase() as `0x${string}`

  const whereExpr = type
    ? and(eq(schema.strategyEvents.vault, v), eq(schema.strategyEvents.eventType, type))
    : eq(schema.strategyEvents.vault, v)

  const rows = await db
    .select()
    .from(schema.strategyEvents)
    .where(whereExpr)
    .orderBy(desc(schema.strategyEvents.timestamp))
    .limit(limit + 1)
    .offset(offset)

  const items: StrategyEventItem[] = rows.slice(0, limit).map((r: typeof schema.strategyEvents.$inferSelect) => ({
    id: r.id,
    vault: r.vault,
    strategy: r.strategy,
    eventType: r.eventType as StrategyEventItem['eventType'],
    amount: r.amount !== null && r.amount !== undefined ? r.amount.toString() : null,
    allocation: r.allocation !== null && r.allocation !== undefined ? r.allocation.toString() : null,
    blockNumber: Number(r.blockNumber),
    timestamp: Number(r.timestamp),
    transactionHash: r.transactionHash,
  }))

  const hasMore = rows.length > limit
  return { items, nextOffset: offset + items.length, hasMore }
}
