import { z } from "zod";
import { pool } from "~/app/db/db";
import { TableRowValueSchema } from "~/schemas";
import { publicProcedure } from "../../trpc";

export const addRows = publicProcedure
  .input(z.object({
    tableId: z.number(),
    rows: z.array(z.object({
      data: z.record(TableRowValueSchema)
    }))
  }))
  .mutation(async ({ input }) => {
    const { tableId, rows } = input;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // fetch column order
      const colsRes = await client.query<{ name: string }>(
        `
        SELECT name
        FROM app_columns
        WHERE table_id=$1
        ORDER BY position
        `,
        [tableId]
      );
      const names = colsRes.rows.map((c) => c.name);
      const quoted = names.map((n) => `"${n}"`);
      const tableName = `data_${tableId}`;

      // insert each row in the same transaction
      for (const { data } of rows) {
        const values = [...names.map((n) => data[n] ?? undefined)];
        const insertCols = ["id", ...quoted].join(", ");
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `
          INSERT INTO ${tableName} (
            ${insertCols}
          )
          VALUES (${placeholders})
          `,
          values
        );
      }

      await client.query("COMMIT");
      return { count: rows.length };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
