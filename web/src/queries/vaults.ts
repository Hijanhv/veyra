import { useQuery, UseQueryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiResponse, getVaultOverview, getVaultFlows, getAllocHistory, getHarvests, getAgentDecisions, getPositions, getVaultMetrics, getStrategyRecommendation, getAIRebalance, getStrategyDetails, postAIRebalance } from '@/lib/api'
import { qk } from './queryKeys'

export function useVaultOverview(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.overview(vaultId) : ['vault','overview','nil'],
    queryFn: () => getVaultOverview(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultFlows(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.flows(vaultId) : ['vault','flows','nil'],
    queryFn: () => getVaultFlows(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useAllocHistory(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.allocHistory(vaultId) : ['vault','alloc-history','nil'],
    queryFn: () => getAllocHistory(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useHarvests(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.harvests(vaultId) : ['vault','harvests','nil'],
    queryFn: () => getHarvests(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useAgentDecisions(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.agentDecisions(vaultId) : ['vault','agent-decisions','nil'],
    queryFn: () => getAgentDecisions(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function usePositions(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.positions(vaultId) : ['vault','positions','nil'],
    queryFn: () => getPositions(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

// Legacy/basic hooks used by vaults page
export function useVaultMetricsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.metrics(vaultId) : ['vaults','metrics','nil'],
    queryFn: () => getVaultMetrics(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyRecommendationQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.strategy(vaultId) : ['vaults','strategy','nil'],
    queryFn: () => getStrategyRecommendation(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useAIRebalanceQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.aiRebalance(vaultId) : ['vaults','ai-rebalance','nil'],
    queryFn: () => getAIRebalance(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyDetailsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.vaults.details(vaultId) : ['vaults','details','nil'],
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
      // Refresh related queries
      qc.invalidateQueries({ queryKey: qk.vaults.aiRebalance(vaultId) })
      qc.invalidateQueries({ queryKey: qk.vaults.overview(vaultId) })
      qc.invalidateQueries({ queryKey: qk.vaults.flows(vaultId) })
      qc.invalidateQueries({ queryKey: qk.vaults.allocHistory(vaultId) })
    }
  })
}
