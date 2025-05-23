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
  id: z.number(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type Table = z.infer<typeof TableSchema>;

// Base

export const BaseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Base = z.infer<typeof BaseSchema>;

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

export const SavedFilterSchema = z.object({
  filter_id: z.number(),
  name: z.string(),
  filters: z.record(FilterSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SavedFilter = z.infer<typeof SavedFilterSchema>;

// PageParams

export const CursorSchema = z.object({
  lastId: z.string().optional(),
  lastValue: TableRowValueSchema
});
export type Cursor = z.infer<typeof CursorSchema>;

export const PageParamsSchema = z.object({
  pageSize: z.number(),
  cursor: CursorSchema.optional(),
  sortCol: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  filters: z.record(FilterSchema).optional(),
});
export type PageParams = z.infer<typeof PageParamsSchema>;
