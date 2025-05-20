// api.ts (client side hooks)
// import trpc client instead of server
import { api as trpc } from "~/trpc/react";
import type { PageParams } from "~/schemas";

// Tables
export function useGetTables() {
  return trpc.table.getTables.useQuery();
}
export function useCreateTable() {
  return trpc.table.addTable.useMutation();
}
export function useUpdateTable() {
  return trpc.table.updateTable.useMutation();
}
export function useDeleteTable() {
  return trpc.table.deleteTable.useMutation();
}

// Columns
export function useGetColumns(tableId: number) {
  return trpc.table.getColumns.useQuery({ tableId });
}
export function useAddColumn() {
  return trpc.table.addColumn.useMutation();
}
export function useUpdateColumn() {
  return trpc.table.updateColumn.useMutation();
}
export function useDeleteColumn() {
  return trpc.table.deleteColumn.useMutation();
}

// Rows
export function useGetRows(tableId: number, params: PageParams) {
  return trpc.table.getRows.useQuery({ tableId, params });
}
export function useSearchRows(tableId: number, query: string, pageSize = 1000) {
  return trpc.table.searchRows.useQuery(
    { tableId, query, pageSize },
    { enabled: query.length > 0 }
  );
}
export function useAddRow() {
  return trpc.table.addRow.useMutation();
}
export function useAddRows() {
  return trpc.table.addRows.useMutation();
}
export function useUpdateRow() {
  return trpc.table.updateRow.useMutation();
}
export function useDeleteRow() {
  return trpc.table.deleteRow.useMutation();
}

// import type { PageParams, TableColumnDataType, TableRowValue } from "~/schemas";
// import { api } from "~/trpc/server";

// // 1. Create table
// export function createTable(name: string) {
//   return api.table.addTable({ name });
// }

// export function fetchColumns(tableId: number) {
//   return api.table.getColumns({ tableId });
// }

// // 2. Add column
// export function addColumn(tableId: number, name: string, dataType: TableColumnDataType, position: number) {
//   return api.table.addColumn({ tableId, name, dataType, position });
// }

// // 3. Insert a new row
// export function insertRow(tableId: number, data: Record<string, TableRowValue>) {
//   return api.table.addRow({ tableId, data });
// }

// // 4. Fetch rows with paging, sort & filter (keyset)
// export function fetchRows(tableId: number, params: PageParams) {
//   return api.table.getRows({ tableId, params });
// }

// // 5. Update a cell (or multiple in one row)
// export function updateRow(tableId: number, rowId: string, data: Record<string, TableRowValue>) {
//   return api.table.updateRow({ tableId, rowId, data });
// }

// // 6. Delete a row
// export function deleteRow(tableId: number, rowId: string) {
//   return api.table.deleteRow({ tableId, rowId });
// }

// // 7. Full-text search
// export function searchRows(tableId: number, query: string, pageSize = 100) {
//   return api.table.searchRows({ tableId, query, pageSize });
// }
