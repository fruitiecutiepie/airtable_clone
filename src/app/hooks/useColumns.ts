"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "~/lib/fetcher";
import type { PageParams, TableColumn, TableColumnDataType } from "~/lib/schemas";
import { api } from "~/trpc/react";

export function useColumns(
  baseId: number,
  tableId: number,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
) {
  const { data: columns = [], error: columnsError, isLoading: columnsIsLoading } = useSWR<TableColumn[], string>(
    `/api/${baseId}/${tableId}/columns`,
    fetcher
  );
  const { mutate } = useSWRConfig();

  const addColumn = api.table.addColumn.useMutation({
    onSuccess: async () => void mutate(`/api/${baseId}/${tableId}/columns`),
    onError(error, variables, context) {
      console.error(`Error adding column: ${error.message}`, variables, context);
    },
  });
  const updColumn = api.table.updColumn.useMutation({
    onSuccess: async () => void mutate(`/api/${baseId}/${tableId}/columns`),
    onError(error, variables, context) {
      console.error(`Error updating column: ${error.message}`, variables, context);
    },
  });
  const delColumn = api.table.delColumn.useMutation({
    onSuccess: async () => void mutate(`/api/${baseId}/${tableId}/columns`),
    onError(error, variables, context) {
      console.error(`Error deleting column: ${error.message}`, variables, context);
    },
  });

  const onAddCol = useCallback(async (name: string, dataType: TableColumnDataType) => {
    const position = columns?.length ?? 0;
    await addColumn.mutateAsync({ tableId, name, dataType, position });
    setPageParams(p => ({ ...p, cursor: undefined }));
  }, [addColumn, columns.length, setPageParams, tableId]);

  const onUpdCol = useCallback(async (
    columnId: number,
    newName: string,
  ) => {
    const columnToUpdate = columns?.find(c => c.columnId === columnId);
    if (!columnToUpdate) {
      console.error("Column not found for update");
      return;
    }
    await updColumn.mutateAsync({
      tableId,
      columnId,
      name: newName,
      dataType: columnToUpdate.dataType, // Use existing dataType
      position: columnToUpdate.position, // Use existing position
    });
    // reset pagination cursor
    setPageParams(p => ({ ...p, cursor: undefined }));
  }, [columns, setPageParams, tableId, updColumn]);

  const onDelCol = useCallback(async (columnId: number) => {
    await delColumn.mutateAsync({ tableId, columnId });
    setPageParams(p => ({ ...p, cursor: undefined }));
  }, [delColumn, setPageParams, tableId]);

  return {
    columns: columns ?? [],
    columnsError,
    columnsIsLoading,

    onAddCol,
    onUpdCol,
    onDelCol,
  };
}
