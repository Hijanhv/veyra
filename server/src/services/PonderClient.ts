import { createClient, eq, desc } from '@ponder/client'
import * as schema from '../../ponder.schema.js'

const SQL_BASE = process.env.PONDER_SQL_URL || 'http://localhost:42069/sql'

// Lazy client to avoid constructing when unused
let _client: ReturnType<typeof createClient> | null = null

function client() {
  // Enable Drizzle query builder by passing the schema
  if (!_client) _client = createClient(SQL_BASE, { schema })
  return _client
}

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

export async function fetchFlows(vault: string, limit = 50, offset = 0): Promise<FlowRow[]> {
  try {
    const db = client().db
    const v = vault.toLowerCase() as `0x${string}`
    const size = Math.max(1, limit + offset)

    // Typed Drizzle queries
    const depRows = await db
      .select()
      .from(schema.deposits)
      .where(eq(schema.deposits.vault, v))
      .orderBy(desc(schema.deposits.timestamp))
      .limit(size)

    const wdrRows = await db
      .select()
      .from(schema.withdrawals)
      .where(eq(schema.withdrawals.vault, v))
      .orderBy(desc(schema.withdrawals.timestamp))
      .limit(size)

    // Map to unified flow items with stringified bigint fields for JSON safety
    const depositsMapped: FlowRow[] = depRows.map((r) => ({
      id: r.id,
      vault: r.vault,
      action: 'deposit',
      sender: r.sender,
      owner: r.owner,
      receiver: undefined,
      assets: r.assets.toString(),
      shares: r.shares.toString(),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }))

    const withdrawalsMapped: FlowRow[] = wdrRows.map((r) => ({
      id: r.id,
      vault: r.vault,
      action: 'withdrawal',
      sender: r.sender,
      owner: r.owner,
      receiver: r.receiver,
      assets: r.assets.toString(),
      shares: r.shares.toString(),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }))

    // Merge, sort by timestamp desc, and paginate
    const merged = [...depositsMapped, ...withdrawalsMapped]
    merged.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    return merged.slice(offset, offset + limit)
  } catch (e) {
    const err = e as Error
    err.name = 'IndexerUnavailable'
    err.message = 'Failed to query indexer via Ponder SQL. Ensure Ponder is running and PONDER_SQL_URL is correct.'
    throw err
  }
}

export async function fetchRebalances(vault: string, limit = 50, offset = 0): Promise<RebalanceRow[]> {
  try {
    const db = client().db
    const v = vault.toLowerCase() as `0x${string}`
    const rows = await db
      .select()
      .from(schema.rebalances)
      .where(eq(schema.rebalances.vault, v))
      .orderBy(desc(schema.rebalances.timestamp))
      .limit(limit)
      .offset(offset)

    const mapped: RebalanceRow[] = rows.map((r) => ({
      id: r.id,
      vault: r.vault,
      strategies: r.strategies,
      allocations: r.allocations.map((a) => a.toString()),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    }))
    return mapped
  } catch (e) {
    const err = e as Error
    err.name = 'IndexerUnavailable'
    err.message = 'Failed to query indexer via Ponder SQL. Ensure Ponder is running and PONDER_SQL_URL is correct.'
    throw err
  }
}

export async function fetchHarvests(vault: string, limit = 50, offset = 0): Promise<Array<{ id: string; vault: `0x${string}`; totalYield: string; blockNumber: number; timestamp: number; transactionHash: `0x${string}` }>> {
  try {
    const db = client().db
    const v = vault.toLowerCase() as `0x${string}`
    const rows = await db
      .select()
      .from(schema.yieldHarvests)
      .where(eq(schema.yieldHarvests.vault, v))
      .orderBy(desc(schema.yieldHarvests.timestamp))
      .limit(limit)
      .offset(offset)

    return rows.map((r) => ({
      id: r.id,
      vault: r.vault,
      totalYield: r.totalYield.toString(),
      blockNumber: Number(r.blockNumber),
      timestamp: Number(r.timestamp),
      transactionHash: r.transactionHash,
    })) as any
  } catch (e) {
    const err = e as Error
    err.name = 'IndexerUnavailable'
    err.message = 'Failed to query indexer via Ponder SQL. Ensure Ponder is running and PONDER_SQL_URL is correct.'
    throw err
  }
}
