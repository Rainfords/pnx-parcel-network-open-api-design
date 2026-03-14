# Statutory Action Parcels — React Client Example

A fully typed React + TypeScript + TanStack Query example client for the Statutory Action Parcels API OpenAPI specification.

## Overview

This example demonstrates:

- ✅ **OpenAPI-to-TypeScript code generation** using `openapi-typescript`
- ✅ **Type-safe API client** using `openapi-fetch`
- ✅ **TanStack Query v5 mutations** via `openapi-react-query`
- ✅ **Discriminated union types** for the `ParcelRow` oneOf schema
- ✅ **Form state management** with bulk create/update/delete
- ✅ **Partial success handling** (207 Multi-Status responses)

## Architecture

```
src/
├── api/
│   ├── openapi-types.ts      # Generated TypeScript types (DO NOT EDIT)
│   └── client.ts             # createClient + createQueryClient setup
├── hooks/
│   └── usePatchParcels.ts    # TanStack Query mutation hook
├── components/
│   └── ParcelTable.tsx       # Demo table component
├── App.tsx                   # Root component
└── main.tsx                  # React + QueryClientProvider entry
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

Opens http://localhost:5173 in your browser.

### 3. Build for production

```bash
npm run build
```

Outputs to `dist/` directory.

## Regenerating Types After Spec Changes

When the OpenAPI spec (`../openapi.yaml`) changes, regenerate the types:

```bash
# From the project root directory:
npm run codegen
```

This runs `openapi-typescript ./openapi.yaml -o ./example/src/api/openapi-types.ts` and updates the generated types in the example.

## Key Patterns

### Type-Safe Mutation Hook

The `usePatchParcels` hook is fully typed from the spec:

```typescript
const { mutate, isPending, error, data } = usePatchParcels({
  onSuccess: (response) => {
    // response.body is typed as PatchParcelsResponse
    const results = response.body.results;
  },
  onError: (error) => {
    // error is typed as ErrorResponse
    console.error(error.body.error);
  },
});

// Calling it with fully typed request body
mutate({
  body: {
    rows: [
      { operation: "create", purpose: "Residential", purposeStatus: "Active", name: "Lot A" },
      { operation: "update", parcelId: 42, purpose: "Commercial" },
      { operation: "delete", parcelId: 99 },
    ],
  },
});
```

### Discriminated Union Type Narrowing

The `ParcelRow` type is generated as a discriminated union:

```typescript
type ParcelRow = CreateParcelRow | UpdateParcelRow | DeleteParcelRow;

// TypeScript narrows correctly:
rows.forEach((row) => {
  if (row.operation === "create") {
    // row is now typed as CreateParcelRow
    // parcelId is forbidden here (not in the type)
  } else if (row.operation === "update") {
    // row is now typed as UpdateParcelRow
    // parcelId is required
  }
});
```

### Handling 207 Multi-Status Responses

When some rows succeed and others fail:

```typescript
onSuccess: (response) => {
  if (response.status === 207) {
    // Check for per-row errors
    const failed = response.body.results.filter((r) => r.status === "error");
    failed.forEach((result) => {
      console.error(`Row ${result.parcelId} failed: ${result.error}`);
    });
  }
},
```

### Server-Assigned IDs for Creates

When a create operation succeeds, the server assigns a `parcelId`:

```typescript
onSuccess: (response) => {
  response.body.results.forEach((result) => {
    if (result.operation === "create" && result.status === "success") {
      console.log(`New parcel assigned ID: ${result.parcelId}`);
    }
  });
},
```

## Demo Table Component

The `ParcelTable.tsx` component demonstrates a common UX pattern:

1. **Local state tracking** — rows have `_operation` field tracking (`"none" | "created" | "modified" | "deleted"`)
2. **Form submission** — computes a diff of pending changes and sends via `usePatchParcels`
3. **Error handling** — displays per-row errors from the API response
4. **State sync** — updates local state with server-assigned IDs and clears pending flags on success

Try:
- Adding rows
- Editing cells
- Deleting rows
- Clicking "Submit Changes"
- Watching the table update with results

## Configuration

### API Base URL

By default, the client points to `https://api.statutory-actions.local/v1`.

To override, set the `VITE_API_BASE_URL` environment variable:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1 npm run dev
```

### Query Client Options

In `src/main.tsx`, you can customize TanStack Query defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 1,
      gcTime: 1000 * 60 * 5, // 5 min cache after mutation
    },
  },
});
```

## Testing the API

To actually call the API, you need a running server that implements the spec at your `VITE_API_BASE_URL`.

For local testing without a server, you can:

1. **Mock the API** — Use MSW (Mock Service Worker) or similar
2. **Use a mock server** — Deploy Prism (open-source OpenAPI mock server)
3. **Implement a stub backend** — Implement the spec in Node/Express, Python, Go, etc.

## Dependencies

- **react** — UI framework
- **react-dom** — React DOM renderer
- **@tanstack/react-query** — Server state management
- **openapi-fetch** — Type-safe fetch client
- **openapi-react-query** — TanStack Query integration
- **typescript** — Type safety
- **vite** — Build tool
- **@vitejs/plugin-react** — React support for Vite

## Advanced Topics

### Partial Updates

The `UpdateParcelRow` schema allows partial updates. Only include fields you want to change:

```typescript
mutate({
  body: {
    rows: [
      {
        operation: "update",
        parcelId: 42,
        purpose: "Commercial", // only update this field
        // purposeStatus, name, comments, imageId omitted
      },
    ],
  },
});
```

### Bearer Token Auth

To add bearer token authentication:

```typescript
// src/api/client.ts
export const client = createClient<paths>({
  baseUrl: "https://api.statutory-actions.local/v1",
  headers: {
    Authorization: `Bearer ${getAuthToken()}`,
  },
});
```

### Custom Error Handling

```typescript
usePatchParcels({
  onError: (error) => {
    if (error.status === 422) {
      // Handle validation errors
      console.error("Validation failed:", error.body.error);
    } else if (error.status === 401) {
      // Handle auth errors
      redirectToLogin();
    }
  },
});
```

## Resources

- [openapi-typescript Documentation](https://openapi-ts.dev/)
- [openapi-react-query Documentation](https://openapi-ts.dev/openapi-react-query/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Vite Documentation](https://vitejs.dev/)
