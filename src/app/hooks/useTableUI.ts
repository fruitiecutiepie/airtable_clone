"use client";

import { useState, useCallback } from "react";
import { useTables } from "./useTables";
import { api } from "~/trpc/react";
import { fakeRows } from "~/data/fakeRows";
import type { TableColumnDataType, Table } from "~/lib/schemas";

export function useTableUI(
  baseId: number
) {
  const {
    tables,
    refetch,
    addTable,
    updateTable,
    deleteTable,
  } = useTables(baseId);

  const addColumn = api.table.addColumn.useMutation();
  const addRows = api.table.addRows.useMutation();

  const [selectedTable, setSelectedTable] = useState<Table | undefined>(undefined);

  const addNewTable = useCallback(async () => {
    const name = prompt("Table name?");
    if (!name) return;
    const now = new Date().toISOString();

    const table = await addTable({ baseId, name, createdAt: now, updatedAt: now });

    const defs = [
      { name: "firstName", dataType: "text" as TableColumnDataType },
      { name: "age", dataType: "numeric" as TableColumnDataType },
      { name: "email", dataType: "text" as TableColumnDataType },
    ] as const;

    for (let i = 0; i < defs.length; i++) {
      await addColumn.mutateAsync({
        tableId: table.id,
        name: defs[i]!.name,
        dataType: defs[i]!.dataType,
        position: i,
      });
    }

    const rows = fakeRows.slice(0, 100).map(row => ({
      firstName: row.firstName,
      age: row.age,
      email: row.email
    }));

    await addRows.mutateAsync({
      tableId: table.id,
      createdAt: now,
      rows
    });

    await refetch();
    setSelectedTable(table);
  }, [baseId, addTable, addColumn, addRows, refetch]);

  const addRowsHundredThousand = useCallback(async (tableId: number) => {
    const TOTAL = fakeRows.length;
    const CHUNK = 1_000;

    for (let offset = 0; offset < TOTAL; offset += CHUNK) {
      const rows = fakeRows
        .slice(offset, offset + CHUNK)

      await addRows.mutateAsync({
        tableId: tableId,
        createdAt: new Date().toISOString(),
        rows
      });
    }

    await refetch();
  }, [addRows, refetch]);

  const renameTable = useCallback(async (tableId: number) => {
    const name = prompt("New table name?");
    if (!name) return;
    await updateTable({ baseId, tableId, name });
    await refetch();
  }, [baseId, updateTable, refetch]);

  const deleteCurrentTable = useCallback(async (tableId: number) => {
    if (!confirm("Delete this table?")) return;
    await deleteTable({ tableId });
    await refetch();
    setSelectedTable(undefined);
  }, [deleteTable, refetch]);

  return {
    tables,
    selectedTable,
    setSelectedTable,
    addNewTable,
    addRowsHundredThousand,
    renameTable,
    deleteCurrentTable,
  };
}
