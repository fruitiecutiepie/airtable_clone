import { redirect } from 'next/navigation'
import { useCallback } from 'react'
import { fetcher } from '~/lib/fetcher'
import type { Base, SavedFilter, Table } from '~/lib/schemas'
import { api } from '~/trpc/react'

export function useBases(
  userId: string
) {
  const { data: bases, status: basesStatus, refetch: refetchBases } =
    api.base.getBases.useQuery({ userId });
  const addBase = api.base.addBase.useMutation({ onSuccess: () => refetchBases() });
  const updBase = api.base.updBase.useMutation({ onSuccess: () => refetchBases() })
  const delBase = api.base.delBase.useMutation({ onSuccess: () => refetchBases() })

  const updateBase = useCallback(async (base: Base) => {
    await updBase.mutateAsync({ userId, base })
  }, [updBase, userId])

  const deleteBase = useCallback(async (baseId: number) => {
    await delBase.mutateAsync({ userId, baseId })
  }, [delBase, userId])

  const addTable = api.table.addTable.useMutation();
  const setView = api.filter.setSavedFilter.useMutation();

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
    const tables = await fetcher<Table[]>(`/api/${String(baseId)}/tables`);
    let firstTable = tables[0];
    if (!firstTable) {
      const newTable = await addTable.mutateAsync({
        baseId: Number(baseId),
        name: "Table 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      firstTable = newTable;
    }

    const views = await fetcher<SavedFilter[]>(`/api/${String(baseId)}/${firstTable.id}/views`);
    let firstView = views[0];
    if (!firstView) {
      const newFilter = await setView.mutateAsync({
        baseId: Number(baseId),
        tableId: firstTable.id,
        name: "Default View",
        filters: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      firstView = newFilter;
    }

    redirect(`${String(baseId)}/${firstTable.id}/${firstView.filter_id}`);
  }, [addTable, setView]);

  return {
    bases,
    basesStatus,

    addBase,
    updateBase,
    deleteBase,

    baseOnClick,
    addBaseOnClick
  }
}
