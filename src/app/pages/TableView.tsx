// TableView.tsx
"use client"
import React, { useEffect, useMemo, useState } from "react"
import { nanoid } from "nanoid"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { useTableData } from "../hooks/useTableData"
import type { TableColumnDataType, TableRow, TableRowValue } from "~/schemas"

export default function TableView({ tableId }: { tableId: number }) {
  const {
    columnsMeta, rows, params, search, editing,
    setParams, setSearch, setEditing,
    onSave, onDelete,
    onAddColumn, onUpdateColumn, onDeleteColumn,
    onInsertRow, insertRowMutate, onRefetch,
    hasMore, loadMore, isLoading
  } = useTableData(tableId)

  const [newRow, setNewRow] = useState<Record<string, string>>({});

  // initialize newRow when columnsMeta changes
  useEffect(() => {
    const blank: Record<string, string> = {};
    for (const c of columnsMeta) blank[c.name] = "";
    setNewRow(blank);
  }, [columnsMeta.length]);

  // infinite scroll handler
  // useEffect(() => {
  //   const onScroll = () => {
  //     if (isSearching || isLoading || !hasMore) return;
  //     // at bottom of page
  //     if (
  //       window.innerHeight + window.scrollY >=
  //       document.documentElement.scrollHeight - 100
  //     ) {
  //       loadMore();
  //     }
  //   };
  //   window.addEventListener("scroll", onScroll);
  //   return () => window.removeEventListener("scroll", onScroll);
  // }, [isSearching, hasMore, isLoading, loadMore]);

  // intersection‐observer on a sentinel div at end
  // const [ref, inView] = useInView({ rootMargin: "200px" });
  // useEffect(() => {
  //   if (inView && hasNextPage && !isFetchingNextPage) {
  //     fetchNextPage();
  //   }
  // }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const saveNewRow = () => {
    const data: Record<string, TableRowValue> = {};
    for (const c of columnsMeta) {
      const raw = newRow[c.name] ?? "";
      let v: string | number | boolean = raw;
      if (c.data_type === "numeric") v = Number(raw) || 0;
      if (c.data_type === "boolean") v = raw === "true";
      if (c.data_type === "date") v = raw; // iso‐string
      data[c.name] = v;
    }
    const rowId = nanoid();
    insertRowMutate(
      { tableId, rowId, data },
      {
        onSuccess: () => {
          // clear inputs on success
          const blank: Record<string, string> = {};
          for (const c of columnsMeta) blank[c.name] = "";
          setNewRow(blank);
          onRefetch();
        }
      }
    );
  };

  // 1) build columns once
  interface ColumnMeta {
    column_id: number
    name: string
    data_type: "text" | "numeric" | "boolean" | "date"
  }

  interface EditingState {
    rowId: string
    col: string
  }

  const columns = useMemo<ColumnDef<TableRow>[]>(() => [
    // 0) Row‐number column
    {
      id: "rowIndex",
      header: "#",
      enableSorting: false,
      cell: info => info.row.index + 1,
    } as ColumnDef<TableRow>,

    // 1) Data columns
    ...columnsMeta.map((col: ColumnMeta): ColumnDef<TableRow> => ({
      accessorKey: col.name,
      header: () => (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span
            style={{ cursor: "pointer", flex: 1 }}
            onDoubleClick={() =>
              onUpdateColumn(col.column_id, col.name)
            }
          >
            {col.name}
          </span>
          <button
            onClick={() => onUpdateColumn(col.column_id, col.name)}
            title="Rename column"
            className="text-blue-500 hover:text-blue-700 rounded-md px-2 py-1"
            style={{ padding: "0 4px" }}
          >
            ✏️
          </button>
          <button
            onClick={() => onDeleteColumn(col.column_id)}
            className="text-red-500 hover:text-red-700"
            style={{ padding: "0 4px" }}
            title="Delete column"
          >
            🗑️
          </button>
        </div>
      ),
      enableSorting: true,
      cell: info => {
        const id = info.row.original.id;
        const val = info.getValue();
        const currentEditing = editing as unknown as EditingState | undefined

        if (currentEditing?.rowId === id && currentEditing.col === col.name) {
          return (
            <input
              defaultValue={String(val)}
              autoFocus
              onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                onSave(id, col.name, e.currentTarget.value, col.data_type)
              }
            />
          )
        }
        return (
          <div
            onDoubleClick={() => setEditing({ rowId: id, col: col.name })}
            style={{ cursor: "pointer" }}
          >
            {String(val)}
          </div>
        )
      },
    })),

    // 2) Actions column
    {
      id: "actions",
      header: "Actions",
      cell: info => (
        <button
          className="text-center text-red-500 hover:text-red-700 w-full"
          onClick={() => onDelete(info.row.original.id)}
        >
          Delete
        </button>
      ),
    } as ColumnDef<TableRow>,
  ], [columnsMeta, editing, onSave, onDelete, onUpdateColumn, onDeleteColumn, setEditing])

  // 2) table instance
  const table = useReactTable({
    data: rows ?? [],
    columns,
    manualSorting: true,
    state: {
      sorting: params.sortCol
        ? [{ id: params.sortCol, desc: params.sortDir === "desc" }]
        : [],
    },
    onSortingChange: (updater) => {
      const nextSorting: SortingState = Array.isArray(updater)
        ? updater
        : typeof updater === "function"
          ? updater(table.getState().sorting)
          : [];

      if (nextSorting.length > 0) {
        const { id, desc } = nextSorting[0]!
        setParams(p => ({
          ...p,
          sortCol: id,
          sortDir: desc ? "desc" : "asc",
        }))
      } else {
        setParams(p => ({ ...p, sortCol: undefined, sortDir: undefined }))
      }
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => {
          const name = prompt("New column name?")
          const type = prompt("Type? (text,numeric,boolean,date)") as TableColumnDataType
          if (name && type) onAddColumn(name, type)
        }}>
          + Column
        </button>
        <button onClick={onInsertRow}>+ Row</button>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <button onClick={() => setSearch("")}>Clear</button>
      </div>

      <div style={{ marginBottom: 12, padding: 8, border: "1px solid #ddd" }}>
        <strong>New Row:</strong>
        {columnsMeta.map(c => (
          <input
            key={c.name}
            placeholder={c.name}
            value={newRow[c.name] ?? ""}
            onChange={e =>
              setNewRow(prev => ({ ...prev, [c.name]: e.target.value }))
            }
            style={{ marginRight: 4 }}
          />
        ))}
        <button onClick={saveNewRow}>Save Row</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  style={{
                    borderBottom: "1px solid #ccc",
                    cursor: h.column.getCanSort() ? "pointer" : undefined,
                  }}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === "asc" ? " 🔼"
                    : h.column.getIsSorted() === "desc" ? " 🔽"
                      : ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(r => (
            <tr key={r.id}>
              {r.getVisibleCells().map(c => (
                <td key={c.id} style={{ padding: "4px 8px", borderBottom: "1px solid #eee" }}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* {(isLoading || isFetchingNextPage) && ( */}
      {(isLoading) && (
        <div style={{ textAlign: "center", padding: 8 }}>Loading…</div>
      )}
      {/* <div ref={ref} /> */}
    </div>
  )
}
