export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

export type ApiResponse<T> = { success: boolean; data: T } | { success: false; error: string }

// Health & admin
export const getHealth = () => http('/health')
export const getSchedulerStatus = () => http<ApiResponse<any>>('/admin/scheduler/status')
export const startScheduler = () => http<ApiResponse<any>>('/admin/scheduler/start', { method: 'POST' })
export const stopScheduler = () => http<ApiResponse<any>>('/admin/scheduler/stop', { method: 'POST' })

// Analytics
export const getInsights = (vaultId: string) => http<ApiResponse<any>>(`/api/analytics/insights?vaultId=${vaultId}`)
export const getPredictions = (vaultId: string) => http<ApiResponse<any>>(`/api/analytics/predictions?vaultId=${vaultId}`)

// Vaults
export const getVaultMetrics = (vaultId: string) => http<ApiResponse<any>>(`/api/vaults/${vaultId}/metrics`)
export const getStrategyRecommendation = (vaultId: string) => http<ApiResponse<any>>(`/api/vaults/${vaultId}/strategy`)
export const getAIRebalance = (vaultId: string) => http<ApiResponse<any>>(`/api/vaults/${vaultId}/ai-rebalance`)
export const postAIRebalance = (vaultId: string) => http<ApiResponse<any>>(`/api/vaults/${vaultId}/ai-rebalance`, { method: 'POST' })
export const getStrategyDetails = (vaultId: string) => http<ApiResponse<any>>(`/api/vaults/${vaultId}/strategies/analysis`)

