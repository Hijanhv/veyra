import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getAgentDecisions, getStrategyEvents, getVaultFlows, getVaultRebalances, getVaultHarvests } from '@/lib/api'
import type { ApiResponse, AgentDecisionItem, StrategyEventItem, Paginated, VaultFlowItem, VaultRebalanceItem, VaultHarvestItem } from '@/types/api'

export function useAgentDecisionsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<AgentDecisionItem[]>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<AgentDecisionItem[]>>({
    queryKey: vaultId ? ['analytics', 'agent-decisions', vaultId] : ['analytics', 'agent-decisions', 'nil'],
    queryFn: () => getAgentDecisions(vaultId as string),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useStrategyEventsQuery(
  vaultId: string | undefined,
  params?: { type?: 'deposit' | 'withdrawal' | 'allocation_updated'; limit?: number; offset?: number },
  options?: Omit<UseQueryOptions<ApiResponse<Paginated<StrategyEventItem>>>, 'queryKey' | 'queryFn'>
) {
  const key = [
    'analytics',
    'strategy-events',
    vaultId || 'nil',
    params?.type || 'all',
    params?.limit ?? 50,
    params?.offset ?? 0,
  ]
  return useQuery<ApiResponse<Paginated<StrategyEventItem>>>({
    queryKey: key,
    queryFn: () => getStrategyEvents(vaultId as string, params),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultFlowsQuery(
  vaultId: string | undefined,
  limit = 50,
  offset = 0,
  options?: Omit<UseQueryOptions<ApiResponse<Paginated<VaultFlowItem>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ApiResponse<Paginated<VaultFlowItem>>>({
    queryKey: vaultId ? ['analytics', 'flows', vaultId, limit, offset] : ['analytics', 'flows', 'nil', limit, offset],
    queryFn: () => getVaultFlows(vaultId!, limit, offset),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultRebalancesQuery(
  vaultId: string | undefined,
  limit = 50,
  offset = 0,
  options?: Omit<UseQueryOptions<ApiResponse<Paginated<VaultRebalanceItem>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ApiResponse<Paginated<VaultRebalanceItem>>>({
    queryKey: vaultId ? ['analytics', 'rebalances', vaultId, limit, offset] : ['analytics', 'rebalances', 'nil', limit, offset],
    queryFn: () => getVaultRebalances(vaultId!, limit, offset),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function useVaultHarvestsQuery(
  vaultId: string | undefined,
  limit = 50,
  offset = 0,
  options?: Omit<UseQueryOptions<ApiResponse<Paginated<VaultHarvestItem>>>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ApiResponse<Paginated<VaultHarvestItem>>>({
    queryKey: vaultId ? ['analytics', 'harvests', vaultId, limit, offset] : ['analytics', 'harvests', 'nil', limit, offset],
    queryFn: () => getVaultHarvests(vaultId!, limit, offset),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}
