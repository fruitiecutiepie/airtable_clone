"use client";

import { api } from "~/trpc/react";
import type { PageParams } from "~/schemas";

export function useRows(
  tableId: number,
  params: PageParams & { search?: string }
) {
  const rowsQuery = api.table.getRows.useQuery({ tableId, ...params });
  const searchQuery = api.table.searchRows.useQuery(
    { tableId, query: params.search ?? "", pageSize: params.pageSize },
    { enabled: !!params.search }
  );
  const add = api.table.addRow.useMutation();
  const addBulk = api.table.addRows.useMutation();
  const update = api.table.updRow.useMutation();
  const remove = api.table.delRow.useMutation();

  return {
    rows: params.search ? searchQuery.data?.rows ?? [] : rowsQuery.data?.rows ?? [],
    nextCursor: rowsQuery.data?.nextCursor,
    isLoading: params.search ? searchQuery.isLoading : rowsQuery.isLoading,
    refetch: async () => {
      await rowsQuery.refetch();
      await searchQuery.refetch();
    },
    addRow: add.mutateAsync,
    addRows: addBulk.mutateAsync,
    updateRow: update.mutateAsync,
    deleteRow: remove.mutateAsync,
  };
}
