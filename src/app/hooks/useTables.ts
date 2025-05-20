"use client";

import { useState, useCallback } from "react";
import { faker } from "@faker-js/faker";
import { api } from "~/trpc/react";
import { useCreateTable, useAddColumn, useAddRows, useUpdateTable, useDeleteTable } from "../api/api";
import type { TableColumnDataType, TableRowValue } from "~/schemas";
import { nanoid } from "nanoid";

export function useTables() {
  // 1. Query existing tables
  const { data: tables, refetch } = api.table.getTables.useQuery();

  // 2. Top‐level hooks for mutations
  const createTable = useCreateTable();
  const addColumn = useAddColumn();
  const addRows = useAddRows();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  // 3. Local UI state
  const [selected, setSelected] = useState<number | null>(null);

  // 4. Callback that uses the above hooks’ mutateAsync methods
  const createNew = useCallback(async () => {
    const name = prompt("Table name?");
    if (!name) return;

    // 4.a Create the table
    const result = await createTable.mutateAsync({ name });
    const table_id = result.table_id;
    if (!table_id) return;

    // 4.b Define default columns
    const defs = [
      { name: "firstName", dataType: "text" as TableColumnDataType },
      { name: "age", dataType: "numeric" as TableColumnDataType },
      { name: "email", dataType: "text" as TableColumnDataType },
    ] as const;

    // 4.c Add each column in sequence
    for (let i = 0; i < defs.length; i++) {
      await addColumn.mutateAsync({
        tableId: table_id,
        name: defs[i]!.name,
        dataType: defs[i]!.dataType,
        position: i,
      });
    }

    // 4.d Insert some fake rows
    const rows = Array.from({ length: 10 }).map<Record<string, TableRowValue>>(() => ({
      firstName: faker.name.firstName(),
      age: faker.number.int({ min: 18, max: 80 }),
      email: faker.internet.email(),
    }));
    for (const row of rows) {
      await addRows.mutateAsync({
        tableId: table_id,
        rows: [{
          rowId: nanoid(),
          data: row,
        }],
      });
    }

    // 4.e Refresh and select
    await refetch();
    setSelected(table_id);
  }, [createTable, addColumn, addRows, refetch]);

  const addHundredThousand = useCallback(async () => {
    if (selected == null) return;

    const TOTAL = 100_000;
    const CHUNK = 1_000;

    for (let offset = 0; offset < TOTAL; offset += CHUNK) {
      const batch = Array.from(
        { length: Math.min(CHUNK, TOTAL - offset) }
      ).map<{
        rowId: string;
        data: Record<string, TableRowValue>;
      }>(() => ({
        rowId: nanoid(),
        data: {
          firstName: faker.name.firstName(),
          age: faker.number.int({ min: 18, max: 80 }),
          email: faker.internet.email(),
        } as Record<string, TableRowValue>,
      }));

      // send one chunk at a time
      await addRows.mutateAsync({ tableId: selected, rows: batch });
    }
    await refetch();
  }, [addRows, selected, refetch]);

  const rename = useCallback(async (tableId: number) => {
    const name = prompt("New table name?");
    if (!name) return;
    await updateTable.mutateAsync({ tableId, name });
    await refetch();
  }, [updateTable, refetch]);

  const deleteCurrTable = useCallback(async (tableId: number) => {
    if (!confirm("Delete this table?")) return;
    await deleteTable.mutateAsync({ tableId });
    await refetch();
    setSelected(null);
  }, [deleteTable, refetch]);

  return {
    tables, selected, setSelected, createNew, addHundredThousand,
    rename, deleteCurrTable,
  };
}
