import { $api } from '@/api/client'

/**
 * TanStack Query mutation hook for PATCH /parcels
 *
 * Handles bulk create/update/delete operations on parcel rows.
 *
 * @example
 * const { mutate, isPending, error, data } = usePatchParcels({
 *   onSuccess: (response) => {
 *     if (response.status === 207) {
 *       // Handle partial success
 *       const failed = response.body.results.filter(r => r.status === 'error')
 *     }
 *   },
 * })
 *
 * mutate({
 *   body: {
 *     rows: [
 *       { operation: 'create', purpose: 'Residential', purposeStatus: 'Active', name: 'Lot A' },
 *       { operation: 'update', parcelId: 42, purpose: 'Commercial' },
 *       { operation: 'delete', parcelId: 99 },
 *     ]
 *   }
 * })
 */
export function usePatchParcels(options?: any) {
  return $api.useMutation('patch', '/parcels', options)
}
