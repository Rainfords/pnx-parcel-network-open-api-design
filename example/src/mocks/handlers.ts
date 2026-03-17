import { http, HttpResponse } from 'msw'
import type { components } from '@/api/openapi-types'

// In-memory statutory action state seeded from the spec's GET /statutory-actions/{statActionId} example
let statutoryActionData = {
  statutoryActionType: 'Road Closure',
  status: 'Active',
  surveyWorkIdVesting: 22001,
  gazetteYear: '2026',
  gazettePage: 145,
  gazetteType: 'Government Gazette',
  otherLegality: 'Transport Infrastructure Act',
  recordedDate: '2026-02-18T10:25:30Z',
  gazetteNoticeId: 900123,
}

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
  // GET /statutory-actions/{statActionId} — return statutory action metadata and current parcels
  http.get('https://api.statutory-actions.local/v1/statutory-actions/:statActionId', ({ params }) => {
    console.log('[MSW] GET parcels for statActionId:', params.statActionId)
    return HttpResponse.json({
      ...statutoryActionData,
      parcels,
    })
  }),

  // PATCH /statutory-actions/{statActionId} — bulk create/update/delete parcels and update statutory action metadata
  http.patch('https://api.statutory-actions.local/v1/statutory-actions/:statActionId', async ({ request, params }) => {
    const body = (await request.json()) as components['schemas']['PatchParcelsRequest']
    console.log('[MSW] PATCH parcels request:', { statActionId: params.statActionId, body })
    
    // Update statutory action metadata if provided
    const actionFields = ['statutoryActionType', 'status', 'gazetteYear', 'gazettePage', 'gazetteType', 'otherLegality', 'gazetteNoticeId']
    actionFields.forEach((field) => {
      if (field in body && body[field as keyof typeof body] !== undefined) {
        statutoryActionData = {
          ...statutoryActionData,
          [field]: body[field as keyof typeof body],
        }
      }
    })
    
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
    console.log('[MSW] PATCH parcels response:', { statActionId: params.statActionId, status: statusCode, body: response })

    return HttpResponse.json(response, { status: statusCode })
  }),
]
