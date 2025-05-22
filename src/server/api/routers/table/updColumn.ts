import { z } from "zod";
import { pool } from "~/app/db/db";
import { TableColumnDataTypeSchema } from "~/schemas";
import { publicProcedure } from "../../trpc";
import { updTableSearchTrigger } from "./updTableSearchTrigger";

export const updColumn = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      columnId: z.number(),
      name: z.string(),
      dataType: TableColumnDataTypeSchema,
    })
  )
  .mutation(async ({ input }) => {
    const { tableId, columnId, name, dataType } = input;
    const client = await pool.connect();
    const tableName = `data_${tableId}`;
    try {
      await client.query('BEGIN');
      // lookup old column name
      const old = await client.query<{ name: string }>(
        `SELECT name FROM app_columns WHERE column_id = $1`,
        [columnId]
      );
      if (old.rowCount === 0) throw new Error("Column not found");
      const oldItem = old.rows[0];
      if (!oldItem) throw new Error("Column not found");
      const oldName = oldItem.name;
      // rename the physical column
      await client.query(
        `ALTER TABLE ${tableName}
             RENAME COLUMN "${oldName}" TO "${name}"
          `
      );
      // change its type if needed
      await client.query(
        `ALTER TABLE ${tableName}
             ALTER COLUMN "${name}" TYPE ${dataType}
             USING "${name}"::${dataType}
          `
      );
      // update our metadata table
      await client.query(
        `UPDATE app_columns
              SET name = $1, data_type = $2
            WHERE column_id = $3
          `,
        [name, dataType, columnId]
      );
      // rebuild search trigger
      await updTableSearchTrigger(client, tableId, tableName);
      await client.query('COMMIT');
      return { columnId, name, dataType };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });