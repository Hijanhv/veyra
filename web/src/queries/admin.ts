import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { getSchedulerStatus, startScheduler, stopScheduler, ApiResponse } from '@/lib/api'
import { qk } from './queryKeys'

export function useSchedulerStatusQuery(options?: Omit<UseQueryOptions<ApiResponse<any>>, 'queryKey' | 'queryFn'>) {
  return useQuery<ApiResponse<any>>({
    queryKey: qk.scheduler.status,
    queryFn: () => getSchedulerStatus(),
    staleTime: 10_000,
    ...options,
  })
}

export function useStartSchedulerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => startScheduler(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scheduler.status })
    }
  })
}

export function useStopSchedulerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => stopScheduler(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scheduler.status })
    }
  })
}

