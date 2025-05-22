import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";

export const delTable = publicProcedure
  .input(
    z.object({
      tableId: z.number()
    })
  )
  .mutation(async ({ input }) => {
    const { tableId } = input;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const delTable = await client.query<{
        name: string;
      }>(
        `
        DELETE FROM app_tables
        WHERE table_id = $1
        RETURNING name
        `,
        [tableId]
      );
      if (delTable.rowCount === 0 || !delTable.rows[0]) {
        throw new Error('Failed to delete table');
      }
      const tableName = delTable.rows[0].name;
      await client.query(`
        DROP TABLE IF EXISTS ${tableName}
      `);
      await client.query('COMMIT');
      return { table_id: tableId, name: tableName };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
