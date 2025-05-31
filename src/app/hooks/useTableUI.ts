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
    addTable,
    updateTable,
    deleteTable,
  } = useTables(baseId);

  const addColumn = api.table.addColumn.useMutation();
  const addRows = api.table.addRows.useMutation();

  const [selectedTable, setSelectedTable] = useState<Table | undefined>(tables[0] ?? undefined);

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
  }, [addRows]);

  const renameTable = useCallback(async (tableId: number) => {
    const name = prompt("New table name?");
    if (!name) return;
    await updateTable({ baseId, tableId, name });
  }, [baseId, updateTable]);

  const deleteCurrentTable = useCallback(async (tableId: number) => {
    if (!confirm("Delete this table?")) return;
    await deleteTable({ tableId });
    setSelectedTable(undefined);
  }, [deleteTable]);

  return {
    tables,
    selectedTable,
    setSelectedTable,
    addRowsHundredThousand,
    renameTable,
    deleteCurrentTable,
  };
}
