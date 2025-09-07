import { createClient, sql } from '@ponder/client'

const SQL_BASE = process.env.PONDER_SQL_URL || 'http://localhost:42069/sql'

// Lazy client to avoid constructing when unused
let _client: ReturnType<typeof createClient> | null = null

function client() {
  if (!_client) _client = createClient(SQL_BASE)
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
    const size = Math.max(1, limit + offset)
    // Select deposits
    const deposits = await db.execute(sql`
      SELECT id, vault, 'deposit' as action, sender, owner, NULL as receiver,
             assets::text as assets, shares::text as shares, "blockNumber", timestamp, "transactionHash"
      FROM deposits WHERE vault = ${vault}
      ORDER BY timestamp DESC
      LIMIT ${size} OFFSET 0;
    `)
    // Select withdrawals
    const withdrawals = await db.execute(sql`
      SELECT id, vault, 'withdrawal' as action, sender, owner, receiver,
             assets::text as assets, shares::text as shares, "blockNumber", timestamp, "transactionHash"
      FROM withdrawals WHERE vault = ${vault}
      ORDER BY timestamp DESC
      LIMIT ${size} OFFSET 0;
    `)
    // Merge and sort by timestamp desc
    const merged = [...(deposits as any[]), ...(withdrawals as any[])] as FlowRow[]
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
    const rows = await db.execute(sql`
      SELECT id, vault, strategies, allocations::text[] as allocations, "blockNumber", timestamp, "transactionHash"
      FROM rebalances WHERE vault = ${vault}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset};
    `)
    return rows as unknown as RebalanceRow[]
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
    const rows = await db.execute(sql`
      SELECT id, vault, "totalYield"::text as "totalYield", "blockNumber", timestamp, "transactionHash"
      FROM yield_harvests WHERE vault = ${vault}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset};
    `)
    return rows as any
  } catch (e) {
    const err = e as Error
    err.name = 'IndexerUnavailable'
    err.message = 'Failed to query indexer via Ponder SQL. Ensure Ponder is running and PONDER_SQL_URL is correct.'
    throw err
  }
}
