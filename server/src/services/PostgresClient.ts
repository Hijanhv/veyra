import { setDatabaseSchema } from '@ponder/client'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { desc, eq, and } from 'drizzle-orm'
import * as schema from '../../ponder.schema.js'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Set the database schema based on environment
const dbSchema = process.env.NODE_ENV === 'production'
  ? process.env.INDEXER_VIEWS_SCHEMA
  : process.env.INDEXER_DEV_SCHEMA

// Configure Drizzle with the correct schema 
if (dbSchema) {
  setDatabaseSchema(schema, dbSchema)
}
const db = drizzle(pool, { schema, casing: 'snake_case' })

export type FlowRow = {
  id: string
  vault: `0x${string}`
  action: 'deposit' | 'withdrawal'
  sender?: `0x${string}`
  owner?: `0x${string}`
  receiver?: `0x${string}`
  assets: string // bigint as string
  shares: string // bigint as string
  blockNumber: number
  timestamp: number
  transactionHash: `0x${string}`
}

export type RebalanceRow = {
  id: string
  vault: `0x${string}`
  strategies: string[]
  allocations: string[]
  blockNumber: number
  timestamp: number
  transactionHash: `0x${string}`
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

// Helper function to handle database errors
function handleDbError(e: any): never {
  const err = e as Error
  console.error('Database error:', err.message)
  err.name = 'IndexerUnavailable'
  err.message = 'Failed to query indexer via Drizzle. Ensure Postgres is running and DATABASE_URL is correct.'
  throw err
}

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

pool.on('connect', (client) => {
  console.log('Database client connected')
})

pool.on('remove', (client) => {
  console.log('Database client removed')
})

export async function fetchFlows(vault: string, limit = 50, offset = 0): Promise<FlowRow[]> {
  try {
    const v = vault.toLowerCase() as `0x${string}`
    const size = Math.max(1, limit + offset)

    // Fetch deposits
    const deposits = await db
      .select()
      .from(schema.deposits)
      .where(eq(schema.deposits.vault, v))
      .orderBy(desc(schema.deposits.timestamp))
      .limit(size)

    // Fetch withdrawals
    const withdrawals = await db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.vault, v))
      .orderBy(desc(schema.withdrawals.timestamp))
      .limit(size)

    // Map deposits
    const depositsMapped: FlowRow[] = deposits.map((r) => ({
      id: r.id,
      vault: r.vault as `0x${string}`,
      action: 'deposit' as const,
      sender: r.sender as `0x${string}`,
      owner: r.owner as `0x${string}`,
      receiver: undefined,
      assets: (r.assets as bigint).toString(),
      shares: (r.shares as bigint).toString(),
      blockNumber: Number(r.blockNumber as bigint),
      timestamp: Number(r.timestamp as bigint),
      transactionHash: r.transactionHash as `0x${string}`,
    }))

    // Map withdrawals
    const withdrawalsMapped: FlowRow[] = withdrawals.map((r) => ({
      id: r.id,
      vault: r.vault as `0x${string}`,
      action: 'withdrawal' as const,
      sender: r.sender as `0x${string}`,
      owner: r.owner as `0x${string}`,
      receiver: r.receiver as `0x${string}`,
      assets: (r.assets as bigint).toString(),
      shares: (r.shares as bigint).toString(),
      blockNumber: Number(r.blockNumber as bigint),
      timestamp: Number(r.timestamp as bigint),
      transactionHash: r.transactionHash as `0x${string}`,
    }))

    // Merge, sort by timestamp desc, and paginate
    const merged = [...depositsMapped, ...withdrawalsMapped]
    merged.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    return merged.slice(offset, offset + limit)
  } catch (e) {
    handleDbError(e)
  }
}

export async function fetchRebalances(vault: string, limit = 50, offset = 0): Promise<RebalanceRow[]> {
  try {
    const v = vault.toLowerCase() as `0x${string}`

    const result = await db
      .select()
      .from(schema.rebalances)
      .where(eq(schema.rebalances.vault, v))
      .orderBy(desc(schema.rebalances.timestamp))
      .limit(limit)
      .offset(offset)

    const mapped: RebalanceRow[] = result.map((r) => ({
      id: r.id,
      vault: r.vault as `0x${string}`,
      strategies: r.strategies,
      allocations: (r.allocations as bigint[]).map((a) => a.toString()),
      blockNumber: Number(r.blockNumber as bigint),
      timestamp: Number(r.timestamp as bigint),
      transactionHash: r.transactionHash as `0x${string}`,
    }))
    return mapped
  } catch (e) {
    handleDbError(e)
  }
}

export async function fetchHarvests(
  vault: string,
  limit = 50,
  offset = 0
): Promise<Array<{ id: string; vault: `0x${string}`; totalYield: string; blockNumber: number; timestamp: number; transactionHash: `0x${string}` }>> {
  try {
    const v = vault.toLowerCase() as `0x${string}`

    const result = await db
      .select()
      .from(schema.yieldHarvests)
      .where(eq(schema.yieldHarvests.vault, v))
      .orderBy(desc(schema.yieldHarvests.timestamp))
      .limit(limit)
      .offset(offset)

    return result.map((r) => ({
      id: r.id,
      vault: r.vault as `0x${string}`,
      totalYield: (r.totalYield as bigint).toString(),
      blockNumber: Number(r.blockNumber as bigint),
      timestamp: Number(r.timestamp as bigint),
      transactionHash: r.transactionHash as `0x${string}`,
    }))
  } catch (e) {
    handleDbError(e)
  }
}

export async function listStrategyEvents(
  vault: string,
  limit = 50,
  offset = 0,
  type?: StrategyEventItem['eventType']
): Promise<Paginated<StrategyEventItem>> {
  try {
    const v = vault.toLowerCase() as `0x${string}`

    const whereClause = type
      ? and(eq(schema.strategyEvents.vault, v), eq(schema.strategyEvents.eventType, type))
      : eq(schema.strategyEvents.vault, v)

    const result = await db
      .select()
      .from(schema.strategyEvents)
      .where(whereClause)
      .orderBy(desc(schema.strategyEvents.timestamp))
      .limit(limit + 1)
      .offset(offset)

    const sliced = result.slice(0, limit)
    const items: StrategyEventItem[] = sliced.map((r) => ({
      id: r.id,
      vault: r.vault as `0x${string}`,
      strategy: r.strategy as `0x${string}`,
      eventType: r.eventType as StrategyEventItem['eventType'],
      amount: r.amount !== null && r.amount !== undefined ? r.amount.toString() : null,
      allocation: r.allocation !== null && r.allocation !== undefined ? r.allocation.toString() : null,
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash as `0x${string}`,
    }))

    const hasMore = result.length > limit
    return { items, nextOffset: offset + items.length, hasMore }
  } catch (e) {
    handleDbError(e)
  }
}

// Graceful shutdown
let isShuttingDown = false

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return
  isShuttingDown = true
  
  console.log(`Received ${signal}. Gracefully shutting down database pool...`)
  try {
    await pool.end()
    console.log('Database pool closed successfully')
  } catch (err) {
    console.error('Error closing database pool:', err)
  }
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Export pool for cleanup if needed
export { pool }
