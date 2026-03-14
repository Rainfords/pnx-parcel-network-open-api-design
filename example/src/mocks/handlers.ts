import { http, HttpResponse } from 'msw'
import type { components } from '@/api/openapi-types'

// In-memory state seeded from the spec's GET /parcels example
let parcels: components['schemas']['Parcel'][] = [
  {
    parcelId: 3100000,
    appellation: 'Lot A, Block 1',
    action: 'Create',
    parcelIntent: 'Road',
    purpose: 'Land Declared Road',
    purposeStatus: 'Current',
    name: 'Lot A',
    comments: null,
    imageId: 4100000,
  },
  {
    parcelId: 3100001,
    appellation: 'Lot B, Block 2',
    action: 'Extinguished',
    parcelIntent: 'DCDB',
    purpose: 'Land Declared Road',
    purposeStatus: 'Historic',
    name: 'Lot B',
    comments: 'Legacy parcel',
    imageId: null,
  },
]

let nextParcelId = 3100002

export const handlers = [
  // GET /parcels — return current state
  http.get('https://api.statutory-actions.local/v1/parcels', () => {
    return HttpResponse.json({
      parcels,
    })
  }),

  // PATCH /parcels — bulk create/update/delete
  http.patch('https://api.statutory-actions.local/v1/parcels', async ({ request }) => {
    const body = (await request.json()) as components['schemas']['PatchParcelsRequest']
    console.log('[MSW] PATCH /parcels request:', body)
    const results: components['schemas']['ParcelRowResult'][] = []

    for (const row of body.rows) {
      if (row.operation === 'create') {
        // Generate new parcel ID
        const newParcel: components['schemas']['Parcel'] = {
          parcelId: nextParcelId,
          appellation: null,
          action: null,
          parcelIntent: null,
          purpose: row.purpose || null,
          purposeStatus: row.purposeStatus || null,
          name: row.name || null,
          comments: row.comments || null,
          imageId: row.imageId || null,
        }
        parcels.push(newParcel)
        results.push({
          operation: 'create',
          parcelId: nextParcelId,
          status: 'success',
        })
        nextParcelId++
      } else if (row.operation === 'update') {
        const index = parcels.findIndex((p) => p.parcelId === row.parcelId)
        if (index !== -1) {
          // Merge fields from update row
          const updated = { ...parcels[index] }
          if (row.purpose !== undefined) updated.purpose = row.purpose
          if (row.purposeStatus !== undefined) updated.purposeStatus = row.purposeStatus
          if (row.name !== undefined) updated.name = row.name
          if (row.comments !== undefined) updated.comments = row.comments
          if (row.imageId !== undefined) updated.imageId = row.imageId
          parcels[index] = updated
          results.push({
            operation: 'update',
            parcelId: row.parcelId,
            status: 'success',
          })
        } else {
          results.push({
            operation: 'update',
            parcelId: row.parcelId,
            status: 'error',
            error: 'Parcel not found',
          })
        }
      } else if (row.operation === 'delete') {
        const index = parcels.findIndex((p) => p.parcelId === row.parcelId)
        if (index !== -1) {
          parcels.splice(index, 1)
          results.push({
            operation: 'delete',
            parcelId: row.parcelId,
            status: 'success',
          })
        } else {
          results.push({
            operation: 'delete',
            parcelId: row.parcelId,
            status: 'error',
            error: 'Parcel not found',
          })
        }
      }
    }

    // Check if all succeeded
    const hasErrors = results.some((r) => r.status === 'error')
    const statusCode = hasErrors ? 207 : 200

    const response = {
      results,
    }
    console.log('[MSW] PATCH /parcels response:', { status: statusCode, body: response })

    return HttpResponse.json(response, { status: statusCode })
  }),
]
