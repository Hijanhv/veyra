import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getInsights, getPredictions } from '@/lib/api'
import { qk } from './queryKeys'
import type { ApiResponse, MarketInsights, YieldPredictions } from '@/types/api'

export function useInsightsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<MarketInsights>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<MarketInsights>>({
    queryKey: vaultId ? qk.analytics.insights(vaultId) : ['analytics', 'insights', 'nil'],
    queryFn: () => getInsights(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function usePredictionsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<YieldPredictions>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<YieldPredictions>>({
    queryKey: vaultId ? qk.analytics.predictions(vaultId) : ['analytics', 'predictions', 'nil'],
    queryFn: () => getPredictions(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}
