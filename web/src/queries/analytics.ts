import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getInsights, getPredictions, ApiResponse } from '@/lib/api'
import { qk } from './queryKeys'

export function useInsightsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.analytics.insights(vaultId) : ['analytics', 'insights', 'nil'],
    queryFn: () => getInsights(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

export function usePredictionsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: vaultId ? qk.analytics.predictions(vaultId) : ['analytics', 'predictions', 'nil'],
    queryFn: () => getPredictions(vaultId!),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}

