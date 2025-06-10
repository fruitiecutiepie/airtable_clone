import { z } from "zod";
import { pool } from "~/server/db/db";
import { TableRowSchema, type TableRowValue, TableRowValueSchema } from "~/lib/schemas";
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
  .output(TableRowSchema)
  .mutation(async ({ input }) => {
    const { tableId, rowId, data } = input;
    const client = await pool.connect();
    try {
      const result = await client.query<{
        rowId: string;
        tableId: number;
        data: Record<string, TableRowValue>;
        createdAt: Date;
        updatedAt: Date;
      }>(
        `
        UPDATE app_rows
        SET data = data || $2::jsonb
        WHERE row_id = $1 AND table_id = $3
        RETURNING
          row_id AS "rowId",
          table_id AS "tableId",
          data,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [rowId, JSON.stringify(data), tableId]
      );
      if (!result.rowCount) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Row not found or you do not have permission to update it',
        });
      }
      const updatedRow = result.rows[0];
      if (!updatedRow) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Row update failed, no data returned',
        });
      }
      return {
        rowId: updatedRow.rowId,
        tableId: updatedRow.tableId,
        data: updatedRow.data,
        createdAt: updatedRow.createdAt.toISOString(),
        updatedAt: updatedRow.updatedAt.toISOString(),
      }
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
