import { useEffect, useState } from "react";
import { usePatchParcels } from "@/hooks/usePatchParcels";
import { useGetParcels } from "@/hooks/useGetParcels";
import type { components } from "@/api/openapi-types";

type ParcelRow = components["schemas"]["ParcelRow"];
type Parcel = components["schemas"]["Parcel"];

/**
 * Client-side row with tracking metadata
 * - operation: identifies new/modified/deleted
 * - error: displays validation/API errors
 * - appellation, action, parcelIntent: read-only server fields
 */
interface ClientParcelRow extends Record<string, any> {
  _id: string;
  _operation: "none" | "created" | "modified" | "deleted";
  _error?: string;
  parcelId?: number;
  appellation: string;
  action: string;
  parcelIntent: string;
  purpose: string;
  purposeStatus: string;
  name: string;
  comments?: string | null;
  imageId?: number | null;
}

export function ParcelTable() {
  const [rows, setRows] = useState<ClientParcelRow[]>([]);
  const { data: getParcelsData, isPending: isLoadingParcels, error: loadError } = useGetParcels();

  // Load initial parcel data from GET /parcels when component mounts
  useEffect(() => {
    if (getParcelsData?.parcels) {
      const initialRows: ClientParcelRow[] = getParcelsData.parcels.map((parcel: Parcel) => ({
        _id: String(parcel.parcelId),
        _operation: "none",
        parcelId: parcel.parcelId,
        appellation: parcel.appellation || "",
        action: parcel.action || "",
        parcelIntent: parcel.parcelIntent || "",
        purpose: parcel.purpose || "",
        purposeStatus: parcel.purposeStatus || "",
        name: parcel.name || "",
        comments: parcel.comments || "",
        imageId: parcel.imageId || null,
      }));
      setRows(initialRows);
    }
  }, [getParcelsData]);

  const { mutate, isPending, error } = usePatchParcels({
    onSuccess: (response: any) => {
      try {
        const { results } = response as any;

        // Update rows with server-assigned IDs from creates
        setRows((prev) => {
          // Track which rows were successfully processed (fresh for each call)
          const processedRowIds = new Set<string>();
          const deletedParcelIds = new Set<number>();
          // First pass: match results to rows and update state
          const updated: ClientParcelRow[] = prev.map((row) => {
            let result;

            // Match by parcelId if it exists
            if (row.parcelId) {
              result = results.find((r: any) => r.parcelId === row.parcelId);
            } else if (row._operation === "created") {
              // For creates, find the corresponding create result that hasn't been claimed yet
              result = results.find(
                (r: any) =>
                  r.operation === "create" && !processedRowIds.has(`create-${r.parcelId}`)
              );
              if (result) {
                processedRowIds.add(`create-${result.parcelId}`);
              }
            }

            if (!result) return row;

            if (result.status === "error") {
              return {
                ...row,
                _error: result.error,
                _operation: ("none" as const),
              };
            }

            // On create, capture server-assigned parcelId
            if (row._operation === "created" && result.operation === "create") {
              return {
                ...row,
                parcelId: result.parcelId,
                _operation: ("none" as const),
                _error: undefined,
              };
            }

            // On delete, track for removal and keep marked as deleted temporarily
            if (row._operation === "deleted" && result.operation === "delete") {
              if (row.parcelId) {
                deletedParcelIds.add(row.parcelId);
              }
              return row; // Keep as "deleted" for now
            }

            // On update, mark as synced
            return {
              ...row,
              _operation: ("none" as const),
              _error: undefined,
            };
          });

          // Second pass: remove successfully deleted rows
          return updated.filter((row) => !deletedParcelIds.has(row.parcelId || -1));
        });

        // Check for any errors in results
        const hasErrors = results.some((r: any) => r.status === "error");
        if (hasErrors) {
          alert(
            "Some rows failed. Check the table for errors.\n\nNote: In a real app, you would display per-row validation errors in the UI.",
          );
        }
      } catch (err) {
        console.error('PATCH error:', err);
        throw err;
      }
    },
  });

  const addRow = () => {
    const newRow: ClientParcelRow = {
      _id: Date.now().toString(),
      _operation: "created",
      appellation: "",
      action: "",
      parcelIntent: "",
      purpose: "",
      purposeStatus: "Active",
      name: "",
      comments: "",
      imageId: null,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const updateRow = (id: string, field: string, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row._id !== id) return row;
        return {
          ...row,
          [field]: value,
          _operation:
            row._operation === "none" && row.parcelId
              ? "modified"
              : row._operation,
          _error: undefined,
        };
      }),
    );
  };

  const deleteRow = (id: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row._id !== id) return row;
        // Rows created but not yet sent to server can be removed immediately
        if (row._operation === "created" && !row.parcelId) {
          return null as any;
        }
        // Existing rows on server are marked for deletion (will be removed after PATCH succeeds)
        return { ...row, _operation: "deleted" };
      }),
    );
    // Remove any null entries from newly created rows that were deleted
    setRows((prev) => prev.filter((r) => r));
  };

  const computeDiff = (): ParcelRow[] => {
    return rows
      .filter((row) => row._operation !== "none")
      .map((row) => {
        switch (row._operation) {
          case "created":
            return {
              operation: "create",
              purpose: row.purpose,
              purposeStatus: row.purposeStatus,
              name: row.name,
              comments: row.comments || null,
              imageId: row.imageId || null,
            };
          case "modified":
            return {
              operation: "update",
              parcelId: row.parcelId,
              purpose: row.purpose,
              purposeStatus: row.purposeStatus,
              name: row.name,
              comments: row.comments || null,
              imageId: row.imageId || null,
            };
          case "deleted":
            return {
              operation: "delete",
              parcelId: row.parcelId,
            };
          default:
            return null as any;
        }
      })
      .filter(Boolean);
  };

  const handleSubmit = () => {
    const diff = computeDiff();
    if (diff.length === 0) {
      alert("No changes to submit");
      return;
    }
    mutate({ body: { rows: diff } });
  };

  const hasChanges = rows.some((r) => r._operation !== "none");

  return (
    <div className="parcel-table">
      <h1>Statutory Action Parcels — Bulk Editor</h1>

      <p>
        This demo shows a React component consuming the generated TypeScript
        types from the OpenAPI spec.
      </p>

      <div className="controls">
        <button onClick={addRow} disabled={isPending || isLoadingParcels}>
          + Add Row
        </button>
        <button onClick={handleSubmit} disabled={isPending || !hasChanges || isLoadingParcels}>
          {isPending ? "Submitting..." : "Submit Changes"}
        </button>
      </div>

      {isLoadingParcels && (
        <div className="loading-alert">
          <strong>Loading parcels...</strong>
        </div>
      )}

      {loadError && (
        <div className="error-alert">
          <strong>Failed to load parcels:</strong> {JSON.stringify(loadError)}
        </div>
      )}

      {error && (
        <div className="error-alert">
          <strong>API Error:</strong>
          <pre>{JSON.stringify(error, null, 2)}</pre>
          <details>
            <summary>Console log (open dev tools for more details)</summary>
            Check the browser console for detailed error information.
          </details>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>ID</th>
            <th>Appellation</th>
            <th>Action</th>
            <th>Intent</th>
            <th>Name</th>
            <th>Purpose</th>
            <th>Purpose Status</th>
            <th>Comments</th>
            <th>Image ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row._id}
              className={`row-${row._operation} ${row._error ? "row-error" : ""}`}
            >
              <td>
                <span className={`badge badge-${row._operation}`}>
                  {row._operation}
                </span>
              </td>
              <td>{row.parcelId || "(new)"}</td>
              <td>
                <input
                  type="text"
                  value={row.appellation}
                  disabled={true}
                  placeholder="Server-set"
                  title="Read-only: managed by server"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.action}
                  disabled={true}
                  placeholder="Server-set"
                  title="Read-only: managed by server"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.parcelIntent}
                  disabled={true}
                  placeholder="Server-set"
                  title="Read-only: managed by server"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateRow(row._id, "name", e.target.value)}
                  disabled={isPending}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.purpose}
                  onChange={(e) =>
                    updateRow(row._id, "purpose", e.target.value)
                  }
                  disabled={isPending}
                />
              </td>
              <td>
                <select
                  value={row.purposeStatus}
                  onChange={(e) =>
                    updateRow(row._id, "purposeStatus", e.target.value)
                  }
                  disabled={isPending}
                >
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Inactive</option>
                  <option>Current</option>
                  <option>Historic</option>
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={row.comments || ""}
                  onChange={(e) =>
                    updateRow(row._id, "comments", e.target.value)
                  }
                  disabled={isPending}
                  placeholder="optional"
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.imageId || ""}
                  onChange={(e) =>
                    updateRow(
                      row._id,
                      "imageId",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={isPending}
                  placeholder="optional"
                />
              </td>
              <td>
                <button onClick={() => deleteRow(row._id)} disabled={isPending}>
                  Delete
                </button>
                {row._error && <span className="error-text">{row._error}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .parcel-table {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .controls {
          margin: 20px 0;
          display: flex;
          gap: 10px;
        }

        button {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        button:hover:not(:disabled) {
          background: #0056b3;
        }

        .error-alert {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin: 10px 0;
          border: 1px solid #f5c6cb;
        }

        .loading-alert {
          background: #d1ecf1;
          color: #0c5460;
          padding: 12px;
          border-radius: 4px;
          margin: 10px 0;
          border: 1px solid #bee5eb;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
        }

        tr.row-created {
          background: #d4edda;
        }

        tr.row-modified {
          background: #fff3cd;
        }

        tr.row-deleted {
          background: #f8d7da;
          opacity: 0.7;
        }

        tr.row-error {
          background: #f8d7da;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-none {
          background: #e9ecef;
          color: #495057;
        }

        .badge-created {
          background: #28a745;
          color: white;
        }

        .badge-modified {
          background: #ffc107;
          color: black;
        }

        .badge-deleted {
          background: #dc3545;
          color: white;
        }

        input,
        select {
          width: 100%;
          padding: 6px;
          border: 1px solid #ced4da;
          border-radius: 3px;
          font-size: 14px;
          box-sizing: border-box;
        }

        input:disabled,
        select:disabled {
          background: #e9ecef;
          cursor: not-allowed;
          color: #6c757d;
        }

        input:disabled[title] {
          background: #f0f0f0;
          border-color: #d3d3d3;
        }

        .error-text {
          display: block;
          color: #dc3545;
          font-size: 12px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
