import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";

export const updTable = publicProcedure
  .input(
    z.object({
      baseId: z.number(),
      userId: z.string(),
      tableId: z.number(),
      name: z.string(),
    }))
  .mutation(async ({ input }) => {
    const { tableId, name } = input;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updTable = await client.query<{
        table_id: number;
        name: string;
        updated_at: Date;
      }>(
        `
        WITH allowed_base AS (
          SELECT base_id
            FROM app_bases
          WHERE base_id = $3
            AND user_id = $4
          LIMIT 1
        )
        UPDATE app_tables AS t
          SET name       = $1
            , updated_at = now()
          FROM allowed_base AS b
        WHERE t.table_id = $2
          AND t.base_id  = b.base_id
        RETURNING t.table_id, t.name, t.updated_at
        `,
        [name, tableId, input.baseId, input.userId]
      );
      if (updTable.rowCount === 0 || !updTable.rows[0]) {
        throw new Error('Failed to update table');
      }
      return {
        table_id: updTable.rows[0].table_id,
        name: updTable.rows[0].name,
        updatedAt: updTable.rows[0].updated_at.toISOString(),
      };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    } finally {
      client.release();
    }
  });
