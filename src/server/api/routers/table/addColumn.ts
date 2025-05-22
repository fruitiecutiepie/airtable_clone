import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";
import { updTableSearchTrigger } from "./updTableSearchTrigger";

export const addColumn = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      name: z.string(),
      dataType: z.enum(['text', 'numeric', 'boolean', 'date']),
      position: z.number(),
    }))
  .mutation(async ({ input }) => {
    const { tableId, name, dataType, position } = input;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertCol = await client.query<{
        column_id: number;
      }>(
        `
        INSERT INTO app_columns(
          table_id, name, data_type, position
        )
        VALUES($1, $2, $3, $4)
        RETURNING column_id
      `,
        [tableId, name, dataType, position]
      );
      if (insertCol.rowCount === 0 || !insertCol.rows[0]) {
        throw new Error('Failed to create column');
      }
      const columnId = insertCol.rows[0].column_id;
      const tableName = `data_${tableId}`;

      await client.query(`
        ALTER TABLE ${tableName} 
        ADD COLUMN "${name}" ${dataType} NULL
      `);

      await updTableSearchTrigger(client, tableId, tableName)

      await client.query('COMMIT');
      return { column_id: columnId, name, dataType, position };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
