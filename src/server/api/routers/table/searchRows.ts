import { z } from "zod";
import { pool } from "~/app/db/db";
import type { TableColumnDataType, TableRow } from "~/schemas";
import { publicProcedure } from "../../trpc";

export const searchRows = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      query: z.string(),
      pageSize: z.number().optional(),
    }))
  .query(async ({ input }) => {
    const { tableId, query, pageSize = 1000 } = input;
    const client = await pool.connect();
    try {
      const columns = await client.query<{
        name: string,
        data_type: TableColumnDataType;
      }>(
        `
        SELECT name, data_type
        FROM app_columns
        WHERE table_id = $1
        ORDER BY position
        `,
        [tableId]
      );

      const colNames = columns.rows.map((c) => c.name);
      const colNamesQuoted = columns.rows.map((c) => `"${c.name}"`);
      const tableName = `data_${tableId}`;

      // const textCols = columns.rows.filter(c => c.data_type === 'text').map(c => `"${c.name}"`);
      const nonTextCols = columns.rows.filter(c => c.data_type !== 'text').map(c => `"${c.name}"`);

      // const textSearchCols = textCols.join(', ');
      const nonTextSearchExpr = nonTextCols
        .map((col, i) => `${col}::text ILIKE $${2 + i}`)
        .join(' OR ');

      const result = await client.query<TableRow>(
        `
        SELECT id, ${colNamesQuoted.join(',')}
        FROM ${tableName}
        WHERE (
          _search @@ plainto_tsquery('english', $1)
          ${nonTextCols.length ? `OR (${nonTextSearchExpr})` : ''}
        )
        ORDER BY id ASC
        LIMIT $${2 + nonTextCols.length}
        `,
        [
          query,
          ...nonTextCols.map(() => `%${query}%`),
          pageSize
        ]
      );

      return {
        rows: result.rows.map((r) => {
          const row: TableRow = { id: r.id };
          for (const name of colNames) {
            row[name] = r[name];
          }
          return row;
        })
      };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
