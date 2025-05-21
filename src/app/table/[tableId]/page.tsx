"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useTableData } from "~/app/hooks/useTableData";
import type { FilterOperation, TableColumnDataType, TableRow, TableRowValue } from "~/schemas";
import { Button } from "~/app/components/ui/button";
import { useInfiniteRows } from "~/app/hooks/useInfiniteRows";

interface Props {
  params: { tableId: number };
}

export default function TablePage({ params }: Props) {
  // 1) grab pageParams & UI handlers (you can drop getRows/hasMore/loadMore)
  const {
    columnsMeta,
    rows,
    pageParams,
    setPageParams,
    search, setSearch,
    onSave, onDelete,
    onAddColumn, onUpdateColumn, onDeleteColumn,
    insertRowMutate, onInsertRow,
    onRefetch,
    editing, setEditing,
  } = useTableData(params.tableId);

  // 2) wire up infinite query
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRows({
    tableId: params.tableId,
    limit: pageParams.pageSize,
    cursor: pageParams.cursor,
    sortCol: pageParams.sortCol,
    sortDir: pageParams.sortDir,
    filters: pageParams.filters,
  });

  // 3) flatten pages → rows
  // const rows = useMemo<TableRow[]>(
  //   () => infiniteData?.rows.flatMap(p => p) ?? [],
  //   [infiniteData]
  // );

  // 4) sentinel to load more
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // {/* Sentinel div triggers next page */ }
    // <div ref={loadMoreRef} style={{ height: 1 }} />
    // {/* Loading indicator */ }
    // {
    //   isFetchingNextPage && (
    //     <div style={{ textAlign: "center", padding: 8 }}>
    //       Loading more…
    //     </div>
    //   )
    // }
    if (!loadMoreRef.current || !hasNextPage) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage]);

  const [newRow, setNewRow] = useState<Record<string, string>>({});

  // initialize newRow when columnsMeta changes
  useEffect(() => {
    const blank: Record<string, string> = {};
    for (const c of columnsMeta) blank[c.name] = "";
    setNewRow(blank);
  }, [columnsMeta.length]);

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
      { tableId: params.tableId, rowId, data },
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
          <Button
            onClick={() => onUpdateColumn(col.column_id, col.name)}
            title="Rename column"
            className="text-blue-500 hover:text-blue-700 rounded-md px-2 py-1"
            style={{ padding: "0 4px" }}
          >
            ✏️
          </Button>
          <Button
            onClick={() => onDeleteColumn(col.column_id)}
            className="text-red-500 hover:text-red-700"
            style={{ padding: "0 4px" }}
            title="Delete column"
          >
            🗑️
          </Button>
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
        <Button
          className="text-center text-red-500 hover:text-red-700 w-full"
          onClick={() => onDelete(info.row.original.id)}
        >
          Delete
        </Button>
      ),
    } as ColumnDef<TableRow>,
  ], [columnsMeta, editing, onSave, onDelete, onUpdateColumn, onDeleteColumn, setEditing])

  // 2) table instance
  const table = useReactTable({
    data: rows ?? [],
    columns,
    manualSorting: true,
    state: {
      sorting: pageParams.sortCol
        ? [{ id: pageParams.sortCol, desc: pageParams.sortDir === "desc" }]
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
        setPageParams(p => ({
          ...p,
          sortCol: id,
          sortDir: desc ? "desc" : "asc",
        }))
      } else {
        setPageParams(p => ({ ...p, sortCol: undefined, sortDir: undefined }))
      }
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button onClick={() => {
          const name = prompt("New column name?")
          const type = prompt("Type? (text,numeric,boolean,date)") as TableColumnDataType
          if (name && type) onAddColumn(name, type)
        }}>
          + Column
        </Button>
        <Button onClick={onInsertRow}>+ Row</Button>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <Button onClick={() => setSearch("")}>Clear</Button>
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
        <Button onClick={saveNewRow}>Save Row</Button>
      </div>

      <table
        className="text-sm"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
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

          {/* Filter row */}
          <tr>
            {/** blank cell for the row‐index column **/}
            <th></th>

            {columnsMeta.map(col => {
              const colFilter = pageParams.filters?.[col.name] ?? { op: "in" as const, value: "" };

              return (
                <th key={col.name}>
                  {col.data_type === "numeric" ? (
                    <>
                      <input
                        type="number"
                        placeholder="> value"
                        className="ml-2 border border-gray-300 rounded px-2 py-1 w-4/5"
                        style={{ width: "45%", marginRight: 2 }}
                        onChange={e => {
                          const v = Number(e.currentTarget.value) || undefined
                          setPageParams(p => ({
                            ...p,
                            filters: {
                              ...(p.filters ?? {}),
                              [col.name]: { op: "gt", value: v },
                            },
                          }))
                        }}
                      />
                      <input
                        type="number"
                        placeholder="< value"
                        className="ml-2 border border-gray-300 rounded px-2 py-1 w-4/5"
                        style={{ width: "45%" }}
                        onChange={e => {
                          const v = Number(e.currentTarget.value) || undefined
                          setPageParams(p => ({
                            ...p,
                            filters: {
                              ...(p.filters ?? {}),
                              [col.name]: { op: "lt", value: v },
                            },
                          }))
                        }}
                      />
                    </>
                  ) : (
                    <div
                      className="flex items-center space-x-2 px-2"
                    >
                      <select
                        value={colFilter.op}
                        onChange={e => {
                          const op = e.currentTarget.value as FilterOperation
                          setPageParams(p => ({
                            ...p,
                            filters: {
                              ...(p.filters ?? {}),
                              [col.name]: { op, value: colFilter.value },
                            },
                          }))
                        }}
                        className="border border-gray-300 rounded px-2 py-1 w-2/5"
                      >
                        <option value="in">Contains</option>
                        <option value="nin">Not contains</option>
                        <option value="eq">Equal</option>
                        <option value="neq">Not equal</option>
                        <option value="isnull">Empty</option>
                        <option value="isnotnull">Not empty</option>
                      </select>
                      {!["isnull", "isnotnull"].includes(colFilter.op) && (
                        <input
                          value={String(colFilter.value)}
                          onChange={e => {
                            const v = e.currentTarget.value
                            setPageParams(p => ({
                              ...p,
                              filters: {
                                ...(p.filters ?? {}),
                                [col.name]: { op: colFilter.op, value: v },
                              },
                            }))
                          }}
                          className="border border-gray-300 rounded px-2 py-1 w-3/5"
                        />
                      )}
                    </div>
                  )}
                </th>
              )
            })}

            {/** blank cell for Actions column **/}
            <th></th>
          </tr>
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
      {/* Sentinel div triggers next page */}
      <div ref={loadMoreRef} style={{ height: 1 }} />
      {/* Loading indicator */}
      {isFetchingNextPage && (
        <div style={{ textAlign: "center", padding: 8 }}>
          Loading more…
        </div>
      )}
    </div>
  )
}
