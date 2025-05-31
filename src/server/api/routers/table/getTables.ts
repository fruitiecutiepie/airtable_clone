import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { TableSchema } from "~/lib/schemas";

export const getTables = publicProcedure
  .input(
    z.object({
      baseId: z.number()
    })
  )
  .output(
    z.array(TableSchema)
  )
  .query(async ({ input }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<{
        table_id: number;
        name: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `
        SELECT t.table_id, t.name, t.created_at, t.updated_at
          FROM app_tables t
         WHERE t.base_id = $1
         ORDER BY t.created_at ASC
        `,
        [input.baseId]
      );

      const results = await Promise.all(
        rows.map(async (r) => {
          const countRes = await client.query<{ count: string }>(
            `
            SELECT COUNT(*) AS count
              FROM app_rows
             WHERE table_id = $1
            `,
            [r.table_id]
          );
          return {
            id: r.table_id,
            name: r.name,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString()
          };
        })
      );

      await client.query("COMMIT");
      return results;
    } catch (err) {
      await client.query("ROLLBACK");
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
