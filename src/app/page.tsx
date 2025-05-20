// App.tsx
"use client"
import React from "react"
import TableView from "./pages/TableView"
import { useTables } from "./hooks/useTables"

export default function App() {
  const {
    tables,
    selected,
    setSelected,
    createNew,
    addHundredThousand,
    rename,
    deleteCurrTable
  } = useTables()

  return (
    <div style={{ display: "flex" }}>
      <aside style={{ width: 200, borderRight: "1px solid #ddd", padding: 8 }}>
        <button onClick={createNew}>+ New Table</button>
        <ul>
          {tables?.map(t => (
            <li key={t.id}>
              <button
                onClick={() => setSelected(t.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: t.id === selected ? "#eee" : "transparent",
                }}
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ flex: 1, padding: 16 }}>
        {selected != null
          ? (
            <>
              <button onClick={addHundredThousand} style={{ marginTop: 8 }}>
                Add 100,000 Rows
              </button>
              <button onClick={() => rename(selected)} style={{ marginTop: 8 }}>
                Rename Table
              </button>
              <button onClick={() => deleteCurrTable(selected)} style={{ marginTop: 8 }}>
                Delete Table
              </button>
              <TableView tableId={selected} />
            </>
          )
          : <div>Select or create a table</div>}
      </main>
    </div>
  )
}
