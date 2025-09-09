export type FlowRow = {
  id: string
  vault: `0x${string}`
  action: 'deposit' | 'withdrawal'
  sender?: `0x${string}`
  owner?: `0x${string}`
  receiver?: `0x${string}` | null
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

export type HarvestRow = {
  id: string
  vault: `0x${string}`
  totalYield: string
  blockNumber: number
  timestamp: number
  transactionHash: `0x${string}`
}

export type Paginated<T> = { items: T[]; nextOffset: number; hasMore: boolean }

// Ponder API base URL
const ponderUrl = process.env.NODE_ENV === 'production' 
  ? process.env.PONDER_API_URL || 'http://indexer:42069'
  : 'http://localhost:42069'

// Helper function to handle fetch errors
async function handleFetch<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Unknown API error')
    }
    return data.data
  } catch (error) {
    const err = error as Error
    console.error('Ponder API error:', err.message)
    err.name = 'IndexerUnavailable'
    err.message = 'Failed to query Ponder API. Ensure indexer service is running.'
    throw err
  }
}

export async function fetchFlows(vault: string, limit = 50, offset = 0): Promise<FlowRow[]> {
  const url = `${ponderUrl}/vaults/${vault}/flows?limit=${limit}&offset=${offset}`
  const result = await handleFetch<Paginated<FlowRow>>(url)
  return result.items
}

export async function fetchRebalances(vault: string, limit = 50, offset = 0): Promise<RebalanceRow[]> {
  const url = `${ponderUrl}/vaults/${vault}/rebalances?limit=${limit}&offset=${offset}`
  const result = await handleFetch<Paginated<RebalanceRow>>(url)
  return result.items
}

export async function fetchHarvests(vault: string, limit = 50, offset = 0): Promise<HarvestRow[]> {
  const url = `${ponderUrl}/vaults/${vault}/harvests?limit=${limit}&offset=${offset}`
  const result = await handleFetch<Paginated<HarvestRow>>(url)
  return result.items
}

export async function listStrategyEvents(
  vault: string,
  limit = 50,
  offset = 0,
  type?: StrategyEventItem['eventType']
): Promise<Paginated<StrategyEventItem>> {
  const typeParam = type ? `&type=${type}` : ''
  const url = `${ponderUrl}/vaults/${vault}/strategy-events?limit=${limit}&offset=${offset}${typeParam}`
  return await handleFetch<Paginated<StrategyEventItem>>(url)
}