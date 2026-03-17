import { $api } from '@/api/client'

/**
 * TanStack Query mutation hook for PATCH /statutory-actions/{statActionId}
 *
 * Handles bulk create/update/delete operations on parcel rows.
 *
 * @example
 * const { mutate, isPending, error, data } = usePatchParcels({
 *   onSuccess: (response) => {
 *     const failed = response.results.filter(r => r.status === 'error')
 *     if (failed.length > 0) {
 *       // Handle partial success
 *     }
 *   },
 * })
 *
 * mutate({
 *   params: { path: { statActionId: 3100 } },
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
  return $api.useMutation('patch', '/statutory-actions/{statActionId}', options)
}
