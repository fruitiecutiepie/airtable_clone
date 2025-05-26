"use client";

import React from "react";
import { useTableUI } from "~/app/hooks/useTableUI";
import TableView from "~/app/table/[tableId]/TableView";
import { Button } from "~/app/components/ui/button";

interface TablePageProps {
  userId: string
  baseId: number
}

export default function TablePage({
  userId,
  baseId
}: TablePageProps) {
  const {
    tables,
    selectedTable,
    setSelectedTable,
    addNewTable,
    addRowsHundredThousand,
    renameTable,
    deleteCurrentTable
  } = useTableUI(baseId)

  return (
    <div className="flex h-full">
      <aside className="w-48 p-2 border-r">
        <Button onClick={addNewTable}
          className="w-full mb-4 bg-blue-500 text-white hover:bg-blue-600"
        >
          + New Table
        </Button>
        <ul>
          {tables?.map(t => {
            const selected = t.id === selectedTable?.id;
            return (
              <li key={t.id}>
                <Button
                  onClick={() => setSelectedTable(t)}
                  className={`w-full text-left hover:bg-blue-100
                    ${selected ? "bg-blue-100" : ""}
                  `}
                >
                  {t.name}
                </Button>
              </li>
            )
          })}
        </ul>
      </aside>
      <main className="flex-1 p-4 h-full">
        {selectedTable ?
          <>
            <div className="flex gap-2 mb-4 border-b items-center">
              <div
                className="flex gap-2 items-center justify-between w-full"
              >
                <div>
                  <Button
                    onClick={() => addRowsHundredThousand(selectedTable.id)}
                    className="hover:text-blue-600"
                  >
                    Add 100k Rows
                  </Button>
                  <Button
                    onClick={() => renameTable(selectedTable.id)}
                    className="hover:text-blue-600"
                  >
                    Rename
                  </Button>
                  <Button
                    onClick={() => deleteCurrentTable(selectedTable.id)}
                    className="hover:text-red-600"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
            <TableView userId={userId} baseId={baseId} tableId={selectedTable.id} />
          </>
          : <div>Select or create a table</div>
        }
      </main>
    </div>
  );
}
