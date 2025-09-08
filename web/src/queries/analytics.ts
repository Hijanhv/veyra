import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getAgentDecisions } from '@/lib/api'
import type { ApiResponse, AgentDecisionItem } from '@/types/api'

export function useAgentDecisionsQuery(vaultId: string | undefined, options?: Omit<UseQueryOptions<ApiResponse<AgentDecisionItem[]>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<AgentDecisionItem[]>>({
    queryKey: vaultId ? ['analytics', 'agent-decisions', vaultId] : ['analytics', 'agent-decisions', 'nil'],
    queryFn: () => getAgentDecisions(vaultId as string),
    enabled: !!vaultId && (options?.enabled ?? true),
    ...options,
  })
}
