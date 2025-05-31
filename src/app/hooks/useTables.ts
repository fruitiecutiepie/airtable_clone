import { api } from "~/trpc/react";
import type { Table } from "~/lib/schemas";
import useSWR from "swr";
import { fetcher } from "~/lib/fetcher";
import { useCallback } from "react";
import { redirect } from "next/navigation";

export function useTables(
  baseId: number
) {
  const { data: tables, error, isLoading } = useSWR<Table[], string>(
    `/api/${String(baseId)}/tables`,
    fetcher
  );

  const addTable = api.table.addTable.useMutation();
  const updTable = api.table.updTable.useMutation();
  const delTable = api.table.delTable.useMutation();

  const addNewTable = useCallback(async () => {
    const name = prompt("Table name?");
    if (!name) return;
    const now = new Date().toISOString();

    const data = {
      name,
      createdAt: now,
      updatedAt: now
    };

    const res = await fetcher<{
      tableId: number,
      filterId: number;
    }>(
      `/api/${String(baseId)}/tables`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    redirect(`/${baseId}/${res.tableId}/${res.filterId}`);
  }, [baseId]);

  return {
    tables: tables ?? [],
    tablesError: error,
    tablesLoading: isLoading,
    addTable: addTable.mutateAsync,
    updateTable: updTable.mutateAsync,
    deleteTable: delTable.mutateAsync,

    addNewTable
  };
}
