import { $api } from '@/api/client'

/**
 * TanStack Query hook for GET /stat-actions/{statActionId}/parcels
 *
 * Fetches the collection of all statutory action parcels.
 *
 * @example
 * const { data, isPending, error } = useGetParcels(3100);
 * if (data) {
 *   const parcels = data.parcels; // fully typed
 * }
 */
export function useGetParcels(statActionId: number) {
  return $api.useQuery('get', '/stat-actions/{statActionId}/parcels', {
    params: {
      path: {
        statActionId,
      },
    },
  })
}
