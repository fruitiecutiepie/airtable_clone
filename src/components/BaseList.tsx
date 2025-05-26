import React, { useState } from 'react'
import { useBases } from '~/app/hooks/useBases'
import TablePage from '~/app/table/TablePage'
import type { Base } from '~/schemas'

interface BaseListProps {
  userId: string
}

export default function BaseList(
  { userId }: BaseListProps
) {
  const {
    bases,
    isLoading,
    addBaseStatus,
    updBaseStatus,
    delBaseStatus,
    addBase,
    updateBase,
    deleteBase,
    refetchBases
  } = useBases(
    userId
  )
  const [selectedBase, setSelectedBase] = useState<Base | undefined>(undefined)

  if (isLoading) return <div>Loading bases…</div>

  return (
    <div className="flex h-full">
      <aside className="w-48 p-2 border-r">
        <button
          onClick={() => addBase(prompt('Name?') ?? '')}
          disabled={addBaseStatus === 'pending'}
          className="w-full mb-2"
        >
          + New Base
        </button>
        <ul>
          {bases?.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => setSelectedBase(b)}
                className="w-full text-left hover:bg-gray-100 rounded px-2 py-1"
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-4">
        {selectedBase ? (
          <TablePage userId={userId} baseId={selectedBase.id} />
        ) : (
          <div>Select or create a base</div>
        )}
      </main>
    </div>
  )
}
