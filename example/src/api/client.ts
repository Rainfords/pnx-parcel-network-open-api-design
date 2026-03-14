import createClient from 'openapi-fetch'
import createQueryClient from 'openapi-react-query'
import type { paths } from './openapi-types'

/**
 * Creates a typed OpenAPI client for the Statutory Action Parcels API
 *
 * Configuration:
 * - Base URL: https://api.statutory-actions.local/v1 (configure via environment variable in production)
 * - Auth: Bearer token (inject via headers or interceptor)
 */
export const client = createClient<paths>({
  baseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://api.statutory-actions.local/v1',
})

/**
 * Creates TanStack Query wrappers around the OpenAPI client
 * Provides useQuery, useMutation, useInfiniteQuery hooks
 */
export const $api = createQueryClient(client)
