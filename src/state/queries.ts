import { useQuery } from '@tanstack/react-query'
import { configuredSource, services } from '@/services'

/** What is actually serving data right now (mock vs. a reachable backend). */
export function useSourceInfo() {
  return useQuery({
    queryKey: ['system', 'source-info', configuredSource],
    queryFn: () => services.system.getSourceInfo(),
    retry: false,
    staleTime: Infinity,
  })
}
