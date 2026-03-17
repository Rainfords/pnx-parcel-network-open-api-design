# Statutory Action Parcels API — OpenAPI Specification & React Example

Complete OpenAPI 3.0.3 specification and type-safe React client example for the Statutory Action Parcels API bulk operations endpoint.

## Overview

This project includes:
- **OpenAPI 3.0.3 specification** for `GET` and `PATCH` on `/statutory-actions/{statActionId}`
- **React + TypeScript example client** with type-safe code generation from the spec
- **Mock backend** (MSW) for local testing without a real server

The `PATCH /statutory-actions/{statActionId}` endpoint handles **bulk create, update, and delete operations** in a single atomic request.

### Use Case

Designed for table-based frontend UX patterns where users:

- Add new rows (create operations)
- Edit existing cells (update operations)
- Remove rows (delete operations)

Then submit the entire form in one PATCH request.

## Specification

**File:** `openapi/openapi.yaml`

### Endpoint

```
GET /statutory-actions/{statActionId}
PATCH /statutory-actions/{statActionId}

Path parameter:
- `statActionId` (integer, required)

`GET /statutory-actions/{statActionId}` returns statutory action metadata plus `parcels[]`.
```

### Request Format

Each row specifies an `operation` (create, update, or delete) with appropriate fields:

```json
{
  "rows": [
    {
      "operation": "create",
      "purpose": "Residential",
      "purposeStatus": "Active",
      "name": "Lot A",
      "comments": "New residential lot",
      "imageId": null
    },
    {
      "operation": "update",
      "parcelId": 42,
      "purpose": "Commercial"
    },
    {
      "operation": "delete",
      "parcelId": 99
    }
  ]
}
```

### Response Format

Returns per-row results indicating success or failure:

```json
{
  "results": [
    {
      "operation": "create",
      "parcelId": 101,
      "status": "success"
    },
    {
      "operation": "update",
      "parcelId": 42,
      "status": "success"
    },
    {
      "operation": "delete",
      "parcelId": 99,
      "status": "success"
    }
  ]
}
```

### Status Codes

- **200 OK** — All operations succeeded
- **207 Multi-Status** — Partial success (some rows failed)
- **400 Bad Request** — Malformed payload or validation error
- **422 Unprocessable Entity** — Semantically invalid (e.g., update non-existent parcel)
- **500 Internal Server Error** — Server error

## Row Schema

### Create Operation

**Required fields:** `operation`, `purpose`, `purposeStatus`, `name`

| Field         | Type            | Description                                               |
| ------------- | --------------- | --------------------------------------------------------- |
| operation     | string          | "create"                                                  |
| purpose       | string          | Purpose of the parcel (e.g., "Residential", "Commercial") |
| purposeStatus | string          | Status (e.g., "Active", "Pending", "Inactive")            |
| name          | string          | Parcel name/identifier                                    |
| comments      | string \| null  | Optional comments                                         |
| imageId       | integer \| null | Optional image reference                                  |

### Update Operation

**Required fields:** `operation`, `parcelId`

Supports partial updates — only include fields you want to change.

| Field         | Type            | Description            |
| ------------- | --------------- | ---------------------- |
| operation     | string          | "update"               |
| parcelId      | integer         | Primary key (required) |
| purpose       | string          | Optional update        |
| purposeStatus | string          | Optional update        |
| name          | string          | Optional update        |
| comments      | string \| null  | Optional update        |
| imageId       | integer \| null | Optional update        |

### Delete Operation

**Required fields:** `operation`, `parcelId`

| Field     | Type    | Description           |
| --------- | ------- | --------------------- |
| operation | string  | "delete"              |
| parcelId  | integer | Primary key to delete |

## Project Structure

```
pnx-parcel-network-open-api-design/
├── openapi/              # OpenAPI spec & documentation
│   ├── openapi.yaml      # API specification
│   ├── redocly.yaml      # Redocly configuration
│   └── package.json      # Redocly scripts
├── example/              # React TypeScript client example
│   ├── src/
│   │   ├── components/   # React components (ParcelTable.tsx)
│   │   ├── hooks/        # TanStack Query hooks (usePatchParcels.ts)
│   │   ├── api/          # API client setup & generated types
│   │   └── mocks/        # MSW mock backend handlers
│   └── package.json
├── package.json          # Root: codegen script
├── CLAUDE.md             # Developer guide for Claude Code
├── DEVELOPMENT.md        # Spec editing workflow
└── INTEGRATION.md        # Client integration guide
```

## Validation & Documentation

The spec is validated and passes OpenAPI 3.0.3 compliance. From the `openapi/` directory:

```bash
cd openapi
npm install              # Install Redocly CLI
npm run lint            # Validate spec
npm run build-docs      # Generate HTML documentation
npm run preview         # Live preview (localhost:8080)
```

Then visit `http://localhost:8080` in your browser.

## Running the Example React App

The `example/` directory contains a fully-working React + TypeScript client that demonstrates:
- Type-safe API calls using generated types from the OpenAPI spec
- TanStack Query (react-query) for state management
- Mock Service Worker (MSW) for local testing without a real backend
- Full CRUD operations (create, read, update, delete) with state sync

### Quick Start

```bash
cd example
npm install              # Install dependencies
npm run dev             # Start dev server (localhost:5173)
```

Then:
1. **Add a row** → Click "+ Add Row" and fill in fields
2. **Edit a row** → Modify cells
3. **Delete a row** → Click "Delete" button
4. **Submit changes** → Click "Submit Changes"

The mock backend will process your operations and sync the table.

### Regenerating Types After Spec Changes

When you update `openapi/openapi.yaml`, regenerate the client types:

```bash
npm run codegen        # From project root
```

This updates `example/src/api/openapi-types.ts` with the latest spec definitions.

## Implementation Notes

- The discriminator on `operation` field allows client/server implementations to route to appropriate handlers
- `parcelId` is server-assigned on create operations (returned in response)
- Update operations support partial payloads (only changed fields needed)
- Delete operations only require `parcelId` and `operation`
- All operations are processed in order; use 207 Multi-Status if partial failures occur
- Additional properties are forbidden to catch client errors early

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Developer guide for Claude Code with architecture notes and critical patterns
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Spec editing and validation workflow
- **[INTEGRATION.md](./INTEGRATION.md)** — Guide to consuming the spec in your own React app
- **[example/README.md](./example/README.md)** — React example app details

## External References

- [OpenAPI 3.0.3 Specification](https://spec.openapis.org/oas/v3.0.3)
- [Discriminator Pattern](https://spec.openapis.org/oas/v3.0.3#discriminator-object)
- [HTTP PATCH RFC 5789](https://tools.ietf.org/html/rfc5789)
- [openapi-typescript Documentation](https://openapi-ts.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
