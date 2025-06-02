import { z } from "zod";
import { pool } from "~/server/db/db";
import { TableColumnSchema } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const updColumn = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      ...TableColumnSchema.shape,
    })
  )
  .mutation(async ({ input }) => {
    const { tableId, columnId, name, dataType, position } = input;
    const client = await pool.connect();
    try {
      const res = await client.query(
        `
        UPDATE app_columns
        SET name = $1, data_type = $2, position = $3, updated_at = now()
        WHERE column_id = $4 AND table_id = $5
        RETURNING *
        `,
        [name, dataType, position, columnId, tableId]
      );
      if (!res.rowCount) throw new Error("Column not found");
      return;
    } catch (err) {
      console.error("Error updating column:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
