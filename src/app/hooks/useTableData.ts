"use client";

import { useState } from "react";
import { useColumns } from "./useColumns";
import { useRows } from "./useRows";
import { nanoid } from "nanoid";
import type { TableColumn, TableRowValue, PageParams } from "~/schemas";

export function useTableData(tableId: number) {
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
    nextCursor,
    isLoading,
    refetch: refetchRows,
    addRow,
    updateRow,
    deleteRow,
  } = useRows(tableId, { ...pageParams, search });

  const hasMore = !!nextCursor;
  const loadMore = () => {
    if (!hasMore) return;
    setPageParams((p) => ({ ...p, lastId: nextCursor }));
  };

  const onSave = async (
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

  const onDelete = async (rowId: string) => {
    await deleteRow({ tableId, rowId });
    await Promise.all([refetchColumns(), refetchRows()]);
  };

  const onInsertRow = async () => {
    const data: Record<string, TableRowValue> = {};
    columns.forEach((c) => {
      if (c.data_type === "numeric") data[c.name] = 0;
      else if (c.data_type === "boolean") data[c.name] = false;
      else if (c.data_type === "date")
        data[c.name] = new Date().toISOString().split("T")[0];
      else data[c.name] = "";
    });

    await addRow({ tableId, rowId: nanoid(), data });
    await Promise.all([refetchColumns(), refetchRows()]);
  };

  return {
    columns,
    rows,
    addRow,
    search,
    setSearch,
    isLoading,
    hasMore,
    loadMore,
    pageParams,
    setPageParams,
    editing,
    setEditing,
    onSave,
    onDelete,
    onInsertRow,
    addColumn,
    updateColumn,
    deleteColumn,
    refetchColumns,
    refetchRows,
  };
}
