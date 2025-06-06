"use client";

import { api } from "~/trpc/react";
import type { Cursor, PageParams, TableRow, TableRowValue } from "~/lib/schemas";
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import { fetcher } from "~/lib/fetcher";
import type { EventSourceMessage } from "./useRowsStream";

export function useRows(
  baseId: number,
  tableId: number,
  params: PageParams & { search?: string },
  setPageParams: Dispatch<SetStateAction<PageParams>>,
) {
  const utils = api.useUtils();

  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const debouncedSearch = useDebounce(params.search ?? "", 300);

  const {
    data: infRows,
    error: infRowsError,
    refetch: infRowsRefetch,
    hasNextPage: infRowsHasNextPage,
    isLoading: infRowsIsLoading,
    isFetching: infRowsIsFetching,
    fetchNextPage: infRowsFetchNextPage,
  } = api.table.getRows.useInfiniteQuery(
    {
      tableId,
      query: debouncedSearch,
      limit: params.pageSize,
      sortCol: params.sortCol,
      sortDir: params.sortDir,
      filters: params.filters,
    },
    {
      refetchOnWindowFocus: false,
      getNextPageParam: last => last.nextCursor,
      placeholderData: keepPreviousData,
      initialCursor: params.cursor,
    }
  );

  if (infRowsError) {
    console.error(`Error fetching rows: ${infRowsError.message}`);
  }

  const flatRows = useMemo<TableRow[]>(() => {
    if (
      !infRows
      || infRows.pages.length === 0
    ) {
      return [];
    }
    console.log("flatRows.length", infRows.pages.flatMap(p => p.rows).length);
    return infRows.pages.flatMap(page => page.rows);
  }, [infRows]);

  const nextCursor = useMemo<Cursor | undefined>(() => {
    if (
      !infRows
      || infRows.pages.length === 0
    ) {
      return undefined;
    }
    const lastPage = infRows.pages[infRows.pages.length - 1];
    if (!lastPage?.nextCursor) {
      return undefined;
    }
    return lastPage.nextCursor;
  }, [infRows]);

  const totalRows = useMemo<number>(() => {
    if (
      !infRows
      || infRows.pages.length === 0
      || !infRows.pages[0]?.totalRows
    ) {
      return 0;
    }
    return infRows.pages[0].totalRows;
  }, [infRows]);

  const insRows = api.table.addRows.useMutation({
    async onSuccess() {
      await utils.table.getRows.invalidate({
        tableId,
        sortCol: params.sortCol,
        sortDir: params.sortDir,
        filters: params.filters,
        query: debouncedSearch
      });
    },
    onError: (error, variables, context) => {
      console.error(`Error inserting rows: ${error.message}`, variables, context);
    },
  });
  const updRow = api.table.updRow.useMutation({
    async onSuccess() {
      await utils.table.getRows.invalidate({
        tableId,
        sortCol: params.sortCol,
        sortDir: params.sortDir,
        filters: params.filters,
        query: debouncedSearch
      });
    },
    onError: (error, variables, context) => {
      console.error(`Error updating row: ${error.message}`, variables, context);
    },
  });
  const delRow = api.table.delRow.useMutation({
    async onSuccess() {
      await utils.table.getRows.invalidate({
        tableId,
        sortCol: params.sortCol,
        sortDir: params.sortDir,
        filters: params.filters,
        query: debouncedSearch
      });
    },
    onError: (error, variables, context) => {
      console.error(`Error deleting row: ${error.message}`, variables, context);
    },
  });

  const onUpdRow = useCallback(async (
    rowId: string,
    data: Record<string, TableRowValue>
  ) => {
    await updRow.mutateAsync({
      tableId,
      rowId,
      data,
    });
  }, [updRow, tableId]);

  const onDelRow = useCallback(async (
    rowId: string
  ) => {
    await delRow.mutateAsync({ tableId, rowId });
  }, [delRow, tableId]);

  const onAddRow = useCallback(async (
    data: Record<string, TableRowValue>
  ) => {
    await insRows.mutateAsync({
      tableId,
      rows: [data],
      createdAt: new Date().toISOString()
    });
    setPageParams((p) => ({ ...p, cursor: undefined }));
  }, [insRows, setPageParams, tableId]);

  const onAdd100kRowsClick = useCallback(async () => {
    setLoading(true);
    const { jobId } = await fetcher<{ jobId: string }>(`/api/${baseId}/${tableId}/rows/100k`, { method: "POST" });
    const es = new EventSource(`/api/events/${jobId}`);
    es.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as EventSourceMessage;
      if (msg.type === "progress") {
        console.log(`Progress: ${msg.rows} rows added`);
        if (msg.rows) {
          setLoadingCount(msg.rows);
        }
      } else if (msg.type === "done") {
        console.log("Rows added successfully");
        setLoading(false);
        setLoadingCount(0);
        es.close();
        void infRowsRefetch();
      } else if (msg.type === "error") {
        console.error(msg.message);
        setLoading(false);
        setLoadingCount(0);
        es.close();
      }
    };
  }, [baseId, infRowsRefetch, tableId]);

  return {
    infRows,
    infRowsHasNextPage,
    infRowsIsLoading,
    infRowsIsFetching,
    infRowsFetchNextPage,
    infRowsRefetch,

    flatRows,
    nextCursor,
    totalRows,

    onAdd100kRowsClick,
    add100kRowsLoading: loading,
    add100kRowsLoadingCount: loadingCount,

    onAddRow,
    onUpdRow,
    onDelRow,
  };
}
