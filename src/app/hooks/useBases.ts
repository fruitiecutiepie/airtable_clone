import { useCallback } from 'react'
import type { Base } from '~/lib/schemas'
import { api } from '~/trpc/react'

export function useBases(
  userId: string
) {
  const {
    data: bases,
    isLoading,
    refetch: refetchBases,
  } = api.base.getBases.useQuery({ userId })

  const {
    mutate: addMutate,
    status: addBaseStatus,
  } = api.base.addBase.useMutation({ onSuccess: () => refetchBases() })

  const {
    mutate: updateMutate,
    status: updBaseStatus,
  } = api.base.updBase.useMutation({ onSuccess: () => refetchBases() })

  const {
    mutate: deleteMutate,
    status: delBaseStatus,
  } = api.base.delBase.useMutation({ onSuccess: () => refetchBases() })

  const addBase = useCallback((name: string) => {
    addMutate({
      userId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }, [userId, addMutate])

  const updateBase = useCallback((base: Base) => {
    updateMutate({ userId, base })
  }, [userId, updateMutate])

  const deleteBase = useCallback((baseId: number) => {
    deleteMutate({ userId, baseId })
  }, [userId, deleteMutate])

  return {
    bases,
    isLoading,
    addBaseStatus,
    updBaseStatus,
    delBaseStatus,
    addBase,
    updateBase,
    deleteBase,
    refetchBases,
  }
}
