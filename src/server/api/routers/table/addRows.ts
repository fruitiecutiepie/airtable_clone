import { z } from "zod";
import { pool } from "~/server/db/db";
import { TableRowValueSchema, type TableColumnDataType } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const addRows = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      createdAt: z.string().datetime(),
      rows: z.array(z.record(TableRowValueSchema)),
    })
  )
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: cols } = await client.query<{
        name: string;
        data_type: TableColumnDataType;
      }>(
        `
        SELECT name, data_type
        FROM app_columns
        WHERE table_id = $1
        ORDER BY position
        `,
        [input.tableId]
      );

      const zForType: Record<TableColumnDataType, z.ZodTypeAny> = {
        text: z.string().optional(),
        numeric: z.number().optional(),
        boolean: z.boolean().optional(),
        date: z.string().datetime().optional(),
      };
      const rowSchema = z.object(
        Object.fromEntries(cols.map((c) => [c.name, zForType[c.data_type]]))
      ).strict();

      const jsonRows = input.rows.map((r, i) => {
        const parsed = rowSchema.safeParse(r);
        if (!parsed.success) {
          console.error(`Row ${i} invalid:`, parsed.error.issues);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Row ${i} invalid: ${JSON.stringify(parsed.error.issues)}`,
          });
        }
        return JSON.stringify(parsed.data);
      });

      const groups = jsonRows
        .map((_, i) => `($1, $2, $${i + 3}::jsonb)`)
        .join(", ");
      const values: unknown[] = [input.tableId, input.createdAt, ...jsonRows];

      await client.query(
        `
        INSERT INTO app_rows (table_id, created_at, data)
        VALUES ${groups}
        `,
        values
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error adding rows:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      client.release();
    }
  });
