import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const delRow = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      rowId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { tableId, rowId } = input;
    const client = await pool.connect();
    try {
      const res = await client.query(
        `
        DELETE FROM app_rows
        WHERE row_id = $1 AND table_id = $2
        `,
        [rowId, tableId]
      );
      if (!res.rowCount) {
        throw new Error("Row not found");
      }
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
