"use client";

import { useState, useCallback } from "react";
import { useTables } from "./useTables";
import { api } from "~/trpc/react";
import { fakeRows } from "~/app/data/fakeRows";
import type { TableColumnDataType, Table } from "~/schemas";

export function useTableUI(
  userId: string,
  baseId: number,
) {
  const {
    tables,
    refetch,
    addTable,
    updateTable,
    deleteTable,
  } = useTables(userId, baseId);

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
      data: {
        firstName: row.firstName,
        age: row.age,
        email: row.email,
      },
    }));

    await addRows.mutateAsync({ tableId: table.id, rows });

    await refetch();
    setSelectedTable(table);
  }, [baseId, addTable, addColumn, addRows, refetch]);

  const addRowsHundredThousand = useCallback(async (tableId: number) => {
    const TOTAL = fakeRows.length;
    const CHUNK = 1_000;

    for (let offset = 0; offset < TOTAL; offset += CHUNK) {
      const batch = fakeRows
        .slice(offset, offset + CHUNK)
        .map(row => ({
          data: row
        }));

      await addRows.mutateAsync({
        tableId: tableId,
        rows: batch
      });
    }

    await refetch();
  }, [addRows, refetch]);

  const renameTable = useCallback(async (tableId: number) => {
    const name = prompt("New table name?");
    if (!name) return;
    await updateTable({ userId, baseId, tableId, name });
    await refetch();
  }, [userId, baseId, updateTable, refetch]);

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
