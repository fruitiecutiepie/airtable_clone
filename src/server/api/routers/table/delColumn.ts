import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const delColumn = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      columnId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { tableId, columnId } = input;
    const client = await pool.connect();
    try {
      const res = await client.query(
        `
        DELETE FROM app_columns
        WHERE column_id = $1 AND table_id = $2
        `,
        [columnId, tableId]
      );
      if (!res.rowCount) throw new Error("Column not found");
      return;
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
