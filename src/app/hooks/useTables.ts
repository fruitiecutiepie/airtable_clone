"use client";

import { api } from "~/trpc/react";
import type { Table } from "~/schemas";

export function useTables() {
  const query = api.table.getTables.useQuery();
  const add = api.table.addTable.useMutation();
  const update = api.table.updTable.useMutation();
  const remove = api.table.delTable.useMutation();

  return {
    tables: query.data as Table[] | undefined,
    isLoading: query.isLoading,
    refetch: query.refetch,
    addTable: add.mutateAsync,
    updateTable: update.mutateAsync,
    deleteTable: remove.mutateAsync,
  };
}
