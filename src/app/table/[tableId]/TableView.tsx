"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef, type CellContext } from "@tanstack/react-table";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTableData } from "~/app/hooks/useTableData";
import type { Filter, FilterOperation, TableColumn, TableRow, TableRowValue } from "~/lib/schemas";
import { Button } from "~/app/components/ui/button";
import { useNumericColumnFilter } from "~/app/hooks/useNumericColumnFilter";
import { NumericFilterCell } from "~/app/components/NumericFilterCell";
import { TextFilterCell } from "~/app/components/TextFilterCell";

interface TableViewProps {
  userId: string;
  baseId: number;
  tableId: number;
}

export default function TableView(props: TableViewProps) {
  const {
    columns,
    rows,
    totalRows,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    pageParams,
    setPageParams,
    search,
    setSearch,
    editingCell,
    setEditingCell,
    onSaveCell,
    onDeleteRow,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    addRows,
    onInsertRow,
    refetchColumns,
    refetchRows,
    updatingCell,

    savedFilters,
    isSavedFiltersLoading,
    onApplySavedFilter,
    refetchSavedFilters,
    setSavedFilter,
    deleteFilter,
  } = useTableData(props.tableId, props.baseId, props.userId);

  // onMount
  useEffect(() => {
    if (hasNextPage) {
      void fetchNextPage();
    }
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 35,     // average row height
    overscan: 10,               // buffer rows above/below viewport
  });

  // const firstThresholdCheck = useRef(true);

  // useEffect(() => {
  //   if (firstThresholdCheck.current) {
  //     firstThresholdCheck.current = false;
  //     return;
  //   }
  //   if (!hasNextPage || isFetchingNextPage) return;
  //   const last = virtualItems[virtualItems.length - 1];
  //   if (!last) return;

  //   const pct = 0.1; // 10% threshold
  //   const thresholdCount = Math.ceil(rows.length * pct);

  //   // rows.length - last.index is how many remain *after* that row
  //   if (rows.length - last.index <= thresholdCount) {
  //     void fetchNextPage();
  //   }
  // }, [
  //   virtualItems,
  //   rows.length,
  //   hasNextPage,
  //   isFetchingNextPage,
  //   fetchNextPage,
  // ]);

  const loader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loader.current || !hasNextPage || isFetchingNextPage) return; // Added isFetchingNextPage guard here for safety
    const obs = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) { // Double check guards
        void fetchNextPage();
      }
    }, { rootMargin: "200px" }); // Adjust rootMargin as needed
    obs.observe(loader.current);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, loader]); // Added loader and isFetchingNextPage to deps

  // useEffect(() => {
  //   if (!loader.current || !hasNextPage) return;
  //   const obs = new IntersectionObserver(([entry]) => {
  //     if (entry?.isIntersecting) {
  //       void fetchNextPage();
  //     }
  //   }, { rootMargin: "200px" });
  //   obs.observe(loader.current);
  //   return () => obs.disconnect();
  // }, [fetchNextPage, hasNextPage]);

  // newRow inputs
  const [newRow, setNewRow] = useState<Record<string, string>>({});
  useEffect(() => {
    const blank: Record<string, string> = {};
    columns.forEach(c => blank[c.name] = "");
    setNewRow(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.length]);

  const saveNewRow = async () => {
    const data: Record<string, TableRowValue> = {};
    columns.forEach(c => {
      const raw = newRow[c.name] ?? "";
      let v: string | number | boolean = raw;
      if (c.dataType === "numeric") v = Number(raw) || 0;
      if (c.dataType === "boolean") v = raw === "true";
      if (c.dataType === "date") v = raw;
      data[c.name] = v;
    });
    await addRows(
      {
        tableId: props.tableId,
        createdAt: new Date().toISOString(),
        rows: [data]
      },
      {
        onSuccess: () => {
          setNewRow(Object.fromEntries(columns.map(c => [c.name, ""])));
          void refetchColumns();
          void refetchRows();
        }
      }
    );
  };

  const cols = useMemo<ColumnDef<TableRow, TableRowValue>[]>(() => [
    { id: "#", header: "#", enableSorting: false, cell: ({ row }) => row.index + 1 },
    ...columns.map((col: TableColumn) => ({
      id: col.name,
      accessorFn: (row: TableRow) => row.data[col.name],
      header: () => (
        <div className="flex w-full items-center gap-2 h-8">
          <span>
            {col.name}
          </span>
          <div
            className="flex gap-2"
          >
            <Button
              onClick={() => onUpdateColumn(
                col.columnId,
                col.name,
                col.dataType
              )}
              className="flex w-full px-0 justify-center items-center text-center"
            >
              ✏️
            </Button>
            <Button
              onClick={() => onDeleteColumn(
                col.columnId,
              )}
              className="flex w-full px-0 justify-center items-center text-center"
            >
              🗑️
            </Button>
          </div>
        </div>
      ),
      enableSorting: true,
      cell: (info: CellContext<TableRow, TableRowValue>) => {
        const rowId = info.row.original.rowId;
        const val = info.getValue();
        const isUpdating = updatingCell?.rowId === rowId && updatingCell.col === col.name;
        const isEditing = editingCell?.rowId === rowId && editingCell.col === col.name;

        if (editingCell?.rowId === rowId && editingCell.col === col.name) {
          return (
            <input
              autoFocus
              defaultValue={String(val)}
              onBlur={async e => {
                await onSaveCell(rowId, col.name, e.currentTarget.value, col.dataType);
                setEditingCell(undefined);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditingCell(undefined);
              }}
              className="w-full h-full outline-none"
            />
          );
        }
        return (
          <div
            onDoubleClick={() => setEditingCell({ rowId, col: col.name })}
            style={{ cursor: "pointer" }}
          >
            {String(val)}
          </div>
        );

        // if (editingCell?.rowId === rowId && editingCell?.col === col.name) {
        //   return (
        //     <input
        //       autoFocus
        //       defaultValue={String(val)}
        //       className="w-full h-full"
        //       // className="w-full h-full outline-none focus:outline-none ring-0"
        //       onBlur={async e => {
        //         await onSaveCell(rowId, col.name, e.currentTarget.value, col.dataType)
        //         setEditingCell(undefined)          // ← clear edit mode
        //       }}
        //       onKeyDown={e => {
        //         if (e.key === "Enter") {
        //           e.currentTarget.blur()       // will trigger onBlur above
        //         }
        //         if (e.key === "Escape") {
        //           setEditingCell(undefined)        // allow Esc to cancel
        //         }
        //       }}
        //     />
        //   );
        // }
        // return (
        //   <div
        //     className="w-full h-full"
        //     onDoubleClick={() => setEditingCell({ rowId, col: col.name })}
        //   >
        //     {String(val)}
        //   </div>
        // );
        // return (
        //   <CellRenderer
        //     id={rowId}
        //     val={val}
        //     col={col}
        //     isEditing={isEditing}
        //     isUpdating={isUpdating}
        //     onStartEdit={() => {
        //       console.log("Starting edit for cell", rowId, col.name);
        //       setEditingCell({ rowId, col: col.name })
        //     }}
        //     onSaveCell={async (rowId: string, colName: string, raw: string, type: TableColumnDataType) => {
        //       await onSaveCell(rowId, colName, raw, type);
        //       setEditingCell(undefined);
        //     }}
        //   />
        // );
      },
    })),
    {
      id: "actions",
      header: "Actions", cell: ({ row }) => (
        <Button
          onClick={() => onDeleteRow(row.original.rowId)}
          className="h-5 w-full justify-center items-center text-center"
        >
          Delete
        </Button>
      )
    }
  ], [columns, onUpdateColumn, onDeleteColumn, updatingCell, editingCell, setEditingCell, onSaveCell, onDeleteRow]);

  useEffect(() => {
    console.log("editingCell changed:", editingCell);
  }, [editingCell]);

  const table = useReactTable<TableRow>({
    data: rows,
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

  const parseNum = useCallback((raw: unknown): number | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (raw === undefined || raw === undefined || String(raw).trim() === "") {
      return undefined;
    }
    const num = Number(raw);
    return isNaN(num) ? undefined : num;
  }, []);

  const [liveSearchInput, setLiveSearchInput] = useState<string>(search ?? "");

  useEffect(() => {
    if (search !== liveSearchInput) {
      setLiveSearchInput(search ?? "");
    }
  }, [liveSearchInput, search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (liveSearchInput !== search) { // Only update if different from current debounced search
        setPageParams(p => ({ ...p, cursor: undefined, search: liveSearchInput }));
        setSearch(liveSearchInput);
        void refetchRows();
      }
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [liveSearchInput, search, setPageParams, refetchRows, setSearch]);

  return (
    <div>
      <div className="mb-4 flex gap-2 w-full">
        <div
          className="flex-1 flex items-center justify-between gap-2 w-full"
        >
          <Button onClick={async () => {
            await onAddColumn();
          }}
            className="flex border w-48 border-blue-700 hover:bg-gray-50 justify-center items-center text-center"
          >
            + Column
          </Button>
          <Button onClick={onInsertRow}
            className="flex border w-48 border-blue-700 hover:bg-gray-50 justify-center items-center text-center"
          >
            + Blank Row
          </Button>
          <input
            type="text"
            value={liveSearchInput}
            onChange={e => setLiveSearchInput(e.target.value)}
            className="border border-blue-700 text-gray-700 px-3 py-1.5 h-full rounded-md w-full outline-none focus:outline-none ring-0"
            placeholder="Search by any column…"
          />
          <Button onClick={() => {
            setPageParams(p => ({ ...p, filters: {} }));
            setSearch("");
            void refetchRows();
            void refetchSavedFilters();
          }}
            className="flex hover:text-blue-600 justify-center items-center text-center"
          >
            Clear
          </Button>
          <select
            disabled={isSavedFiltersLoading}
            defaultValue=""
            onChange={e => {
              const val = e.target.value
              if (val === "__clear__") {
                // clear all filters
                setPageParams(p => ({ ...p, filters: {} }))
              } else {
                const id = Number(val)
                const sel = savedFilters?.find(f => f.filter_id === id)
                if (sel) onApplySavedFilter(sel)
              }
            }}
            className="border border-gray-700 text-gray-700 rounded px-2 py-1 focus:outline-none"
          >
            <option value="" disabled>
              Load saved filter…
            </option>
            <option value="__clear__">
              Clear filters
            </option>
            {savedFilters?.map(f => (
              <option key={f.filter_id} value={f.filter_id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button
            onClick={async () => {
              const name = prompt("Name this filter set");
              if (!name) return;
              await setSavedFilter({
                userId: props.userId,
                baseId: props.baseId,
                tableId: props.tableId,
                name,
                filters: pageParams.filters ?? {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }}
            className="border border-green-600 hover:bg-green-50 text-green-700 rounded px-2 py-1"
          >
            Save Filter
          </Button>
        </div>
        <div
          className="flex items-center justify-between gap-2 w-40"
        >
          <div
            className="flex-1 flex items-center justify-center gap-2 w-16"
          >
            <p
              className="text-sm text-gray-500 text-center px-4"
            >
              {`Total rows: ${totalRows}`}
            </p>
          </div>
        </div>
      </div>

      <div className="text-sm mb-4 gap-2 border rounded flex items-center">
        <strong
          className="px-4 w-72 text-center"
        >
          New Row:
        </strong>
        <div
          className="flex gap-2 w-full"
        >
          {columns.map((c: TableColumn) =>
            <input
              key={c.name}
              placeholder={c.name}
              value={newRow[c.name] ?? ""}
              onChange={e => setNewRow(prev => ({ ...prev, [c.name]: e.target.value }))}
              className="border border-gray-300 text-gray-700 rounded px-2 py-1 outline-none focus:outline-none ring-0 w-full"
            />
          )}
        </div>
        <Button
          onClick={saveNewRow}
          className="w-32 hover:text-green-600 justify-center items-center text-center"
        >
          Save Row
        </Button>
      </div>


      <div
        ref={scrollRef}
        className="overflow-auto max-h-[600px] border rounded w-full h-full"
      >
        <table className="table-fixed w-full text-sm border-collapse">
          <thead
            className="flex flex-col w-full"
          >
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="sticky top-0 z-20 flex w-full items-center border-b bg-white px-2"
              >
                {hg.headers.map(h => {
                  const isIndex = h.column.id === "#";
                  const isActions = h.column.id === "actions";
                  return (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={
                        isIndex || isActions
                          ? "flex-none w-16 p-2 cursor-pointer flex items-center justify-between"
                          : "flex-1 p-2 cursor-pointer flex items-center justify-between"
                      }
                    >
                      <div
                        className="flex gap-2 items-center w-full"
                        onClick={h.column.getToggleSortingHandler()}
                        onKeyDown={h.column.getToggleSortingHandler()}
                        role="button"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </div>
                      <span className="">
                        {h.column.getIsSorted() === "asc" ? "🔼"
                          : h.column.getIsSorted() === "desc" ? "🔽"
                            : ""}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
            {/* filter row */}
            <tr className="sticky top-10 bg-white z-10 gap-1 p-2 flex w-full items-center justify-start">
              {/* first “#” column if you have one */}
              <th className="flex-none w-16 p-2"></th>
              {columns.map((col: TableColumn) => {
                const f = pageParams.filters?.[col.name] ?? { op: "in", value: "" };

                return (
                  <th key={col.name} className="flex-1 flex flex-row gap-2 w-full">
                    {col.dataType === "numeric"
                      ? <NumericFilterCell
                        colName={col.name}
                        pageParams={pageParams}
                        setPageParams={setPageParams}
                        refetchRows={refetchRows}
                      />
                      : <TextFilterCell
                        colName={col.name}
                        pageParams={pageParams}
                        setPageParams={setPageParams}
                        refetchRows={refetchRows}
                      />
                    }
                  </th>
                );
              })}
              <th className="flex-none w-16 p-2"></th>
            </tr>
          </thead>
          <tbody
            style={{
              position: "relative",
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
            className="flex flex-col w-full min-h-14"
          >
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td
                  colSpan={cols.length}
                  className="p-4 text-center text-gray-500"
                >
                  No rows to display.
                </td>
              </tr>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    style={{
                      position: "absolute",
                      top: `${virtualRow.start}px`,
                    }}
                    className="w-full p-2 flex items-start justify-center gap-1"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isIndex = cell.column.id === "#";
                      const isActions = cell.column.id === "actions";
                      return (
                        <td
                          key={cell.id}
                          className={`flex-1 p-1 px-2 border border-gray-300 rounded gap-2
                          ${isActions
                              ? "flex-none w-16 hover:bg-red-500"
                              : isIndex
                                ? "flex-none w-16 text-center"
                                : "hover:bg-gray-50"
                            }
                        `}
                        >
                          {flexRender(
                            cell.column.columnDef.cell ??
                            ((ctx: CellContext<TableRow, TableRowValue>) =>
                              String(ctx.getValue())),
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div >

      <div ref={loader} style={{ height: 1 }} />
      {
        (isLoading || isFetchingNextPage) &&
        <div className="text-center p-2">
          Loading more…
        </div>
      }
    </div >
  );
}
