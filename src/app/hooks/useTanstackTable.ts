import { type ColumnDef, useReactTable, getCoreRowModel, type OnChangeFn, type SortingState, type RowData } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useEffect, useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { TableRow, TableRowValue, TableColumn, PageParams, TableColumnDataType } from "~/lib/schemas";
import TableHeader from "../[baseId]/[tableId]/TableHeader";
import TableCell from "../components/TableCell";
import { useSkipper } from "./useSkipper";

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

export function useTanstackTable(
  rows: TableRow[],
  columns: TableColumn[],

  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,

  hiddenColumnIds: Set<number>,
  handleColumnToggle: (columnId: string, hidden: boolean) => void,
  onFilterColumnClick: (column: TableColumn) => void,

  onUpdRow: (rowId: string, data: Record<string, TableRowValue>) => Promise<void>,
  onUpdCol: (columnId: number, newName: string) => Promise<void>,
  onDelCol: (columnId: number) => Promise<void>,
  onSortColumn: (column: TableColumn, direction: "asc" | "desc" | undefined) => void,
) {
  const [cellToFocus, setCellToFocus] = useState<{
    rowIndex: number;
    columnId: string;
  } | undefined>(undefined);
  const [sorting, setSorting] = useState<SortingState>([])
  const [triggerFocusOnNewRow, setTriggerFocusOnNewRow] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const previousRowCountRef = useRef(0);

  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

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
    handleColumnToggle(column.columnId.toString(), false);
  }, [handleColumnToggle]);

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
          onFilterColumn: onFilterColumnClick,
          onHideColumn,
          onDeleteColumn: onDelCol
        }),
        cell: TableCell,
        meta: {
          dataType: col.dataType,
        },
        size: 200,
      })),
  ], [columns, hiddenColumnIds, pageParams.sortCol, pageParams.sortDir, onUpdCol, onSortColumn, onToggleSortColumn, onFilterColumnClick, onHideColumn, onDelCol]);

  const table = useReactTable<TableRow>({
    data: rows,
    columns: cols,
    defaultColumn: {
      cell: TableCell
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
  const handleSortingChange: OnChangeFn<SortingState> = useCallback(updater => {
    setSorting(updater)
    if (!!tableModelRows.length) {
      rowVirtualizer.scrollToIndex?.(0)
    }
  }, [rowVirtualizer, tableModelRows]);

  useEffect(() => {
    table.setOptions(prev => ({
      ...prev,
      onSortingChange: handleSortingChange,
    }))
  }, [table, handleSortingChange])

  // Track previous row count
  useEffect(() => {
    previousRowCountRef.current = tableModelRows.length;
  }, [tableModelRows.length]);

  // When a new row appears, scroll to it and mark it as “to be focused”
  useEffect(() => {
    const currCount = tableModelRows.length;

    if (triggerFocusOnNewRow) {
      if (currCount > previousRowCountRef.current) {
        const newIndex = currCount - 1; // Assumes new row is the last one
        const firstEditableColumn = cols.find(c => c.id !== "#");
        if (firstEditableColumn?.id) {
          rowVirtualizer.scrollToIndex(newIndex, {
            align: "start",
            behavior: "auto",
          });
          setCellToFocus({ rowIndex: newIndex, columnId: firstEditableColumn.id });
        }
      }
      // Always reset the trigger after an attempt, whether conditions were met or not,
      // to ensure it's a one-shot mechanism per activation by setTriggerFocusOnNewRow(true).
      setTriggerFocusOnNewRow(false);
    }
    // Note: previousRowCountRef.current is updated in the subsequent effect.
  }, [
    tableModelRows.length, // Effect runs when row length changes
    triggerFocusOnNewRow,  // Effect also runs if trigger is set to true
    cols,
    rowVirtualizer,
    setCellToFocus, // Added as a dependency
    setTriggerFocusOnNewRow // Added as a dependency
  ]);

  // Track previous row count. This runs after the above effect has processed the change.
  useEffect(() => {
    previousRowCountRef.current = tableModelRows.length;
  }, [tableModelRows.length]);

  // Clear cellToFocus if the focused row might no longer be valid due to row changes
  useEffect(() => {
    if (
      cellToFocus &&
      tableModelRows.length <= previousRowCountRef.current && // Row count decreased or didn't change as expected post-focus
      (cellToFocus.rowIndex >= tableModelRows.length || tableModelRows[cellToFocus.rowIndex]?.id !== cellToFocus.columnId) // Basic check if cell might be invalid
    ) {
      setCellToFocus(undefined);
      // triggerFocusOnNewRow should have already been reset by the main focusing effect.
    }
  }, [tableModelRows.length, cellToFocus, setCellToFocus, tableModelRows]);

  return {
    rows: tableModelRows,
    colsLength: cols.length,
    table,
    rowVirtualizer,
    tableContainerRef,
    onFilterColumn,
    setTriggerFocusOnNewRow,
  };
}