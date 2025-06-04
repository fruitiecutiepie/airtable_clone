import { z } from "zod";
import { pool } from "~/server/db/db";
import { TableRowValueSchema } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const updRow = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      rowId: z.string(),
      data: z.record(TableRowValueSchema),
    })
  )
  .mutation(async ({ input }) => {
    const { tableId, rowId, data } = input;
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        UPDATE app_rows
        SET data = data || $2::jsonb
        WHERE row_id = $1 AND table_id = $3
        `,
        [rowId, JSON.stringify(data), tableId]
      );
      if (!result.rowCount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Row not found or you do not have permission to update it',
        });
      }
      return;
    } catch (err) {
      console.error("Error updating row:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
