export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'
import type {
  ApiResponse,
  Address,
  VaultMetrics,
  RecommendedAllocation,
  RebalanceRecommendation,
  StrategyDetails,
  VaultOverview,
  Paginated,
  VaultFlowItem,
  VaultRebalanceItem,
  VaultHarvestItem,
  StrategyEventItem,
  AgentDecisionItem,
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

// Vaults
export const getVaultMetrics = (vaultId: Address) => http<ApiResponse<VaultMetrics>>(`/api/vaults/${vaultId}/metrics`)
export const getStrategyRecommendation = (vaultId: Address) => http<ApiResponse<RecommendedAllocation>>(`/api/vaults/${vaultId}/strategy`)
export const getAIRebalance = (vaultId: Address) => http<ApiResponse<RebalanceRecommendation>>(`/api/vaults/${vaultId}/ai-rebalance`)
export const getStrategyDetails = (vaultId: Address) => http<ApiResponse<StrategyDetails[]>>(`/api/vaults/${vaultId}/strategies/analysis`)
export const getVaultOverview = (vaultId: Address) => http<ApiResponse<VaultOverview>>(`/api/vaults/${vaultId}/overview`)
// Indexed (via backend)
export const getVaultFlows = (vaultId: Address, limit = 50, offset = 0) =>
  http<ApiResponse<Paginated<VaultFlowItem>>>(`/api/analytics/${vaultId}/flows?limit=${limit}&offset=${offset}`)
export const getVaultRebalances = (vaultId: Address, limit = 50, offset = 0) =>
  http<ApiResponse<Paginated<VaultRebalanceItem>>>(`/api/analytics/${vaultId}/rebalances?limit=${limit}&offset=${offset}`)
export const getVaultHarvests = (vaultId: Address, limit = 50, offset = 0) =>
  http<ApiResponse<Paginated<VaultHarvestItem>>>(`/api/analytics/${vaultId}/harvests?limit=${limit}&offset=${offset}`)

// Agent decisions
export const getAgentDecisions = (vaultId: Address) => http<ApiResponse<AgentDecisionItem[]>>(`/api/vaults/${vaultId}/agent/decisions`)

// Analytics (Ponder-backed)
export const getStrategyEvents = (
  vaultId: Address,
  params?: { type?: 'deposit' | 'withdrawal' | 'allocation_updated'; limit?: number; offset?: number }
) => {
  const qp = new URLSearchParams()
  if (params?.type) qp.set('type', params.type)
  if (params?.limit !== undefined) qp.set('limit', String(params.limit))
  if (params?.offset !== undefined) qp.set('offset', String(params.offset))
  const q = qp.toString()
  return http<ApiResponse<Paginated<StrategyEventItem>>>(`/api/analytics/${vaultId}/strategy-events${q ? `?${q}` : ''}`)
}
