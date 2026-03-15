# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **full-stack example** demonstrating OpenAPI 3.0.3 specification consumption in a React TypeScript frontend.

**Core components:**
- `openapi.yaml` — OpenAPI 3.0.3 spec defining `PATCH /stat-actions/{statActionId}/parcels` with bulk create/update/delete operations
- `example/` — React + TypeScript client example using type-safe code generation from the spec
- `mocks/` — MSW (Mock Service Worker) browser-level request interception for local testing

**Key pattern:** Discriminated union types (`ParcelRow = CreateParcelRow | UpdateParcelRow | DeleteParcelRow`) automatically generated from OpenAPI spec's `oneOf` discriminator.

## Repository Structure


```
.
├── openapi/                        # OpenAPI spec and Redocly config
│   ├── openapi.yaml               # API specification (PATCH /stat-actions/{statActionId}/parcels, discriminator pattern)
│   ├── redocly.yaml               # Redocly configuration
│   ├── package.json               # Redocly scripts (lint, build-docs, preview, etc.)
│   └── dist/                      # Generated API documentation
├── example/                        # React + TypeScript client example
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts          # createClient + createQueryClient setup
│   │   │   └── openapi-types.ts   # Generated types (DO NOT EDIT)
│   │   ├── hooks/
│   │   │   ├── usePatchParcels.ts # TanStack Query mutation hook
│   │   │   └── useGetParcels.ts   # TanStack Query query hook
│   │   ├── components/
│   │   │   └── ParcelTable.tsx    # Demo component: table with add/edit/delete UX
│   │   ├── mocks/
│   │   │   ├── handlers.ts        # MSW request handlers (in-memory state)
│   │   │   └── browser.ts         # MSW setupWorker export
│   │   ├── main.tsx               # React entry: MSW bootstrap + QueryClientProvider
│   │   └── App.tsx
│   ├── package.json               # npm run dev, build
│   └── README.md
├── package.json                    # Root scripts (codegen only)
├── README.md                       # Project overview
├── DEVELOPMENT.md                  # Spec editing workflow
├── INTEGRATION.md                  # Client integration guide
└── CLAUDE.md                       # This file
```

## Critical Commands

### Root directory
```bash
npm install                    # Install openapi-typescript
npm run codegen               # Generate example/src/api/openapi-types.ts from spec
```

### OpenAPI directory (spec and docs)
```bash
cd openapi && npm install      # Install Redocly CLI
npm run lint                   # Validate openapi.yaml (Redocly rules)
npm run build-docs            # Generate HTML API docs → dist/index.html
npm run preview               # Live-preview spec docs on localhost:8080 (port configurable)
npm run test                  # Full validation: lint + build-docs + stats
```

### Example app
```bash
cd example && npm install     # Install React deps
npm run dev                   # Start Vite dev server (localhost:5173, includes MSW mocking)
npm run build                 # Production build
```

## Critical Architectural Patterns

### 1. Discriminated Union Type Generation
The OpenAPI spec uses `oneOf` with a discriminator on the `operation` field:

```yaml
ParcelRow:
  oneOf:
    - $ref: '#/components/schemas/CreateParcelRow'
    - $ref: '#/components/schemas/UpdateParcelRow'
    - $ref: '#/components/schemas/DeleteParcelRow'
  discriminator:
    propertyName: operation
    mapping:
      create: '#/components/schemas/CreateParcelRow'
      update: '#/components/schemas/UpdateParcelRow'
      delete: '#/components/schemas/DeleteParcelRow'
```

**Generated output:**
```typescript
type ParcelRow = CreateParcelRow | UpdateParcelRow | DeleteParcelRow;

interface CreateParcelRow { operation: 'create'; purpose: string; /* ... */ }
interface UpdateParcelRow { operation: 'update'; parcelId: number; /* ... */ }
interface DeleteParcelRow { operation: 'delete'; parcelId: number; }
```

**Result:** TypeScript automatically narrows types when checking `operation` field. Each variant has correct required/optional fields.

### 2. Response Structure from openapi-react-query
The mutation hook's `onSuccess` callback receives response in this shape:
```typescript
{ results: ParcelRowResult[] }  // Just the parsed response body, no HTTP status
```

**NOT** `{ status, body }` or `{ status, data }`. This is critical for accessing results correctly.

### 3. React StrictMode + setState Pattern
⚠️ **Gotcha:** In development, React StrictMode double-invokes setState callbacks. Mutable state (Sets, Arrays) defined **outside** the callback and mutated **inside** will cause issues on second invocation.

**❌ Wrong:**
```typescript
const processedIds = new Set<string>();
setRows((prev) => {
  // First invoke: adds to processedIds
  // Second invoke: already has items → logic fails
  processedIds.add(id);
  return updated;
});
```

**✅ Correct:**
```typescript
setRows((prev) => {
  const processedIds = new Set<string>();  // Fresh for each invoke
  processedIds.add(id);
  return updated;
});
```

See `ParcelTable.tsx:onSuccess` callback for the applied fix.

### 4. MSW Mock Backend
The example uses MSW v2 to intercept fetch requests in the browser at `https://api.statutory-actions.local/v1/stat-actions/{statActionId}/parcels`. This allows testing the full CRUD flow without a real backend.

**Key files:**
- `src/mocks/handlers.ts` — GET `/stat-actions/{statActionId}/parcels` (returns in-memory parcel array) and PATCH `/stat-actions/{statActionId}/parcels` (processes operations, updates in-memory state)
- `src/mocks/browser.ts` — Exports `setupWorker(...handlers)`
- `src/main.tsx` — Conditionally starts worker in dev mode before rendering

**In-memory state:** Initialized with parcel IDs 3100000–3100001. `nextParcelId` increments for creates.

## Type Generation Workflow

When the OpenAPI spec changes:

```bash
# 1. Edit openapi.yaml
# 2. Validate
npm run lint
npm run build-docs

# 3. Regenerate types
npm run codegen
# This updates example/src/api/openapi-types.ts

# 4. The example app now has updated types (TypeScript will error on misuse)
```

**Critical:** Always run `npm run codegen` after spec changes. The generated file includes request/response types for all endpoints.

## Common Workflows

### Adding a new field to parcels
1. Edit `openapi.yaml` — add field to `Parcel` schema
2. `npm run lint` — verify no breaking changes
3. `npm run codegen` — regenerate types
4. Update `ParcelTable.tsx` to include the new field in the table
5. MSW handlers may need updates if field affects business logic

### Testing create/update/delete operations
1. `cd example && npm run dev` — starts dev server with MSW mocking
2. Browser will show `[MSW] Mocking enabled` in console
3. Add/edit/delete rows → click "Submit Changes" → MSW intercepts, processes, responds
4. Check console logs for request/response details

### Deploying to production
1. Set `VITE_API_BASE_URL` environment variable to real API endpoint (removes MSW dependency)
2. `cd example && npm run build` — builds to `dist/`
3. Deploy `dist/` directory

## Known Gotchas & Solutions

| Issue | Solution |
|-------|----------|
| Types not updating after spec change | Run `npm run codegen` |
| MSW not intercepting requests | Check console for `[MSW] Mocking enabled` message; ensure dev mode |
| Delete rows not syncing | This was caused by React StrictMode double-rendering + shared mutable state (fixed in ParcelTable.tsx) |
| Create operations not saving IDs | Same issue as above; see ParcelTable.tsx onSuccess callback |
| Response structure errors | The response from openapi-react-query is `{ results }` only, not `{ status, body }` or `{ status, data }` |
| Port 5173 already in use | `PORT=5174 npm run dev` or kill the process on 5173 |

## Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `openapi-typescript` | Generate TS types from OpenAPI spec | ^7.4.0 |
| `openapi-fetch` | Type-safe fetch client | ^0.13.4 |
| `openapi-react-query` | TanStack Query integration for openapi-fetch | ^0.2.4 |
| `@tanstack/react-query` | Server state management | ^5.36.0 |
| `msw` | Browser request mocking | ^2.12.10 |
| `vite` | Build tool | ^5.1.4 |
| `@redocly/cli` | OpenAPI spec validation & docs generation | latest |

## Testing & Validation

```bash
# Full suite (lint + build-docs + stats + codegen)
npm run test

# Individual checks
npm run lint        # Redocly spec validation
npm run build-docs  # Generate HTML docs
npm run stats       # Spec statistics
npm run codegen     # Generate TypeScript types
```

The spec must pass all linting rules before merging changes.

## References & Further Reading

- **OpenAPI Spec:** `./openapi/openapi.yaml`
- **Redocly Config:** `./openapi/redocly.yaml`
- **API Overview:** `./README.md`
- **Spec Workflow:** `./DEVELOPMENT.md`
- **Integration Guide:** `./INTEGRATION.md`
- **Example App README:** `./example/README.md`
- **Generated Types:** `./example/src/api/openapi-types.ts` (auto-generated, read-only)
- **Demo Component:** `./example/src/components/ParcelTable.tsx` (CRUD table with state sync)

## Helpful Commands for Development

```bash
# Watch and rebuild types when spec changes
npm run codegen && nodemon --watch openapi.yaml --exec "npm run codegen"

# Check types in example app
cd example && npx tsc --noEmit

# Run example app with custom API URL (for testing against real backend)
VITE_API_BASE_URL=http://localhost:3000/api/v1 npm run dev

# Clean up generated files and rebuild
rm -rf dist && npm run build-docs && npm run codegen
```
