import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getVaultMetrics, getStrategyRecommendation, getAIRebalance, getStrategyDetails, getVaults, getVaultOverview, getVaultFlows, getVaultRebalances, getVaultHarvests } from '@/lib/api'
import { qk } from './queryKeys'
import type { ApiResponse, VaultMetrics, RecommendedAllocation, RebalanceRecommendation, StrategyDetails, VaultOverview, Paginated, VaultFlowItem, VaultRebalanceItem, VaultHarvestItem } from '@/types/api'

export function useVaultList(options?: Omit<UseQueryOptions<ApiResponse<{ vaults: string[]; defaultVaultId: string | null }>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<{ vaults: string[]; defaultVaultId: string | null }>>({
    queryKey: qk.vaults.list,
    queryFn: () => getVaults(),
    staleTime: 30_000,
    ...options,
  })
}

export function useVaultMetricsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<VaultMetrics>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<VaultMetrics>>({
    queryKey: vaultId ? qk.vaults.metrics(vaultId) : ['vaults', 'metrics', 'nil'],
    queryFn: () => getVaultMetrics(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyRecommendationQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<RecommendedAllocation | null>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<RecommendedAllocation | null>>({
    queryKey: vaultId ? qk.vaults.strategy(vaultId) : ['vaults', 'strategy', 'nil'],
    queryFn: () => getStrategyRecommendation(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useAIRebalanceQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<RebalanceRecommendation>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<RebalanceRecommendation>>({
    queryKey: vaultId ? qk.vaults.aiRebalance(vaultId) : ['vaults', 'ai-rebalance', 'nil'],
    queryFn: () => getAIRebalance(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyDetailsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<StrategyDetails[]>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<StrategyDetails[]>>({
    queryKey: vaultId ? qk.vaults.details(vaultId) : ['vaults', 'details', 'nil'],
    queryFn: () => getStrategyDetails(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultOverviewQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<VaultOverview>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<VaultOverview>>({
    queryKey: vaultId ? qk.vaults.overview(vaultId) : ['vaults', 'overview', 'nil'],
    queryFn: () => getVaultOverview(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultFlowsQuery(vaultId: string | undefined, limit = 50, offset = 0, options?: Omit<UseQueryOptions<ApiResponse<Paginated<VaultFlowItem>>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<Paginated<VaultFlowItem>>>({
    queryKey: vaultId ? qk.vaults.flows(vaultId, limit, offset) : ['vaults', 'flows', 'nil', limit, offset],
    queryFn: () => getVaultFlows(vaultId!, limit, offset),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultRebalancesQuery(vaultId: string | undefined, limit = 50, offset = 0, options?: Omit<UseQueryOptions<ApiResponse<Paginated<VaultRebalanceItem>>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<Paginated<VaultRebalanceItem>>>({
    queryKey: vaultId ? qk.vaults.rebalances(vaultId, limit, offset) : ['vaults', 'rebalances', 'nil', limit, offset],
    queryFn: () => getVaultRebalances(vaultId!, limit, offset),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultHarvestsQuery(vaultId: string | undefined, limit = 50, offset = 0, options?: Omit<UseQueryOptions<ApiResponse<Paginated<VaultHarvestItem>>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<Paginated<VaultHarvestItem>>>({
    queryKey: vaultId ? qk.vaults.harvests(vaultId, limit, offset) : ['vaults', 'harvests', 'nil', limit, offset],
    queryFn: () => getVaultHarvests(vaultId!, limit, offset),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}
