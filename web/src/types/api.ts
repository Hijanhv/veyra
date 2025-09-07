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

export interface MarketInsights {
  marketSentiment: string
  topOpportunities: Array<{ strategy: Address; apy: number; reasoning: string }>
  riskFactors: string[]
  timestamp: string
}

export interface YieldPredictions {
  predictions: Record<Address, { nextWeek: number; nextMonth: number; confidence: number }>
  methodology: string
}

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
