"use client";

import React from "react";
import { useTableUI } from "~/app/hooks/useTableUI";
import TableView from "~/app/table/[tableId]/page";
import { Button } from "~/app/components/ui/button";

export default function App() {
  const {
    tables,
    selectedTable,
    setSelectedTable,
    addNewTable,
    addRowsHundredThousand,
    renameTable,
    deleteCurrentTable
  } = useTableUI();

  return (
    <div className="flex">
      <aside className="w-48 p-2 border-r">
        <Button onClick={addNewTable}>+ New Table</Button>
        <ul>
          {tables?.map(t => (
            <li key={t.id}>
              <Button onClick={() => setSelectedTable(t)} className={t.id === selectedTable?.id ? "bg-gray-200" : ""}>{t.name}</Button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 p-4">
        {selectedTable ?
          <>
            <div className="flex gap-2 mb-4">
              <Button onClick={() => addRowsHundredThousand(selectedTable.id)}>Add 100k Rows</Button>
              <Button onClick={() => renameTable(selectedTable.id)}>Rename</Button>
              <Button onClick={() => deleteCurrentTable(selectedTable.id)}>Delete</Button>
            </div>
            <p>
              {`Total rows: ${selectedTable.rowCount}`}
            </p>
            <TableView tableId={selectedTable.id} />
          </>
          : <div>Select or create a table</div>
        }
      </main>
    </div>
  );
}
