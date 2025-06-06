import { redirect } from 'next/navigation'
import { useCallback } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { fetcher } from '~/lib/fetcher'
import type { Base, SavedFilter, Table } from '~/lib/schemas'
import { api } from '~/trpc/react'

export function useBases(
  userId: string
) {
  const { data: bases = [], error: basesError, isLoading: basesIsLoading } = useSWR<Base[], string>(
    `/api/bases?userId=${userId}`,
    fetcher
  );
  const { mutate } = useSWRConfig();
  const addBase = api.base.addBase.useMutation({
    onSuccess: async () => void mutate(`/api/bases?userId=${userId}`),
    onError(error, variables, context) {
      console.error(`Error adding base: ${error.message}`, variables, context);
    }
  });
  const updBase = api.base.updBase.useMutation({
    onSuccess: async () => void mutate(`/api/bases?userId=${userId}`),
    onError(error, variables, context) {
      console.error(`Error updating base: ${error.message}`, variables, context);
    }
  });
  const delBase = api.base.delBase.useMutation({
    onSuccess: async () => void mutate(`/api/bases?userId=${userId}`),
    onError(error, variables, context) {
      console.error(`Error deleting base: ${error.message}`, variables, context);
    }
  })

  const onAddBase = useCallback(async (name: string) => {
    await addBase.mutateAsync({
      userId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }, [addBase, userId])

  const onUpdBase = useCallback(async (baseId: number, name: string) => {
    await updBase.mutateAsync({
      userId,
      base: {
        id: baseId,
        userId,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
  }, [updBase, userId])

  const onDelBase = useCallback(async (baseId: number) => {
    await delBase.mutateAsync({ userId, baseId })
  }, [delBase, userId])

  const addBaseOnClick = useCallback(async () => {
    const name = prompt('Base name?');
    if (!name) return;
    await addBase.mutateAsync({
      userId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }, [addBase, userId])

  const baseOnClick = useCallback(async (baseId: number) => {
    const baseExists = bases?.find(b => b.id === baseId);
    if (!baseExists) {
      alert("Error: The selected base no longer exists or could not be found. Please refresh.");
      return;
    }

    const tables = await fetcher<Table[]>(`/api/${String(baseId)}/tables`);
    const firstTable = tables[0];
    if (!firstTable) {
      const { tableId, filterId } = await fetcher<{
        tableId: number;
        filterId: string;
      }>(`/api/${baseId}/tables`, {
        method: "POST",
        body: JSON.stringify({
          name: "Table 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      redirect(`/${baseId}/${tableId}/${filterId}`);
    }

    const views = await fetcher<SavedFilter[]>(`/api/${baseId}/${firstTable.id}/views`);
    const firstView = views[0];
    if (!firstView) {
      const { filterId } = await fetcher<{
        tableId: number;
        filterId: string;
      }>(`/api/${baseId}/${firstTable.id}/views`, {
        method: "POST",
        body: JSON.stringify({
          name: "Default View",
          filters: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      redirect(`/${baseId}/${firstTable.id}/${filterId}`);
    }

    redirect(`/${baseId}/${firstTable.id}/${firstView.filterId}`);
  }, [bases]);

  return {
    bases,
    basesError,
    basesIsLoading,

    onAddBase,
    addBaseStatus: addBase.status,

    onUpdBase,
    onDelBase,

    baseOnClick,
    addBaseOnClick
  }
}
