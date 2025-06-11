import { api } from "~/trpc/react";
import type { Table } from "~/lib/schemas";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "~/lib/fetcher";
import { useCallback } from "react";
import { redirect } from "next/navigation";

export function useTables(
  baseId: number
) {
  const appUrl = process.env.VERCEL_URL ? "" : "http://localhost:3000";

  const { data: tables = [], error, isLoading } = useSWR<Table[], string>(
    `/api/${String(baseId)}/tables`,
    fetcher
  );
  const { mutate } = useSWRConfig();

  const updTable = api.table.updTable.useMutation({
    onSuccess: async () => void mutate(`${appUrl}/api/${String(baseId)}/tables`),
    onError(error, variables, context) {
      console.error(`Error updating table: ${error.message}`, variables, context);
    },
  });
  const delTable = api.table.delTable.useMutation({
    onSuccess: async () => void mutate(`${appUrl}/api/${String(baseId)}/tables`),
    onError(error, variables, context) {
      console.error(`Error deleting table: ${error.message}`, variables, context);
    },
  });

  const onAddTable = useCallback(async () => {
    const name = `Table ${tables.length + 1}`;
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
      `${appUrl}/api/${String(baseId)}/tables`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    redirect(`/${baseId}/${res.tableId}/${res.filterId}`);
  }, [appUrl, baseId, tables.length]);

  const onUpdTable = useCallback(async (
    tableId: number,
    name: string
  ) => {
    if (!name) return;
    await updTable.mutateAsync({
      baseId,
      tableId,
      name,
    });
  }, [baseId, updTable]);

  const onDelTable = useCallback(async (tableId: number) => {
    await delTable.mutateAsync({ tableId });
    redirect(`/${baseId}`);
  }, [baseId, delTable]);

  return {
    tables: tables ?? [],
    tablesError: error,
    tablesLoading: isLoading,

    onAddTable,
    onUpdTable,
    onDelTable
  };
}
