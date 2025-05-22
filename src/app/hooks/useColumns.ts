"use client";

import { api } from "~/trpc/react";

export function useColumns(tableId: number) {
  const query = api.table.getColumns.useQuery({ tableId });
  const add = api.table.addColumn.useMutation();
  const update = api.table.updColumn.useMutation();
  const remove = api.table.delColumn.useMutation();

  return {
    columns: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    addColumn: add.mutateAsync,
    updateColumn: update.mutateAsync,
    deleteColumn: remove.mutateAsync,
  };
}
