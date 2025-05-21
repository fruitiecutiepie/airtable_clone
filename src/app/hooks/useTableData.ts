"use client";
import { useState, useMemo } from "react";
import {
  useGetColumns,
  useGetRows,
  useSearchRows,
  useUpdateRow,
  useDeleteRow,
  useAddRow,
  useAddColumn,
  useUpdateColumn,
  useDeleteColumn,
} from "../api/api";
import type {
  TableColumn,
  TableRow,
  PageParams,
  TableRowValue,
  TableColumnDataType,
} from "~/schemas";
import { nanoid } from "nanoid";

export function useTableData(tableId: number) {
  // 1. Local UI state
  const [pageParams, setPageParams] = useState<PageParams>({ pageSize: 20000 });
  const [search, setSearch] = useState<string>("");
  // editing state for in-place cell editing
  const [editing, setEditing] = useState<{
    rowId: string;
    col: string;
  } | null>(null);

  // 2. Queries (hooks at top level)
  const { data: columnsMeta = [], refetch: refetchColumns } = useGetColumns(tableId);

  const getRows = useGetRows(tableId, pageParams);
  const searchRows = useSearchRows(tableId, search, pageParams.pageSize);

  // 3. Mutations (hooks at top level)
  const updateRow = useUpdateRow();
  const deleteRow = useDeleteRow();
  const insertRow = useAddRow();
  const addColumn = useAddColumn();

  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();

  const onUpdateColumn = (columnId: number, currentName: string) => {
    const newName = prompt("Rename column", currentName);
    const newType = prompt("Type? (text,numeric,boolean,date)", "") as TableColumnDataType;
    if (!newName || !newType) return;
    updateColumn.mutate(
      { tableId, columnId, name: newName, dataType: newType },
      {
        async onSuccess() {
          // reset pagination cursor
          setPageParams(p => ({ pageSize: p.pageSize }));
          if (search.length > 0) {
            await searchRows.refetch();
          } else {
            await getRows.refetch();
          }
          await refetchColumns();
        }
      }
    );
  };

  const onDeleteColumn = (columnId: number) => {
    if (!confirm("Delete this column?")) return;
    deleteColumn.mutate(
      { tableId, columnId },
      {
        async onSuccess() {
          setPageParams(p => ({ pageSize: p.pageSize }));
          if (search.length > 0) {
            await searchRows.refetch();
          } else {
            await getRows.refetch();
          }
          await refetchColumns();
        }
      }
    );
  };

  const onRefetch = () => {
    void refetchColumns();
    if (search) {
      void searchRows.refetch();
    } else {
      void getRows.refetch();
    }
  };

  // 4. Derived values
  const rows = useMemo<TableRow[]>(() => {
    return search
      ? searchRows.data?.rows ?? []
      : getRows.data?.rows ?? [];
  }, [search, searchRows.data, getRows.data]);

  const hasMore = useMemo<boolean>(() => {
    return !!getRows.data?.nextCursor;
  }, [getRows.data]);

  const isLoading = search
    ? searchRows.isLoading
    : getRows.isLoading;

  // 5. Handlers
  const loadMore = () => {
    if (!hasMore) return;
    const last = rows[rows.length - 1];
    if (!last) {
      console.error("No last row found");
      return;
    }
    setPageParams((p) => ({
      ...p,
      lastId: last.id,
      lastValue: last[p.sortCol ?? "id"],
    }));
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
    updateRow.mutate(
      { tableId, rowId, data: { [col]: v } },
      {
        onSuccess: () => {
          setEditing(null);
          void refetchColumns();
          return search ? void searchRows.refetch() : void getRows.refetch();
        }
      }
    );
  };

  const onDelete = (rowId: string) => {
    deleteRow.mutate(
      { tableId, rowId },
      {
        onSuccess: () => {
          void refetchColumns();
          return search ? void searchRows.refetch() : void getRows.refetch();
        }
      }
    );
  };

  const onAddColumn = (name: string, type: TableColumn["data_type"]) => {
    addColumn.mutate(
      { tableId, name, dataType: type, position: columnsMeta.length },
      {
        onSuccess: () => {
          void refetchColumns();
          void getRows.refetch();
        }
      }
    );
  };

  const onInsertRow = () => {
    const data: Record<string, TableRowValue> = {};
    for (const c of columnsMeta) {
      data[c.name] =
        c.data_type === "numeric"
          ? 0
          : c.data_type === "boolean"
            ? false
            : c.data_type === "date"
              ? new Date().toISOString().split("T")[0]
              : "";
    }
    const rowId = nanoid();
    insertRow.mutate(
      { tableId, rowId, data },
      {
        onSuccess: () => {
          void refetchColumns();
          void getRows.refetch();
        }
      }
    );
  };

  return {
    columnsMeta,
    rows,
    pageParams,
    search,
    isLoading,
    hasMore,
    getRows,
    setPageParams,
    setSearch,
    editing,
    setEditing,
    loadMore,
    onSave,
    onDelete,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    onInsertRow,
    onRefetch,
    insertRowMutate: insertRow.mutate,
  };
}
