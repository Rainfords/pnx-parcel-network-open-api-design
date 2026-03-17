# Integration Guide — OpenAPI Spec to React Client

This guide explains the full pipeline for consuming the Statutory Action Parcels OpenAPI specification in a React frontend.

## The Complete Flow

```
┌──────────────────────────────┐
│   openapi/openapi.yaml       │  ← OpenAPI 3.0.3 specification
│   (GET/PATCH /statutory-actions/{statActionId}) │
└──────────┬────────────────────┘
           │
           ├─→ cd openapi && npm run lint          (validate spec)
           ├─→ cd openapi && npm run build-docs    (generate HTML docs)
           └─→ npm run codegen (from root)         (generate TypeScript types)
                    │
                    ↓
           ┌─────────────────────────────┐
           │   openapi-types.ts          │  ← Generated types
           │   (ParcelRow union, etc)    │
           └─────────┬───────────────────┘
                     │
                     ├─→ createClient<paths>()
                     ├─→ $api.useMutation()
                     └─→ Full type safety in React
                          │
                          ↓
           ┌─────────────────────────────────────┐
           │   ParcelTable.tsx                   │  ← React component
           │   (form with table, add/edit/delete)│
           └─────────────────────────────────────┘
```

## Step 1: Define the OpenAPI Spec

The spec is already defined in `openapi.yaml`:

- Endpoints: `GET /statutory-actions/{statActionId}` and `PATCH /statutory-actions/{statActionId}`
- Required path param: `statActionId` (integer)
- Request: `PatchParcelsRequest` with array of `ParcelRow` objects
- Response: `PatchParcelsResponse` with per-row results
- Operations: `create`, `update`, `delete` (discriminated union on `operation` field)

See `/openapi.yaml` and `/README.md` for full details.

## Step 2: Validate the Spec

```bash
npm run lint
npm run build-docs
```

This ensures:
- No schema violations
- All required fields documented
- Examples are correct
- Documentation is generated

## Step 3: Generate TypeScript Types

```bash
npm run codegen
```

This command:
1. Reads `openapi.yaml`
2. Generates `example/src/api/openapi-types.ts` (DO NOT EDIT)
3. Produces types for:
   - `paths` — typed endpoint definitions
   - `components.schemas.*` — all schema types

### Generated Key Types

```typescript
// From the spec's discriminator pattern:
type ParcelRow = CreateParcelRow | UpdateParcelRow | DeleteParcelRow;

// Each variant has a literal operation field:
interface CreateParcelRow {
  operation: "create";
  purpose: string;
  purposeStatus: string;
  name: string;
  comments?: string | null;
  imageId?: number | null;
}

interface UpdateParcelRow {
  operation: "update";
  parcelId: number;
  purpose?: string;
  // ... other fields optional
}

interface DeleteParcelRow {
  operation: "delete";
  parcelId: number;
}

// Request/response types:
interface PatchParcelsRequest {
  rows: ParcelRow[];
}

interface PatchParcelsResponse {
  results: ParcelRowResult[];
}
```

## Step 4: Set Up the API Client

In `example/src/api/client.ts`:

```typescript
import createClient from 'openapi-fetch';
import createQueryClient from 'openapi-react-query';
import type { paths } from './openapi-types';

// Creates a typed fetch client
export const client = createClient<paths>({
  baseUrl: 'https://api.statutory-actions.local/v1',
});

// Wraps it for TanStack Query
export const $api = createQueryClient(client);
```

This setup:
- ✅ Ensures all API calls are typed
- ✅ Integrates with TanStack Query for state management
- ✅ Handles auth headers
- ✅ Provides mutation hooks

## Step 5: Create a Mutation Hook

In `example/src/hooks/usePatchParcels.ts`:

```typescript
export function usePatchParcels(options?: any) {
  return $api.useMutation('patch', '/statutory-actions/{statActionId}', options);
}
```

This hook:
- ✅ Has request type: `PatchParcelsRequest`
- ✅ Has response type: `PatchParcelsResponse`
- ✅ Has error type: `ErrorResponse`
- ✅ Integrates with TanStack Query `useMutation`

## Step 6: Use in React Components

In your component:

```typescript
import { usePatchParcels } from '@/hooks/usePatchParcels';

export function MyForm() {
  const statActionId = 3100;
  const { mutate, isPending, data, error } = usePatchParcels({
    onSuccess: (response) => {
      console.log('Results:', response.results);
    },
  });

  const handleSubmit = () => {
    mutate({
      params: {
        path: {
          statActionId,
        },
      },
      body: {
        rows: [
          {
            operation: 'create',
            purpose: 'Residential',
            purposeStatus: 'Active',
            name: 'Lot A',
          },
          {
            operation: 'update',
            parcelId: 42,
            purpose: 'Commercial',
          },
          {
            operation: 'delete',
            parcelId: 99,
          },
        ],
      },
    });
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {error && <div>Error: {JSON.stringify(error)}</div>}
      {data && <div>Results: {data.results.length} rows processed</div>}
    </div>
  );
}
```

### Type Safety Benefits

- ✅ **Request body** — TypeScript enforces correct structure for `rows[]`
- ✅ **Discriminated union** — TypeScript narrows `ParcelRow` type based on `operation`
- ✅ **Response shape** — Autocomplete on `response.results[].status`
- ✅ **Error handling** — Type-safe error shape via `ErrorResponse`

### Discriminated Union Example

```typescript
rows.forEach((row) => {
  // TypeScript narrows the type automatically:
  if (row.operation === 'create') {
    // row is CreateParcelRow
    // row.parcelId is not available (forbidden in schema)
    console.log(row.name); // ✅ available
  } else if (row.operation === 'update') {
    // row is UpdateParcelRow
    // row.parcelId is required
    console.log(row.parcelId); // ✅ available
  } else if (row.operation === 'delete') {
    // row is DeleteParcelRow
    // only parcelId is available
    console.log(row.parcelId); // ✅ available
  }
});
```

## Step 7: Handle Partial Success

When some rows fail and others succeed, the API response includes per-row `status: "error"` results:

```typescript
const { mutate } = usePatchParcels({
  onSuccess: (response) => {
    const failed = response.results.filter((r) => r.status === 'error');
    if (failed.length > 0) {
      failed.forEach((result) => {
        console.error(`Row ${result.parcelId} failed: ${result.error}`);
      });
      return;
    }
    console.log('All rows saved');
  },
});
```

## Complete Example App

The `example/` directory contains a full React app demonstrating:

- Table-based form with add/edit/delete UX
- Type-safe API calls via `usePatchParcels`
- Error display and state sync
- 207 partial failure handling

Run it:

```bash
cd example
npm install
npm run dev
```

Open http://localhost:5173 and try:
1. Adding rows
2. Editing cells
3. Deleting rows
4. Clicking "Submit Changes"

## Integrating Into Your Own App

1. **Install dependencies**:
   ```bash
   npm install @tanstack/react-query openapi-fetch openapi-react-query
   ```

2. **Copy client setup**:
   ```bash
   cp -r example/src/api your-app/src/
   cp -r example/src/hooks your-app/src/
   ```

3. **Regenerate types** whenever spec changes:
   ```bash
   npm run codegen
   ```

4. **Use the hook**:
   ```typescript
   import { usePatchParcels } from '@/hooks/usePatchParcels';
   // ... see step 6 above
   ```

## Authentication

To add bearer token authentication to all requests:

```typescript
// example/src/api/client.ts
export const client = createClient<paths>({
  baseUrl: 'https://api.statutory-actions.local/v1',
  headers: {
    Authorization: `Bearer ${getAccessToken()}`,
  },
});
```

Or for dynamic tokens, use interceptors:

```typescript
const client = createClient<paths>({
  baseUrl: 'https://api.statutory-actions.local/v1',
});

// Intercept all requests
const originalFetch = client.fetch;
client.fetch = async (url, init) => {
  const token = await getAccessToken();
  const headers = init?.headers ? new Headers(init.headers) : new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  return originalFetch(url, { ...init, headers });
};
```

## Troubleshooting

### Types not updating after spec change

```bash
npm run codegen
```

### API base URL not working

Check `VITE_API_BASE_URL` environment variable:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1 npm run dev
```

### Build errors about missing types

Ensure `npm install` ran in `example/`:

```bash
cd example && npm install
```

### TanStack Query caching not working as expected

Check `queryClient.defaultOptions` in `example/src/main.tsx`. Mutations don't cache by default; use `gcTime` and `staleTime` if needed.

## References

- **OpenAPI Spec**: `./openapi/openapi.yaml`
- **Redocly Config**: `./openapi/redocly.yaml`
- **Spec Validation**: `cd openapi && npm run lint`, `npm run build-docs`
- **Type Generation**: `npm run codegen` (from root)
- **Example App**: `./example/`
- **Generated Types**: `./example/src/api/openapi-types.ts`
- **API Client**: `./example/src/api/client.ts`
- **Mutation Hook**: `./example/src/hooks/usePatchParcels.ts`
- **Demo Component**: `./example/src/components/ParcelTable.tsx`

## Tools Used

| Tool | Purpose |
|------|---------|
| **openapi-typescript** | Generate TypeScript types from OpenAPI spec |
| **openapi-fetch** | Typed fetch wrapper |
| **openapi-react-query** | TanStack Query integration |
| **@tanstack/react-query** | Server state management |
| **Vite** | React app build tool |
| **@redocly/cli** | Spec validation & docs |

## Next Steps

1. ✅ Review the generated types in `example/src/api/openapi-types.ts`
2. ✅ Run the example app: `cd example && npm run dev`
3. ✅ Integrate the API client into your own React app
4. ✅ Implement the backend service using the same OpenAPI spec
5. ✅ Point `VITE_API_BASE_URL` to your backend and test end-to-end
