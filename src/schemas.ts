import { z } from "zod";

// TableRow

export const TableRowValueSchema = z.union([
  z.string(), z.number(), z.boolean(), z.undefined()
]);
export type TableRowValue = z.infer<typeof TableRowValueSchema>;

export const TableRowSchema = z.object({
  id: z.string(),
}).catchall(
  TableRowValueSchema
);
export type TableRow = z.infer<typeof TableRowSchema>;

// TableColumn

export const TableColumnDataTypeSchema = z.enum([
  'text', 'numeric', 'boolean', 'date'
]);
export type TableColumnDataType = z.infer<typeof TableColumnDataTypeSchema>;

export const TableColumnSchema = z.object({
  column_id: z.number(),
  name: z.string(),
  data_type: TableColumnDataTypeSchema,
  position: z.number(),
});
export type TableColumn = z.infer<typeof TableColumnSchema>;

// Table

export const TableSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(TableColumnSchema),
  rows: z.array(TableRowSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Table = z.infer<typeof TableSchema>;

// Filter

export const FilterOperationSchema = z.enum([
  'eq', 'neq', 'lt', 'gt', 'in', 'nin', 'isnull', 'isnotnull'
]);
export type FilterOperation = z.infer<typeof FilterOperationSchema>;

export const FilterSchema = z.object({
  op: FilterOperationSchema,
  value: TableRowValueSchema,
});
export type Filter = z.infer<typeof FilterSchema>;

// PageParams

export type Cursor = { lastId: string; lastValue: string | number | boolean }

export const PageParamsSchema = z.object({
  pageSize: z.number(),
  cursor: z
    .object({
      lastId: z.string().optional(),
      lastValue: TableRowValueSchema
    })
    .optional(),
  sortCol: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  filters: z.record(FilterSchema).optional(),
});
export type PageParams = z.infer<typeof PageParamsSchema>;
