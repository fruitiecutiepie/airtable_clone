import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
import { TableColumnSchema } from "~/lib/schemas";
import { TRPCError } from "@trpc/server";

export const addColumn = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      name: z.string(),
      dataType: z.enum(['text', 'numeric', 'boolean', 'date']),
      position: z.number(),
    }))
  .output(TableColumnSchema)
  .mutation(async ({ input }) => {
    const { tableId, name, dataType, position } = input;
    const client = await pool.connect();
    try {
      const insertCol = await client.query<{
        column_id: number;
      }>(
        `
        INSERT INTO app_columns (
          table_id, name, data_type, position
        )
        VALUES($1, $2, $3, $4)
        RETURNING column_id
      `,
        [tableId, name, dataType, position]
      );
      if (insertCol.rowCount === 0 || !insertCol.rows[0]) {
        throw new Error('Failed to create column');
      }
      const columnId = insertCol.rows[0].column_id;
      return { columnId, name, dataType, position };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      console.error("Error adding column:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
