import { useQuery, UseQueryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVaultMetrics, getStrategyRecommendation, getAIRebalance, postAIRebalance, getStrategyDetails, ApiResponse } from '@/lib/api'
import { qk } from './queryKeys'

export function useVaultMetricsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.metrics(vaultId) : ['vaults', 'nil', 'metrics'],
    queryFn: () => getVaultMetrics(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyRecommendationQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.strategy(vaultId) : ['vaults', 'nil', 'strategy'],
    queryFn: () => getStrategyRecommendation(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useAIRebalanceQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.aiRebalance(vaultId) : ['vaults', 'nil', 'ai-rebalance'],
    queryFn: () => getAIRebalance(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyDetailsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.details(vaultId) : ['vaults', 'nil', 'strategies', 'analysis'],
    queryFn: () => getStrategyDetails(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useExecuteRebalanceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vaultId: string) => postAIRebalance(vaultId),
    onSuccess: (_data, vaultId) => {
      if (!vaultId) return
      qc.invalidateQueries({ queryKey: qk.vaults.aiRebalance(vaultId) })
      qc.invalidateQueries({ queryKey: qk.vaults.metrics(vaultId) })
      qc.invalidateQueries({ queryKey: qk.vaults.strategy(vaultId) })
      qc.invalidateQueries({ queryKey: qk.vaults.details(vaultId) })
    }
  })
}

