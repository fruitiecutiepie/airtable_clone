"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "~/lib/fetcher";
import type { Filter, PageParams, SavedFilter } from "~/lib/schemas";
import { api } from "~/trpc/react";

export function useSavedFilters(
  baseId: number,
  tableId: number,
  setPageParams: Dispatch<SetStateAction<PageParams>>
) {
  const { data: filters = [], error: filtersError, isLoading: filtersLoading } = useSWR<
    SavedFilter[],
    string
  >(
    `/api/${baseId}/${tableId}/views`,
    fetcher
  );
  const { mutate } = useSWRConfig();

  const setFilter = api.filter.setSavedFilter.useMutation({
    onSuccess: async () => void mutate(`/api/${baseId}/${tableId}/views`),
    onError: (error, variables, context) => {
      console.error(`Error setting filter: ${error.message}`, variables, context);
    },
  });
  const delFilter = api.filter.delSavedFilter.useMutation({
    onSuccess: async () => void mutate(`/api/${baseId}/${tableId}/views`),
    onError: (error, variables, context) => {
      console.error(`Error deleting filter: ${error.message}`, variables, context);
    },
  });

  const onApplyFilter = useCallback((filter: SavedFilter) => {
    setPageParams((p) => ({
      ...p,
      filters: filter.filters,
      cursor: undefined,
    }));
  }, [setPageParams]);

  const onSetFilter = useCallback(async (
    filterId: number | undefined,
    name: string,
    filters: Record<string, Filter[]>
  ) => {
    const newFilter = await setFilter.mutateAsync({
      baseId,
      tableId,
      filterId,
      name,
      filters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await mutate(`/api/${baseId}/${tableId}/views`);
    return newFilter;
  },
    [baseId, mutate, setFilter, tableId]
  );

  const onDelFilter = useCallback(async (filterId: number) => {
    if (!confirm("Delete this filter?")) return;
    await delFilter.mutateAsync({ filterId });
  }, [delFilter]);

  return {
    filters,
    filtersError,
    filtersLoading,

    onApplyFilter,
    onSetFilter,
    onDelFilter,
  };
}
