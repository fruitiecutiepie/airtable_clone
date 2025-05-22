"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef, type CellContext } from "@tanstack/react-table";
import { useTableData } from "~/app/hooks/useTableData";
import { useInfiniteRows } from "~/app/hooks/useInfiniteRows";
import type { FilterOperation, TableColumnDataType, TableRow, TableRowValue } from "~/schemas";
import { Button } from "~/app/components/ui/button";

export default function TableView({ tableId }: { tableId: number }) {
  const {
    columns: columnsMeta,
    rows,
    pageParams,
    setPageParams,
    search,
    setSearch,
    onSave,
    onDelete,
    addColumn,
    updateColumn,
    deleteColumn,
    addRow,
    onInsertRow,
    refetchColumns,
    refetchRows,
    editing,
    setEditing,
  } = useTableData(tableId);

  // infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage: hasMore,
    isFetchingNextPage,
    isLoading: loadingMore
  } = useInfiniteRows({
    tableId,
    ...pageParams
  });
  const infRows = useMemo(
    () =>
      data?.pages.flatMap((page) => page.rows) ?? [],
    [data]
  );

  const loader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loader.current || !hasMore) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        void fetchNextPage();
      }
    }, { rootMargin: "200px" });
    obs.observe(loader.current);
    return () => obs.disconnect();
  }, [fetchNextPage, hasMore]);

  // newRow inputs
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  useEffect(() => {
    const blank: Record<string, string> = {};
    columnsMeta.forEach(c => blank[c.name] = "");
    setNewRow(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsMeta.length]);

  const saveNewRow = async () => {
    const data: Record<string, TableRowValue> = {};
    columnsMeta.forEach(c => {
      const raw = newRow[c.name] ?? "";
      let v: string | number | boolean = raw;
      if (c.data_type === "numeric") v = Number(raw) || 0;
      if (c.data_type === "boolean") v = raw === "true";
      if (c.data_type === "date") v = raw;
      data[c.name] = v;
    });
    await addRow(
      { tableId, rowId: nanoid(), data },
      {
        onSuccess: () => {
          setNewRow(Object.fromEntries(columnsMeta.map(c => [c.name, ""])));
          void refetchColumns();
          void refetchRows();
        }
      }
    );
  };

  const cols = useMemo<ColumnDef<TableRow, TableRowValue>[]>(() => [
    { id: "#", header: "#", enableSorting: false, cell: ({ row }) => row.index + 1 },
    ...columnsMeta.map(col => ({
      accessorKey: col.name,
      header: () => (
        <div className="flex gap-2 items-center">
          <span
            onDoubleClick={() => updateColumn({
              tableId,
              columnId: col.column_id,
              name: col.name,
              dataType: col.data_type,
            })}
          >
            {col.name}
          </span>
          <Button
            onClick={() => updateColumn({
              tableId,
              columnId: col.column_id,
              name: col.name,
              dataType: col.data_type,
            })}
          >
            ✏️
          </Button>
          <Button
            onClick={() => deleteColumn({
              tableId,
              columnId: col.column_id,
            })}
          >
            🗑️
          </Button>
        </div>
      ),
      enableSorting: true,
      cell: (info: CellContext<TableRow, TableRowValue>) => {
        const id = info.row.original.id;
        const val = info.getValue();
        if (editing?.rowId === id && editing.col === col.name) {
          return <input autoFocus defaultValue={String(val)} onBlur={e => onSave(id, col.name, e.currentTarget.value, col.data_type)} />
        }
        return <div onDoubleClick={() => setEditing({ rowId: id, col: col.name })}>{String(val)}</div>;
      }
    })),
    { id: "actions", header: "Actions", cell: ({ row }) => <Button onClick={() => onDelete(row.original.id)}>Delete</Button> }
  ], [columnsMeta, editing, setEditing, tableId, onSave, onDelete, updateColumn, deleteColumn]);

  const table = useReactTable<TableRow>({
    data: infRows,
    columns: cols,
    manualSorting: true,
    state: { sorting: pageParams.sortCol ? [{ id: pageParams.sortCol, desc: pageParams.sortDir === "desc" }] : [] },
    onSortingChange: s => {
      const [sort] = Array.isArray(s) ? s : s(table.getState().sorting);
      if (sort) setPageParams(p => ({ ...p, sortCol: sort.id, sortDir: sort.desc ? "desc" : "asc" }));
      else setPageParams(p => ({ ...p, sortCol: undefined, sortDir: undefined }));
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      {/* --- total count & loading state --- */}
      <div className="flex justify-between items-center mb-2">
        {(loadingMore || isFetchingNextPage) && (
          <div className="text-sm text-gray-500">Loading…</div>
        )}
      </div>
      <div className="mb-4 flex gap-2">
        <Button onClick={async () => {
          const name = prompt("New column?");
          const type = prompt("type?") as TableColumnDataType;
          if (name && type) {
            await addColumn({ tableId, name, dataType: type, position: columnsMeta.length });
          }
        }}>+ Column</Button>
        <Button onClick={onInsertRow}>+ Row</Button>
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <Button onClick={() => setSearch("")}>Clear</Button>
      </div>

      <div className="mb-4 p-2 border rounded">
        <strong>New Row:</strong>
        {columnsMeta.map(c =>
          <input key={c.name} placeholder={c.name} value={newRow[c.name] ?? ""}
            onChange={e => setNewRow(prev => ({ ...prev, [c.name]: e.target.value }))}
          />
        )}
        <Button onClick={saveNewRow}>Save Row</Button>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          {table.getHeaderGroups().map(hg =>
            <tr
              key={hg.id}
            >
              {hg.headers.map(h =>
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className="border-b p-2 cursor-pointer"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}{h.column.getIsSorted() === "asc" ? "🔼" : h.column.getIsSorted() === "desc" ? "🔽" : ""}
                </th>
              )}
            </tr>
          )}
          <tr>
            <th></th>
            {columnsMeta.map(col => {
              const f = pageParams.filters?.[col.name] ?? { op: "in", value: "" };
              return <th key={col.name} className="p-2">
                {col.data_type === "numeric" ?
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
                  : <div className="flex gap-1">
                    <select
                      value={f.op}
                      onChange={e =>
                        setPageParams(p => ({
                          ...p,
                          filters: {
                            ...(p.filters ?? {}),
                            [col.name]: { op: e.target.value as FilterOperation, value: f.value }
                          }
                        }))}>
                      <option value="in">Contains</option>
                      <option value="nin">Not contains</option>
                      <option value="eq">Equal</option>
                      <option value="neq">Not equal</option>
                      <option value="isnull">Empty</option>
                      <option value="isnotnull">Not empty</option>
                    </select>
                    {!["isnull", "isnotnull"].includes(f.op) &&
                      <input
                        value={String(f.value)}
                        onChange={e => setPageParams(p => ({
                          ...p,
                          filters: {
                            ...(p.filters ?? {}),
                            [col.name]: { op: f.op, value: e.target.value }
                          }
                        }))}
                      />
                    }
                  </div>
                }</th>;
            })}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map(r =>
            <tr
              key={r.id}
            >
              {r.getVisibleCells().map(c =>
                <td
                  key={c.id}
                  className="p-2 border-b"
                >
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>

      <div ref={loader} style={{ height: 1 }} />
      {(loadingMore || isFetchingNextPage) &&
        <div className="text-center p-2">
          Loading more…
        </div>
      }
    </div>
  );
}
