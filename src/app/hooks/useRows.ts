"use client";

import { api } from "~/trpc/react";
import type { PageParams } from "~/schemas";
import { useInfiniteRows } from "./useInfiniteRows";

export function useRows(
  tableId: number,
  params: PageParams & { search?: string }
) {
  const inf = useInfiniteRows({
    tableId,
    limit: params.pageSize,
    cursor: params.cursor,
    sortCol: params.sortCol,
    sortDir: params.sortDir,
    filters: params.filters,
    query: params.search,
  });

  // flatten pages for consumer
  const rows = inf.data?.pages.flatMap((p) => p.rows) ?? [];
  const nextCursor = inf.data?.pages[inf.data.pages.length - 1]?.nextCursor;
  const totalRows = inf.data?.pages[0]?.totalRows;

  // mutations can stay exactly the same
  const add = api.table.addRow.useMutation();
  const addBulk = api.table.addRows.useMutation();
  const update = api.table.updRow.useMutation();
  const remove = api.table.delRow.useMutation();

  return {
    rows,
    nextCursor,
    totalRows,
    isLoading: inf.isLoading,
    isFetchingNextPage: inf.isFetchingNextPage,
    hasNextPage: inf.hasNextPage,
    fetchNextPage: inf.fetchNextPage,
    refetch: inf.refetch,
    addRow: add.mutateAsync,
    addRows: addBulk.mutateAsync,
    updateRow: update.mutateAsync,
    deleteRow: remove.mutateAsync,
  };
}
