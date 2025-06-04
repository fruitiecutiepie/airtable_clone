import { z } from "zod";
import { pool } from "~/server/db/db";
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
      if (!res.rowCount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Column not found or you do not have permission to delete it',
        });
      };
      return;
    } catch (err) {
      console.error("Error deleting column:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
