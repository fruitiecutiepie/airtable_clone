import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Table not found or you do not have permission to delete it',
        });
      }
      return;
    } catch (err: unknown) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
