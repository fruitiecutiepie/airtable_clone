"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef, type CellContext, type RowData, type OnChangeFn, type SortingState } from "@tanstack/react-table";
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PageParams, TableColumn, TableColumnDataType, TableRow, TableRowValue } from "~/lib/schemas";
import TableHeader from "./TableHeader";
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { ContextMenu } from "radix-ui";
import { TrashIcon } from "@heroicons/react/24/outline";
import { NumericFilterCell } from "~/app/components/NumericFilterCell";
import { TextFilterCell } from "~/app/components/TextFilterCell";
import { DateRangeFilterCell } from "~/app/components/DateRangeFilterCell";
import { Button } from "~/app/components/ui/Button";
import { useRowsStream, type EventSourceMessage } from "~/app/hooks/useRowsStream";
import { fetcher } from "~/lib/fetcher";
import { api } from "~/trpc/react";

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIdx: string, columnId: string, value: TableRowValue) => Promise<void>;
    cellToFocus?: { rowIndex: number; columnId: string } | null;
    clearCellToFocus?: () => void;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    dataType: TableColumnDataType;
  }
}

const EditableCell = (props: CellContext<TableRow, TableRowValue>) => {
  const { getValue, row, column, table } = props;

  const initialValue = getValue();
  const dataType = column.columnDef.meta?.dataType;

  const [value, setValue] = useState<TableRowValue>(initialValue);

  const cellToFocus = table.options.meta?.cellToFocus;
  const clearCellToFocus = table.options.meta?.clearCellToFocus;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      cellToFocus?.rowIndex === row.index &&
      cellToFocus?.columnId === column.id
    ) {
      inputRef.current?.focus();
      clearCellToFocus?.();
    }
  }, [cellToFocus, row.index, column.id, clearCellToFocus]);

  const onBlur = async () => {
    if (value === initialValue) return;
    let newValue: TableRowValue | undefined = value;
    switch (dataType) {
      case "numeric":
        if (isNaN(Number(value))) {
          setValue(initialValue);
          return;
        }
        newValue = value === "" ? undefined : Number(value);
        break;
      case "text":
        if (typeof value !== "string") {
          setValue(initialValue);
          return;
        }
        newValue = value.trim() === "" ? undefined : value.trim();
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          setValue(initialValue);
          return;
        }
        newValue = value;
        break;
      case "date":
        if (typeof value !== "string" || isNaN(Date.parse(value))) {
          setValue(initialValue);
          return;
        }
        newValue = value === "" ? undefined : new Date(value).toISOString();
        break;
      default:
        console.warn(`Unsupported data type: ${dataType}`);
        return;
    }

    await table.options.meta?.updateData(
      row.original.rowId,
      column.id,
      newValue
    );
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (dataType === "boolean") {
    return (
      <input
        ref={inputRef}
        type="checkbox"
        checked={Boolean(value)}
        onChange={e => setValue(e.target.checked)}
        onBlur={onBlur}
        className="w-full h-full p-0 m-0 border-none outline-none bg-transparent box-border text-xs"
      />
    );
  }

  if (dataType === "date") {
    // strip ISO to yyyy-MM-dd
    const dateStr = typeof value === "string" ? value.slice(0, 10) : "";
    return (
      <input
        ref={inputRef}
        type="date"
        value={dateStr}
        onChange={e => setValue(e.target.value)} // keep "yyyy-MM-dd"
        onBlur={onBlur}                          // onBlur will toISOString()
        className="w-full h-full p-0 m-0 border-none outline-none bg-transparent box-border text-xs"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type={dataType === "numeric" ? "number" : "text"}
      value={value != null ? String(value) : ""}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full h-full p-0 m-0 border-none outline-none bg-transparent box-border text-xs"
    />
  );
};

function useSkipper() {
  const shouldSkipRef = React.useRef(true)
  const shouldSkip = shouldSkipRef.current

  // Wrap a function with this to skip a pagination reset temporarily
  const skip = React.useCallback(() => {
    shouldSkipRef.current = false
  }, [])

  React.useEffect(() => {
    shouldSkipRef.current = true
  })

  return [shouldSkip, skip] as const
}

interface TableViewProps {
  baseId: number;
  tableId: number;

  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  pageParams: PageParams;
  setPageParams: React.Dispatch<React.SetStateAction<PageParams>>;

  onSaveFilterClick: () => Promise<void>;

  hiddenColumnIds: Set<number>;
  handleColumnToggle: (columnId: string, hidden: boolean) => void;
  columns: TableColumn[];
  onAddCol: (name: string, dataType: TableColumnDataType) => Promise<void>;
  onUpdCol: (columnId: number, newName: string) => Promise<void>;
  onDelCol: (columnId: number) => Promise<void>;
  onSortColumn: (column: TableColumn, direction: "asc" | "desc" | undefined) => void;
}

export default function TableView({
  baseId,
  tableId,

  search,
  setSearch,
  pageParams,
  setPageParams,

  onSaveFilterClick,

  hiddenColumnIds,
  handleColumnToggle,
  columns,
  onAddCol,
  onUpdCol,
  onDelCol,
  onSortColumn
}: TableViewProps) {
  const [cellToFocus, setCellToFocus] = useState<{
    rowIndex: number;
    columnId: string;
  } | undefined>(undefined);
  const [triggerFocusOnNewRow, setTriggerFocusOnNewRow] = useState(false);
  const previousRowCountRef = useRef(0);

  // const {
  //   infRows,
  //   infRowsHasNextPage,
  //   infRowsIsLoading,
  //   infRowsIsFetching,
  //   infRowsFetchNextPage,
  //   infRowsRefetch,

  //   flatRows,
  //   // nextCursor,
  //   totalRows,

  //   onAdd100kRowsClick,
  //   streamLoading,
  //   streamLoadingCount,

  //   onAddRow,
  //   onUpdRow,
  //   onDelRow,
  // } = useRows(baseId, tableId, { ...pageParams, search }, setPageParams);

  const depsKey = [
    search,
    pageParams.sortCol,
    pageParams.sortDir,
    JSON.stringify(pageParams.filters)
  ].join("|");

  const {
    rows,
    totalRows,
    setTotalRows,
    loading: streamLoading,
    error: streamError,
    fetchNextPage,
    reset
  } = useRowsStream(baseId, tableId, search, pageParams, depsKey);
  const loadedRows = useMemo(() => rows.length, [rows.length]);

  const addRows = api.table.addRows.useMutation();
  const updRow = api.table.updRow.useMutation();
  const delRow = api.table.delRow.useMutation();

  const onAddRow = useCallback(async (data: Record<string, TableRowValue>) => {
    await addRows.mutateAsync({ tableId, rows: [data], createdAt: new Date().toISOString() });
    reset();
  }, [addRows, tableId, reset]);

  const onUpdRow = useCallback(async (
    rowId: string,
    data: Record<string, TableRowValue>
  ) => {
    await updRow.mutateAsync({ tableId, rowId, data });
    await fetchNextPage();
  }, [updRow, tableId, fetchNextPage]);

  const onDelRow = useCallback(async (rowId: string) => {
    await delRow.mutateAsync({ tableId, rowId });
    await fetchNextPage();
  }, [delRow, tableId, fetchNextPage]);

  const [is100kRowsLoading, setIs100kRowsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>(undefined);

  const onAdd100kRowsClick = useCallback(async () => {
    setIs100kRowsLoading(true);
    const { jobId } = await fetcher<{ jobId: string }>(
      `/api/${baseId}/${tableId}/rows/100k`,
      { method: "POST" }
    );
    setJobId(jobId);
  }, [baseId, tableId]);

  const latestCountProgressRef = useRef<number>(0);
  // const canUpdateRef = useRef<boolean>(true);

  // useEffect(() => {
  //   const es = new EventSource(`/api/events/${jobId}`);
  //   es.onmessage = (e) => {
  //     const msg = JSON.parse(e.data as string) as EventSourceMessage;
  //     if (msg.type === "progress" && typeof msg.rows === "number") {
  //       latestCountProgressRef.current = msg.rows;
  //       console.log(`EventSource progress: ${msg.rows} rows canUpdate: ${canUpdateRef.current}`);
  //       if (canUpdateRef.current) {
  //         canUpdateRef.current = false;
  //         setTotalRows(latestCountProgressRef.current);
  //         setTimeout(() => {
  //           canUpdateRef.current = true;
  //         }, 200); // only allow an update every 200 ms
  //       }
  //     }
  //     if (msg.type === "done") {
  //       es.close();
  //       latestCountProgressRef.current = msg.rows ?? latestCountProgressRef.current;
  //       setTotalRows(latestCountProgressRef.current);
  //       setStreamLoading(false);
  //     }
  //     if (msg.type === "error") {
  //       console.error(msg.message);
  //       es.close();
  //       setStreamLoading(false);
  //     }
  //   };
  //   return () => es.close();
  // }, [jobId, setTotalRows, setStreamLoading]);

  useEffect(() => {
    latestCountProgressRef.current = 0;

    if (!jobId) return;

    const initialTotal = totalRows;

    let rafId: number | undefined = undefined;
    const flushToState = () => {
      setTotalRows(latestCountProgressRef.current + initialTotal);
      rafId = undefined;
    };

    console.log(`Starting EventSource for jobId: ${jobId}`);
    const es = new EventSource(`/api/events/${jobId}`);
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as EventSourceMessage;
      if (msg.type === "progress" && typeof msg.rows === "number") {
        console.log(`EventSource progress: ${msg.rows} rows`);
        // keep updating the ref (no re-render yet)
        latestCountProgressRef.current = msg.rows;
        // schedule exactly one rAF per frame
        rafId ??= requestAnimationFrame(flushToState);
      }
      if (msg.type === "done") {
        es.close();
        setIs100kRowsLoading(false);
        void fetchNextPage();
        latestCountProgressRef.current = 0;
      }
      if (msg.type === "error") {
        latestCountProgressRef.current = 0;
        console.error(msg.message);
        es.close();
        setIs100kRowsLoading(false);
      }
    };
    es.onerror = (e) => {
      latestCountProgressRef.current = 0;
      console.error("EventSource error:", e);
      es.close();
      setIs100kRowsLoading(false);
    }

    return () => {
      es.close();
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      latestCountProgressRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const onToggleSortColumn = useCallback((column: TableColumn) => {
    const isSorted = pageParams.sortCol === column.name;
    const newDirection = isSorted && pageParams.sortDir === "asc"
      ? "desc"
      : isSorted && pageParams.sortDir === "desc"
        ? undefined
        : "asc";
    onSortColumn(column, newDirection);
  }, [onSortColumn, pageParams.sortCol, pageParams.sortDir]);

  const onFilterColumn = useCallback((column: TableColumn) => {
    // This function will clear the filter for the given column.
    // Users can then use the specific filter cells to set a new filter.
    setPageParams(p => {
      const newFilters = { ...p.filters };
      delete newFilters[column.name];
      return {
        ...p,
        cursor: undefined, // Reset cursor when filter changes
        filters: newFilters,
      };
    });
  }, [setPageParams]);

  const onHideColumn = useCallback((column: TableColumn) => {
    handleColumnToggle(column.name, true);
  }, [handleColumnToggle]);

  const [liveSearchInput, setLiveSearchInput] = useState<string>(search ?? "");

  useEffect(() => {
    // whenever the external `search` prop changes, reset the input
    setLiveSearchInput(search ?? "");
  }, [search]);

  // debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (liveSearchInput !== search) {
        setSearch(liveSearchInput);
        setPageParams(p => ({ ...p, cursor: undefined, search: liveSearchInput }));
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [liveSearchInput, search, setSearch, setPageParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (liveSearchInput !== search) {
        setSearch(liveSearchInput);
        setPageParams(p => ({ ...p, cursor: undefined, search: liveSearchInput }));
      }
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [liveSearchInput, search, setPageParams, setSearch]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = React.useState<SortingState>([])

  const loader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loader.current) {
      return;
    }
    const obs = new IntersectionObserver(([entry]) => {
      console.log(`entry.isIntersecting: ${entry?.isIntersecting} streamLoading: ${streamLoading} loadedRows: ${loadedRows} totalRows: ${totalRows}`);
      if (
        entry?.isIntersecting
        && !streamLoading
        && loadedRows < totalRows
      ) {
        void fetchNextPage();
      }
    }, {
      root: tableContainerRef.current,
      // rootMargin: "0px 0px 200px 0px",
    })
    obs.observe(loader.current);
    return () => obs.disconnect();
  }, [fetchNextPage, loadedRows, streamLoading, totalRows]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (
        scrollHeight - (scrollTop + clientHeight) < 1200 // 1200px from the bottom
        && !streamLoading
        && loadedRows < totalRows
      ) {
        void fetchNextPage();
      }
    };

    el.addEventListener("scroll", onScroll);
    // run once in case content is short
    onScroll();
    return () => void el.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, loadedRows, streamLoading, totalRows]);

  const cols = useMemo<ColumnDef<TableRow, TableRowValue>[]>(() => [
    {
      id: "#",
      header: "",
      enableSorting: true,
      cell: ({ row }) => row.index + 1,
      size: 40
    },
    ...columns
      .filter(col => !hiddenColumnIds.has(col.columnId))
      .map((col: TableColumn) => ({
        id: col.name,
        accessorFn: (row: TableRow) => row.data[col.name],
        header: () => TableHeader({
          col,
          sortDir: pageParams.sortCol === col.name ? pageParams.sortDir : undefined,
          onUpdateColumn: onUpdCol,
          onSortColumn,
          onToggleSortColumn,
          onFilterColumn,
          onHideColumn,
          onDeleteColumn: onDelCol
        }),
        cell: EditableCell,
        meta: {
          dataType: col.dataType,
        },
        size: 200,
      })),
  ], [columns, hiddenColumnIds, pageParams.sortCol, pageParams.sortDir, onUpdCol, onSortColumn, onToggleSortColumn, onFilterColumn, onHideColumn, onDelCol]);

  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

  const table = useReactTable<TableRow>({
    data: rows,
    columns: cols,
    defaultColumn: {
      cell: EditableCell
    },
    state: {
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    meta: {
      updateData: async (rowIdx, columnId, value) => {
        // Skip page index reset until after next rerender
        skipAutoResetPageIndex()
        await onUpdRow(rowIdx, {
          [columnId]: value,
        });
      },
      cellToFocus,
      clearCellToFocus: () => setCellToFocus(undefined),
    },
    debugTable: true,
  })

  const { rows: tableModelRows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 33, // estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    // measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== 'undefined' &&
        !navigator.userAgent.includes('Firefox')
        ? element => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  });

  // scroll to top of table when sorting changes
  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    setSorting(updater)
    if (!!table.getRowModel().rows.length) {
      rowVirtualizer.scrollToIndex?.(0)
    }
  }

  // since this table option is derived from table row model state, we're using the table.setOptions utility
  table.setOptions(prev => ({
    ...prev,
    onSortingChange: handleSortingChange,
  }))

  // Track previous row count
  useEffect(() => {
    previousRowCountRef.current = tableModelRows.length;
  }, [tableModelRows.length]);

  // When a new row appears, scroll to it and mark it as “to be focused”
  useEffect(() => {
    const currCount = tableModelRows.length;
    if (
      triggerFocusOnNewRow &&
      currCount > previousRowCountRef.current
    ) {
      const newIndex = currCount - 1;
      const firstEditable = cols.find(c => c.id !== "#");
      if (firstEditable && firstEditable.id) {
        rowVirtualizer.scrollToIndex(newIndex, {
          align: "start",
          behavior: "auto",
        });
        setCellToFocus({ rowIndex: newIndex, columnId: firstEditable.id });
      }
    }
  }, [
    tableModelRows.length,
    triggerFocusOnNewRow,
    cols,
    rowVirtualizer,
  ]);

  // Clear trigger flag once focus is handed off
  useEffect(() => {
    if (
      cellToFocus &&
      tableModelRows.length <= previousRowCountRef.current
    ) {
      // If row count didn't actually increase, abandon focus attempt
      setTriggerFocusOnNewRow(false);
      setCellToFocus(undefined);
    }
  }, [tableModelRows.length, cellToFocus]);

  const onAddColumnClick = useCallback(async () => {
    const columnName = prompt("Enter new column name:");
    if (!columnName) return;

    const dataType = prompt("Enter data type (text, numeric, boolean, date):");
    if (!dataType || !["text", "numeric", "boolean", "date"].includes(dataType)) {
      alert("Invalid data type. Please enter one of: text, numeric, boolean, date.");
      return;
    }

    try {
      await onAddCol(columnName, dataType as TableColumnDataType);
      setPageParams(p => ({ ...p, cursor: undefined })); // Reset cursor to fetch new columns
    } catch (error) {
      console.error("Failed to add column:", error);
    }
  }, [onAddCol, setPageParams]);

  const onAddRowClick = useCallback(async () => {
    try {
      await onAddRow(Object.fromEntries(
        columns.map((col: TableColumn) => [col.name, undefined])
      ));
      setTriggerFocusOnNewRow(true);
    } catch (error) {
      console.error("Failed to add row:", error);
      setTriggerFocusOnNewRow(false);
    }
  }, [columns, onAddRow]);

  if (streamError) {
    return (
      <div className="flex items-center justify-center w-full h-full text-red-500">
        <p>Error loading data: {streamError}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full h-full p-4 bg-background"
    >
      <div
        className="flex flex-col gap-2 w-full h-full"
      >
        <div
          className="flex items-center justify-between gap-2 w-full"
        >
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onAdd100kRowsClick}
              disabled={is100kRowsLoading}
              size="xs"
              className="hover:bg-gray-100 text-gray-700 border-gray-400"
            >
              {is100kRowsLoading ? "Loading..." : "Add 100k rows"}
            </Button>
            <div className="relative w-80">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={liveSearchInput}
                onChange={e => setLiveSearchInput(e.target.value)}
                className="border border-gray-300 pl-9 text-gray-700 text-sm px-3 py-1.5 h-full rounded-md w-full outline-none focus:outline-none ring-0"
                placeholder="Find in view…"
              />
            </div>
          </div>

        </div>
        <div
          className="flex flex-col w-full h-full border border-gray-300 rounded"
        >
          <div
            className="flex flex-col w-full h-full"
          >
            <div
              className="flex flex-col w-full"
            >
              <div
                ref={tableContainerRef}
                className="overflow-auto max-h-[600px] max-w-screen w-full flex-1"
              >
                <div
                  className="sticky top-0 z-10 flex pr-40"
                >
                  <div
                  >
                    <div
                      className="flex flex-col"
                      style={{
                        width: `${table.getTotalSize()}px`,
                      }}
                    >
                      {/* header row */}
                      {table.getHeaderGroups().map((headerGroup) => (
                        <React.Fragment key={headerGroup.id}>
                          <div className="flex w-full">
                            {headerGroup.headers.map((header) => {
                              const isIndex = header.column.id === "#";

                              return (
                                <div
                                  key={header.id}
                                  className={`
                                    flex items-center border-b border-r border-gray-300 bg-stone-50 h-8
                                    ${isIndex
                                      ? "flex-none justify-center"
                                      : "flex-auto justify-between cursor-pointer hover:bg-stone-100"
                                    }
                                  `}
                                  style={{
                                    width: header.getSize(),
                                  }}
                                  onClick={isIndex ? undefined : header.column.getToggleSortingHandler()}
                                  role={isIndex ? undefined : "button"}
                                  tabIndex={isIndex ? undefined : 0}
                                  onKeyDown={isIndex ? undefined : e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      header.column.getToggleSortingHandler()?.(e);
                                    }
                                  }}
                                >
                                  <div
                                    className={`
                                      flex items-center w-full overflow-hidden
                                      ${isIndex ? "justify-center" : "justify-between gap-1"}
                                    `}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div
                            className="sticky top-8 flex bg-white border-b border-gray-300 z-10 h-8"
                          >
                            {headerGroup.headers.map((header) => {
                              const isIndex = header.column.id === "#";
                              const originalColumn = columns.find(c => c.name === header.column.id);

                              return (
                                <div
                                  key={`filter-${header.id}`}
                                  className={`flex items-center border-r border-gray-300 ${isIndex ? "flex-none bg-stone-50" : "flex-auto"}`}
                                  style={{
                                    width: header.getSize()
                                  }}
                                >
                                  {!isIndex && originalColumn && (
                                    <div
                                      className="relative flex items-center h-full w-full text-sm"
                                    >
                                      {(() => {
                                        switch (originalColumn.dataType) {
                                          case "numeric":
                                            return (
                                              <NumericFilterCell
                                                colName={originalColumn.name}
                                                pageParams={pageParams}
                                                setPageParams={setPageParams}
                                              />
                                            );
                                          case "text":
                                            return (
                                              <TextFilterCell
                                                colName={originalColumn.name}
                                                pageParams={pageParams}
                                                setPageParams={setPageParams}
                                              />
                                            );
                                          case "boolean": {
                                            const filterValue = pageParams.filters?.[originalColumn.name]?.[0]?.value;

                                            return (
                                              <div
                                                className="flex items-center justify-center h-full w-full gap-1"
                                              >
                                                <select
                                                  className="
                                                    border rounded border-gray-300 text-gray-700 
                                                    outline-none focus:outline-none ring-0
                                                  "
                                                  value={filterValue != null ? String(filterValue) : ""}
                                                  onChange={e => {
                                                    const v = e.target.value;
                                                    if (v === "") {
                                                      setPageParams(p => ({
                                                        ...p,
                                                        cursor: undefined,
                                                        filters: { ...p.filters, [originalColumn.name]: [] }
                                                      }));
                                                      return;
                                                    }
                                                    setPageParams(p => ({
                                                      ...p,
                                                      cursor: undefined,
                                                      filters: {
                                                        ...p.filters,
                                                        [originalColumn.name]: [{ op: "eq", value: v === "true" }]
                                                      }
                                                    }));
                                                  }}
                                                >
                                                  <option value="">All</option>
                                                  <option value="true">True</option>
                                                  <option value="false">False</option>
                                                </select>
                                              </div>
                                            );
                                          }
                                          case "date": {
                                            return (
                                              <DateRangeFilterCell
                                                colName={originalColumn.name}
                                                pageParams={pageParams}
                                                setPageParams={setPageParams}
                                              />
                                            );
                                          }
                                          default:
                                            return null;
                                        }
                                      })()}
                                      {pageParams.filters?.[originalColumn.name]?.length ? (
                                        <button
                                          onClick={() => onFilterColumn(originalColumn)}
                                          className="absolute right-1 text-gray-400 hover:text-gray-600"
                                          title="Clear filter"
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div
                    className="flex flex-col"
                  >
                    <div
                      className="
                        flex-none top-0 right-0 flex items-center h-8 bg-stone-100
                        border-b border-r border-gray-300 cursor-pointer hover:bg-stone-200 z-10
                      "
                      onClick={onAddColumnClick}
                      role="button"
                      tabIndex={0}
                      onKeyDown={async e => {
                        if (e.key === "Enter" || e.key === " ") {
                          await onAddColumnClick();
                        }
                      }}
                      aria-label="Add new column"
                    >
                      <div
                        className="flex-none flex items-center justify-center h-full w-48"
                      >
                        <PlusIcon className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                    <div
                      className="
                        flex-none top-0 right-0 flex items-center h-8 bg-purple-700 text-gray-50
                        cursor-pointer hover:bg-purple-800 z-10
                      "
                      onClick={onSaveFilterClick}
                      role="button"
                      tabIndex={0}
                      onKeyDown={async e => {
                        if (e.key === "Enter" || e.key === " ") {
                          await onSaveFilterClick();
                        }
                      }}
                      aria-label="Save current filter"
                    >
                      <div
                        className="flex-none flex items-center justify-center h-full w-48 text-sm"
                      >
                        Save Filter
                      </div>
                    </div>
                  </div>
                </div>
                <table
                  className="table-fixed w-full text-xs border-collapse"
                >
                  <tbody
                    style={{
                      display: "grid",
                      position: "relative",
                      width: `${table.getTotalSize()}px`,
                      height: `${rowVirtualizer.getTotalSize()}px`,
                    }}
                    className="w-full relative text-xs"
                  >
                    {tableModelRows.length === 0 && !streamLoading ? (
                      <tr
                        className="flex w-full absolute top-0 left-0"
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                      >
                        <td
                          colSpan={cols.length}
                          className="flex items-center justify-center text-gray-500 text-sm p-4"
                          style={{ width: "100%" }}
                        >
                          No rows to display.
                        </td>
                      </tr>
                    ) : (
                      rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = table.getRowModel().rows[virtualRow.index];
                        if (!row) return null;
                        const col = row.getVisibleCells()[0];
                        if (!col) return null;
                        return (
                          <ContextMenu.Root
                            key={row.id}
                          >
                            <ContextMenu.Trigger
                              asChild
                            >
                              <tr
                                ref={(node) => rowVirtualizer.measureElement(node)}
                                data-index={virtualRow.index}
                                style={{
                                  display: "flex",
                                  width: "100%",
                                  position: "absolute",
                                  top: `${virtualRow.start}px`,
                                  height: `${virtualRow.size}px`,
                                  left: 0,
                                }}
                                className="border border-gray-200 bg-white"
                              >
                                {row.getVisibleCells().map((cell) => {
                                  const isIndex = cell.column.id === "#";
                                  return (
                                    <td
                                      key={cell.id}
                                      data-row-index={row.index}
                                      data-col-id={col.id}
                                      className={`
                                        flex items-center p-[0.33rem] border-r border-gray-200
                                        ${isIndex
                                          ? "flex-none justify-center text-center"
                                          : "flex-auto px-2 hover:bg-gray-50 min-w-0"
                                        }
                                      `}
                                      style={{
                                        width: cell.column.getSize(),
                                      }}
                                    >
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            </ContextMenu.Trigger>
                            <ContextMenu.Portal>
                              <ContextMenu.Content
                                className="bg-gray-50 shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs
                                  fixed mt-1 z-50
                                  origin-top-left
                                "
                              >
                                <div key={`context-section-${0}`} className="flex flex-col">
                                  <ContextMenu.Item
                                    key={`${row.original.rowId}`}
                                    className={`flex items-center p-2 gap-2 rounded
                                          cursor-pointer data-[highlighted]:bg-gray-100 outline-none
                                          text-sm leading-none
                                        `}
                                    onSelect={async () => {
                                      const rowId = row.original.rowId;
                                      await onDelRow(rowId);
                                    }}
                                  >
                                    <TrashIcon className="inline-flex items-center justify-center h-4 w-4 shrink-0" />
                                    <span className={`text-red-700`}>
                                      Delete record
                                    </span>
                                  </ContextMenu.Item>
                                </div>
                              </ContextMenu.Content>
                            </ContextMenu.Portal>
                          </ContextMenu.Root >
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div ref={loader} className="w-full h-px opacity-0" />
              </div>
            </div>
            <div
              className="
                sticky bottom-0 left-0 flex items-center w-full h-8 bg-white
                border-t border-gray-300 cursor-pointer hover:bg-stone-50
              "
              onClick={onAddRowClick}
              role="button"
              tabIndex={0}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  await onAddRowClick();
                }
              }}
              aria-label="Add new row"
            >
              <div
                className="flex-none flex items-center justify-center h-full"
                style={{ width: `40px` }}
              >
                <PlusIcon className="w-4 h-4 text-gray-600" />
              </div>
              {/* <div className="flex-auto px-2 text-sm text-gray-500">
                Add new row
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {
        streamLoading && loadedRows < totalRows &&
        <div className="text-center p-2">
          Loading more…
        </div>
      }
    </div >
  );
}
