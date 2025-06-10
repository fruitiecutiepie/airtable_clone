"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "~/lib/fetcher";
import type { SavedFilter } from "~/lib/schemas";
import { api } from "~/trpc/react";

export function useSavedFilters(
  baseId: number,
  tableId: number,
) {
  const { data: filtersData = [], error: filtersError, isLoading: filtersLoading } = useSWR<
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

  const onDelFilter = useCallback(async (filterId: number) => {
    await delFilter.mutateAsync({ filterId });
  }, [delFilter]);

  return {
    filtersData,
    filtersError,
    filtersLoading,

    onSaveFilter: setFilter.mutateAsync,
    onDelFilter,
  };
}
