import { z } from "zod";
import { pool } from "~/app/db/db";
import { TableRowValueSchema, type TableRow } from "~/schemas";
import { publicProcedure } from "../../trpc";

export const updRow = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      rowId: z.string(),
      data: z.record(TableRowValueSchema),
    }))
  .mutation(async ({ input }) => {
    const { tableId, rowId, data } = input;
    const client = await pool.connect();
    try {
      const tableName = `data_${tableId}`;
      const cols = Object.keys(data);
      const colNamesQuoted = cols.map((c) => `"${c}"`);
      const values = cols.map((c) => data[c]);

      const setClauses = [
        ...colNamesQuoted.map((col, i) => `${col} = $${i + 1}`),
        'updated_at = now()'
      ].join(', ');

      const result = await client.query<TableRow>(
        `
        UPDATE ${tableName}
        SET ${setClauses}
        WHERE id = $${cols.length + 1}
        RETURNING *
        `,
        [...values, rowId]
      );
      return result.rows[0];
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
