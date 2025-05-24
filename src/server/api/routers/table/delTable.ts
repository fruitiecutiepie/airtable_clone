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
      const delTable = await client.query(
        `
        DELETE FROM app_tables
        WHERE table_id = $1
        `,
        [tableId]
      );
      if (delTable.rowCount === 0) {
        throw new Error('Failed to delete table');
      }
      return;
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
