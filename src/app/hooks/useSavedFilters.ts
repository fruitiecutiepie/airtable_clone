"use client";

import { api } from "~/trpc/react";

export function useSavedFilters(
  userId: string,
  baseId: number,
  tableId: number
) {
  const { data, isLoading, refetch } = api.filter.getSavedFilters.useQuery({
    userId,
    baseId,
    tableId
  });
  const add = api.filter.setSavedFilter.useMutation({ onSuccess: () => refetch() });
  const del = api.filter.delSavedFilter.useMutation({ onSuccess: () => refetch() });

  return {
    filters: data,
    isLoading,
    refetch,
    setSavedFilter: add.mutateAsync,
    deleteFilter: del.mutateAsync,
  };
}
