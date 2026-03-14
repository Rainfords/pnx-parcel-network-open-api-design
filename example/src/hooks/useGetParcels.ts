import { $api } from '@/api/client'

/**
 * TanStack Query hook for GET /parcels
 *
 * Fetches the collection of all statutory action parcels.
 *
 * @example
 * const { data, isPending, error } = useGetParcels();
 * if (data) {
 *   const parcels = data.body.parcels; // fully typed
 * }
 */
export function useGetParcels() {
  return $api.useQuery('get', '/parcels')
}
