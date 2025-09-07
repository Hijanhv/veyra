export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
import type {
  ApiResponse,
  Address,
  MarketInsights,
  YieldPredictions,
  VaultMetrics,
  RecommendedAllocation,
  RebalanceRecommendation,
  RebalanceResult,
  StrategyDetails,
  VaultOverview,
} from '@/types/api'

function isHeaders(x: HeadersInit): x is Headers {
  return typeof Headers !== 'undefined' && x instanceof Headers
}

function normalizeHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {}
  if (Array.isArray(h)) return Object.fromEntries(h as Array<[string, string]>)
  if (isHeaders(h)) return Object.fromEntries(h.entries())
  return { ...(h as Record<string, string>) }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = { 'Content-Type': 'application/json', ...normalizeHeaders(init?.headers) }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

// Health
export const getHealth = () => http('/health')

// Vault catalog
export const getVaults = () => http<ApiResponse<{ vaults: Address[]; defaultVaultId: Address | null }>>('/api/vaults')

// Analytics
export const getInsights = (vaultId: Address) => http<ApiResponse<MarketInsights>>(`/api/analytics/insights?vaultId=${vaultId}`)
export const getPredictions = (vaultId: Address) => http<ApiResponse<YieldPredictions>>(`/api/analytics/predictions?vaultId=${vaultId}`)

// Vaults
export const getVaultMetrics = (vaultId: Address) => http<ApiResponse<VaultMetrics>>(`/api/vaults/${vaultId}/metrics`)
export const getStrategyRecommendation = (vaultId: Address) => http<ApiResponse<RecommendedAllocation>>(`/api/vaults/${vaultId}/strategy`)
export const getAIRebalance = (vaultId: Address) => http<ApiResponse<RebalanceRecommendation>>(`/api/vaults/${vaultId}/ai-rebalance`)
export const getStrategyDetails = (vaultId: Address) => http<ApiResponse<StrategyDetails[]>>(`/api/vaults/${vaultId}/strategies/analysis`)
export const getVaultOverview = (vaultId: Address) => http<ApiResponse<VaultOverview>>(`/api/vaults/${vaultId}/overview`)
