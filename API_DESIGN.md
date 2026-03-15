# Statutory Action Parcels API Design

## Document Control

- **Document type:** API design note
- **Scope:** `GET /parcels` read endpoint and `PATCH /parcels` bulk mutation endpoint
- **Specification source:** `openapi/openapi.yaml`
- **OpenAPI version:** 3.0.3
- **Status:** Draft for design review

## 1. Purpose

This document describes the design intent, contract, and operational behavior of the Statutory Action Parcels bulk endpoint. It is intended for architecture/design review and implementation alignment across frontend, backend, and QA teams.

The API supports two primary frontend needs:

- Fetching the current parcel set for table initialization (`GET /parcels`)
- Submitting mixed row actions in one request (`PATCH /parcels`)

## 2. Problem Statement

Parcel operations are often edited in a batch (create, update, delete) in client table UIs. Sending each row as an independent request creates ordering, consistency, and UX issues.

This API design provides:

- A read contract to retrieve parcel records with server-managed fields
- A batch write contract to apply mixed row operations

The batch write contract is designed to:

- Accept mixed operation types in one payload
- Preserve request row order
- Return per-row outcomes
- Enable partial-success reporting without losing successful operations

## 3. Goals and Non-Goals

### Goals

- Support mixed row operations (`create`, `update`, `delete`) in a single request
- Provide strict schema validation with clear operation-specific requirements
- Return deterministic per-row result entries for client reconciliation
- Enable type-safe client code generation from OpenAPI

### Non-Goals

- Not a generic query API for parcel search/filter
- Not a replacement for transactional workflow orchestration across services
- Not a streaming or async bulk processing interface

## 4. High-Level API Design

### Endpoints

- **GET `/parcels`**: retrieve all statutory action parcels
- **PATCH `/parcels`**: apply bulk create/update/delete row operations
- **Media type:** `application/json`

### Authentication

- Bearer token authentication (per OpenAPI security scheme)

### Core Contract Patterns

`GET /parcels` returns `GetParcelsResponse`:

- `parcels: Parcel[]`
- Includes server-managed fields such as `appellation`, `action`, and `parcelIntent`

`PATCH /parcels` request contains `rows[]`, where each row is a discriminated union by `operation`:

- `create`
- `update`
- `delete`

This pattern is modeled in OpenAPI using `oneOf` + `discriminator` and generates strong TypeScript unions in clients.

## 5. Data Model and Validation

## 5.1 GET Response Model

`GetParcelsResponse`:

- `parcels: Parcel[]` (required)

`Parcel` fields:

- Required: `parcelId`
- Nullable read-oriented/domain fields: `appellation`, `action`, `parcelIntent`, `purpose`, `purposeStatus`, `name`, `comments`, `imageId`

`GET /parcels` status behavior:

- `200 OK`: collection returned
- `401 Unauthorized`: missing/invalid bearer token
- `500 Internal Server Error`: unexpected server failure

## 5.2 PATCH Request Model

`PatchParcelsRequest`:

- `rows: ParcelRow[]` (required)

`ParcelRow` variants:

- **Create row**
  - Required: `operation`, `purpose`, `purposeStatus`, `name`
  - Optional nullable fields: `comments`, `imageId`
- **Update row**
  - Required: `operation`, `parcelId`
  - Patch-style optional mutable fields: `purpose`, `purposeStatus`, `name`, `comments`, `imageId`
- **Delete row**
  - Required: `operation`, `parcelId`

Validation characteristics:

- `operation` literal value selects schema branch
- Unknown/additional properties are rejected (strict payload hygiene)
- Field types are explicit and nullability is represented with `nullable: true` in OpenAPI 3.0.3

## 5.3 PATCH Response Model

`PatchParcelsResponse`:

- `results: ParcelRowResult[]`

Each result entry maps to one request row and contains operation outcome information (success/failure and contextual identifiers/messages).

Client integration note: generated React query usage receives parsed body shape directly (for example, `{ results }`).

## 6. Processing Semantics

## 6.1 Ordering

For `PATCH /parcels`, rows are processed in request order. This is important when later rows depend on prior state changes.

## 6.2 Success and Partial Success

Expected status behavior:

- `200 OK`: all rows succeeded
- `207 Multi-Status`: at least one row succeeded and at least one failed
- `400 Bad Request`: malformed request or schema-level invalid payload
- `422 Unprocessable Entity`: semantically valid shape but domain invalid (for example, update/delete on missing `parcelId`)
- `500 Internal Server Error`: unexpected server failure

For `GET /parcels`, expected status behavior is `200`, `401`, and `500`.

## 6.3 Idempotency Considerations

- `update` and `delete` can be naturally idempotent when applied to current state with stable IDs
- `create` is not inherently idempotent unless deduplication keys are introduced
- If retry safety is required, consider adding an idempotency key strategy at request or row level in a future revision

## 7. Error Handling Strategy

Errors are represented at two levels:

- **Request-level error** via non-2xx status for unrecoverable validation/system issues
- **Row-level error** via `results[]` entries during partial success scenarios

Recommended backend behavior:

- Include machine-readable row error codes
- Include human-readable row error messages for operator troubleshooting
- Keep result ordering stable against request ordering for simple UI reconciliation

## 8. Security and Compliance

- Use bearer auth for all writes
- Enforce authorization checks per parcel action (create/update/delete)
- Log subject identity and request correlation IDs for auditability
- Avoid returning sensitive internal diagnostics in public error text

## 9. Observability and Operations

Recommended telemetry:

- Request count and latency for `GET /parcels` and `PATCH /parcels`
- Distribution of row counts per request
- Row success/failure rates by operation type
- Top row-level error codes
- `207 Multi-Status` rate as quality indicator

Operational safeguards:

- Cap maximum `rows` length to prevent abuse and latency spikes
- Validate payload size limits at gateway/app boundary
- Apply rate limiting according to write-path SLOs

## 10. Backward/Forward Compatibility

Current contract is versionless path-based and relies on schema evolution discipline.

Compatibility guidance:

- Additive optional fields are backward compatible
- Changing required fields or discriminator values is breaking
- Removing existing fields is breaking

If frequent breaking change risk is expected, introduce explicit versioning policy (for example, `/v2` or media-type versioning).

## 11. Client Integration Notes

Frontend pattern enabled by this API:

1. Fetch current table records via `GET /parcels`
2. Build a local row-edit model in table UI
3. Submit all pending row deltas as `rows[]` to `PATCH /parcels`
4. Reconcile UI state from per-row `results[]`

Type-safety notes:

- Regenerate types after spec updates via root `npm run codegen`
- Leverage discriminated union narrowing on `operation` to prevent invalid row shapes at compile time

## 12. Testing Strategy

Minimum test matrix:

- `GET /parcels` contract tests (`200/401/500`)
- `GET /parcels` response shape tests for nullable parcel fields
- Contract tests for each operation schema branch
- Mixed-operation batch tests with ordered assertions
- Partial success tests returning `207`
- Domain failure tests (`422`) for non-existent IDs
- Authorization failure tests
- Load tests for realistic batch sizes

Local development support:

- MSW handlers in `example/src/mocks/handlers.ts` simulate GET/PATCH behavior with in-memory state

## 13. Risks and Mitigations

- **Risk:** Large batch payloads increase latency and timeout risk  
  **Mitigation:** enforce max batch size and tune server timeouts

- **Risk:** Client confusion on partial success handling  
  **Mitigation:** stable ordered `results[]` contract and clear UI reconciliation rules

- **Risk:** Non-idempotent create retries produce duplicates  
  **Mitigation:** optional idempotency key design for future release

## 14. Open Questions

- Should create rows support a client-provided correlation key to map server-assigned IDs without relying only on order?
- What is the maximum supported `rows` length for production SLOs?
- Should row-level error payload include a standardized code enum in the public contract?
- Is transactional all-or-nothing mode needed as a future endpoint option?

## 15. Implementation and Rollout Notes

- Keep OpenAPI as source of truth and regenerate client types after schema changes
- Validate spec with Redocly lint/docs pipeline before merge
- Gate rollout with integration tests covering 200/207/400/422/500 behavior
- Document operational limits (max rows, payload size, retry guidance) in consumer docs

## Appendix A: Example Request

```json
{
  "rows": [
    {
      "operation": "create",
      "purpose": "Residential",
      "purposeStatus": "Active",
      "name": "Lot A",
      "comments": "New parcel",
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

## Appendix B: Example Partial Success Response

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
      "status": "error",
      "message": "Parcel is locked"
    },
    {
      "operation": "delete",
      "parcelId": 99,
      "status": "success"
    }
  ]
}
```

