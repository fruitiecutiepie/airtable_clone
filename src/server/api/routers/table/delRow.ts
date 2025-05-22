import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";

export const delRow = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      rowId: z.string(),
    }))
  .mutation(async ({ input }) => {
    const { tableId, rowId } = input;
    const client = await pool.connect();
    try {
      const tableName = `data_${tableId}`;
      const result = await client.query(
        `
        DELETE FROM ${tableName} 
        WHERE id = $1
        `,
        [rowId]
      );
      return result.rowCount && result.rowCount > 0;
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
