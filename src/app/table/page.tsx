// App.tsx
"use client"
import React from "react"
import { useTables } from "~/app/hooks/useTables"
import { useSession } from "next-auth/react"
import TablePage from "~/app/table/[tableId]/page";
import { Button } from "../components/ui/button";

export default function App() {
  const { data: session, status } = useSession();
  console.log("session", session, status);

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
    <div>
      <div style={{ display: "flex" }}>
        <aside style={{ width: 200, borderRight: "1px solid #ddd", padding: 8 }}>
          <Button onClick={createNew}>+ New Table</Button>
          <ul>
            {tables?.map(t => (
              <li key={t.id}>
                <Button
                  onClick={() => setSelected(t.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: t.id === selected ? "#eee" : "transparent",
                  }}
                >
                  {t.name}
                </Button>
              </li>
            ))}
          </ul>
        </aside>
        <main style={{ flex: 1, padding: 16 }}>
          {selected != null
            ? (
              <>
                <Button onClick={addHundredThousand} style={{ marginTop: 8 }}>
                  Add 100,000 Rows
                </Button>
                <Button onClick={() => rename(selected)} style={{ marginTop: 8 }}>
                  Rename Table
                </Button>
                <Button onClick={() => deleteCurrTable(selected)} style={{ marginTop: 8 }}>
                  Delete Table
                </Button>
                <TablePage params={{ tableId: selected }} />
              </>
            )
            : <div>Select or create a table</div>}
        </main>
      </div>
    </div >
  )
}
