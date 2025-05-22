import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";
import { updTableSearchTrigger } from "./updTableSearchTrigger";

export const delColumn = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      columnId: z.number(),
    }))
  .mutation(async ({ input }) => {
    const { tableId, columnId } = input;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const deleteCol = await client.query<{
        name: string;
      }>(
        `
        DELETE FROM app_columns
        WHERE column_id = $1
          AND table_id = $2
        RETURNING name
        `,
        [columnId, tableId]
      );
      if (deleteCol.rowCount === 0 || !deleteCol.rows[0]) {
        throw new Error('Failed to delete column');
      }
      const colName = deleteCol.rows[0].name;
      const tableName = `data_${tableId}`;

      await client.query(`
        ALTER TABLE ${tableName} 
        DROP COLUMN "${colName}"
      `);

      await updTableSearchTrigger(client, tableId, tableName)

      await client.query('COMMIT');
      return { column_id: columnId, name: colName };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  }) 