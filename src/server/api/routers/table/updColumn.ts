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
    const { columnId, name, dataType, position } = input;
    const client = await pool.connect();
    try {
      const res = await client.query<{ name: string; table_id: number }>(
        `SELECT name, table_id FROM app_columns WHERE column_id = $1`,
        [input.columnId]
      );
      if (!res.rowCount || !res.rows[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });
      }
      const oldName = res.rows[0].name;
      const tableId = res.rows[0].table_id;

      await client.query(
        `
        UPDATE app_columns
        SET name = $1, data_type = $2, position = $3, updated_at = now()
        WHERE column_id = $4 AND table_id = $5
        RETURNING *
        `,
        [name, dataType, position, columnId, tableId]
      );

      if (oldName !== input.name) {
        await client.query(
          `
          UPDATE app_rows
            SET data = (data - $1::text)::jsonb
              || jsonb_build_object($2::text, data -> $1::text)
           WHERE table_id = $3
           AND data ? $1::text
          `,
          [oldName, input.name, tableId]
        );
      }

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
