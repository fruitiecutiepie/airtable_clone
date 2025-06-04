import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const updTable = publicProcedure
  .input(
    z.object({
      baseId: z.number(),
      tableId: z.number(),
      name: z.string(),
    }))
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updTable = await client.query<{
        table_id: number;
        name: string;
        updated_at: Date;
      }>(
        `
        UPDATE app_tables AS t
          SET name       = $1
        WHERE t.table_id = $2
          AND t.base_id  = $3
        RETURNING t.table_id, t.name, t.updated_at
        `,
        [input.name, input.tableId, input.baseId]
      );
      if (updTable.rowCount === 0 || !updTable.rows[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Table not found or you do not have permission to update it',
        });
      }
      return;
    } catch (err: unknown) {
      console.error("Error updating table:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
