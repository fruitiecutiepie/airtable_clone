"use client";

import { useEffect, useState } from "react";
import { useColumns } from "./useColumns";
import { useRows } from "./useRows";
import type { TableColumn, TableRowValue, PageParams, TableColumnDataType, SavedFilter } from "~/schemas";
import { api } from "~/trpc/react";
import { useSavedFilters } from "./useSavedFilters";

export function useTableData(
  tableId: number,
  baseId: number,
  userId: string
) {
  const [pageParams, setPageParams] = useState<PageParams>({ pageSize: 1000 });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ rowId: string; col: string } | undefined>(undefined);

  const {
    columns,
    refetch: refetchColumns,
    addColumn,
    updateColumn,
    deleteColumn,
  } = useColumns(tableId);

  const {
    rows,
    totalRows,
    nextCursor,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch: refetchRows,
    addRows,
    // updateRow,
    deleteRow,
  } = useRows(tableId, { ...pageParams, search });

  const {
    filters: savedFilters,
    isLoading: isSavedFiltersLoading,
    refetch: refetchSavedFilters,
    setSavedFilter,
    deleteFilter,
  } = useSavedFilters(userId, baseId, tableId);


  const hasMore = !!nextCursor;
  const loadMore = () => {
    if (!hasMore) return;
    setPageParams((p) => ({ ...p, lastId: nextCursor }));
  };

  useEffect(() => {
    setPageParams((p) => ({ ...p, cursor: undefined }));
    void refetchRows();
  }, [search, refetchRows]);

  const onApplySavedFilter = (filter: SavedFilter) => {
    setPageParams((p) => ({
      ...p,
      filters: filter.filters,
      cursor: undefined,
    }));
    void refetchRows();
  };

  const onSaveCell = async (
    rowId: string,
    col: string,
    raw: string,
    type: TableColumn["data_type"]
  ) => {
    let v: TableRowValue = raw;
    if (type === "numeric") v = Number(raw) || 0;
    if (type === "boolean") v = raw === "true";
    if (type === "date") v = raw;

    await updateRow({ tableId, rowId, data: { [col]: v } });
    setEditing(undefined);
    await Promise.all([refetchColumns(), refetchRows()]);
  };

  const onDeleteRow = async (rowId: string) => {
    await deleteRow({ tableId, rowId });
    await Promise.all([refetchColumns(), refetchRows()]);
  };

  const onInsertRow = async () => {
    const data: Record<string, TableRowValue> = Object.fromEntries(
      columns.map((c) => [c.name, undefined])
    );
    await addRows({ tableId, rows: [data], createdAt: new Date().toISOString() });
    setPageParams((p) => ({ ...p, cursor: undefined }));
    await Promise.all([refetchColumns(), refetchRows()]);
  };

  const onAddColumn = async () => {
    const name = prompt("Column name?");
    if (!name) return;
    const dataType = prompt("Type? (text,numeric,boolean,date)", "text") as TableColumnDataType;
    if (!dataType) return;
    const position = columns.length;
    await addColumn({ tableId, name, dataType, position });
    setPageParams(p => ({ pageSize: p.pageSize }));
    await refetchRows();
    await refetchColumns();
  };

  const onUpdateColumn = async (
    columnId: number,
    currentName: string,
    currentDataType: TableColumnDataType
  ) => {
    const newName = prompt("Rename column", currentName);
    // const newType = prompt("Type? (text,numeric,boolean,date)", "") as TableColumnDataType;
    if (!newName) return;
    await updateColumn({
      tableId,
      columnId,
      name: newName,
      dataType: currentDataType
    });
    // reset pagination cursor
    setPageParams(p => ({ pageSize: p.pageSize }));
    await refetchRows();
    await refetchColumns();
  };

  const onDeleteColumn = async (columnId: number) => {
    if (!confirm("Delete this column?")) return;
    await deleteColumn({ tableId, columnId });
    setPageParams(p => ({ pageSize: p.pageSize }));
    await refetchRows();
    await refetchColumns();
  };

  return {
    columns,
    rows,
    totalRows,
    nextCursor,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    addRows,
    search,
    setSearch,
    isLoading,
    hasMore,
    loadMore,
    pageParams,
    setPageParams,
    editing,
    setEditing,
    onSaveCell,
    onDeleteRow,
    onInsertRow,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    refetchColumns,
    refetchRows,

    savedFilters,
    isSavedFiltersLoading,
    onApplySavedFilter,
    refetchSavedFilters,
    setSavedFilter,
    deleteFilter,
  };
}
