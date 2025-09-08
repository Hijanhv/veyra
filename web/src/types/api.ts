// Web-facing API types kept in sync with server

export type Address = string
export type BasisPoints = number // 10000 = 100%

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

export interface VaultMetrics {
  vaultId: Address
  totalAssets: number
  currentApy: number
  strategyAllocation: Record<Address, BasisPoints>
  performance: { daily: number; weekly: number; monthly: number }
}

export type UnderlyingProtocol =
  | { name: 'Lending'; adapter: Address; supplyApy: number; borrowApy: number; healthFactor: number | null }
  | { name: 'Eggs'; adapter: Address; supplyApy: number; borrowApy: number; healthFactor: number | null }
  | { name: 'Rings'; adapter: Address; apr: number }
  | { name: 'Shadow' | 'Beets' | 'SwapX' | 'Dex'; adapter: Address; pool: Address | null; apr: number }
  | { name: 'StS'; adapter: Address; rate: number }
  | { name: 'Pendle'; adapter: Address; stableToken: Address | null }

export interface StrategyDetails {
  strategyAddress: Address
  totalAssets: number
  apy: number // bp
  underlying: UnderlyingProtocol[]
}

// Deprecated: MarketInsights & YieldPredictions removed with analytics endpoints

export interface RecommendedAllocation {
  vaultId: Address
  recommendedAllocation: Record<Address, BasisPoints>
  expectedApy: number
  riskScore: number
  reasoning: string
  confidence: number
  marketContext: string
}

export interface RebalanceRecommendation {
  currentAllocations: Record<Address, BasisPoints>
  recommendedAllocations: Record<Address, BasisPoints>
  needsRebalancing: boolean
  confidence: number
  reasoning: string
  marketContext: string
  expectedApy: number
  riskScore: number
}

export interface RebalanceResult {
  success: boolean
  transactionHash?: string
  error?: string
  oldAllocations: Record<Address, BasisPoints>
  newAllocations: Record<Address, BasisPoints>
  confidence: number
  reasoning: string
}

export type VaultOverview = VaultMetrics & { latestAllocations: Record<Address, BasisPoints> }

export interface SchedulerStatus { isRunning: boolean; vaultCount: number; vaultAddresses: string[] }

// Indexed data (via backend that proxies Ponder)
export interface VaultFlowItem {
  id: string
  vault: Address
  type: 'deposit' | 'withdrawal'
  sender?: Address
  owner?: Address
  receiver?: Address | null
  assetsWei: string
  sharesWei: string
  blockNumber: number
  timestamp: number
  txHash: Address
}

export interface VaultRebalanceItem {
  id: string
  vault: Address
  strategies: Address[]
  allocations: string[]
  blockNumber: number
  timestamp: number
  txHash: Address
}

export interface VaultHarvestItem {
  id: string
  vault: Address
  totalYieldWei: string
  blockNumber: number
  timestamp: number
  txHash: Address
}

export interface StrategyEventItem {
  id: string
  vault: Address
  strategy: Address
  eventType: 'deposit' | 'withdrawal' | 'allocation_updated'
  amount?: string | null
  allocation?: string | null
  blockNumber: number
  timestamp: number
  txHash: Address
}

export interface Paginated<T> {
  items: T[]
  nextOffset: number
  hasMore: boolean
}

export interface AgentDecisionItem {
  id: number
  vault_address: Address
  allocations_json: Record<Address, number>
  expected_apy_bp: number
  risk_score: number
  confidence: number
  reasoning: string | null
  market_context: string | null
  created_at: string | null
}
