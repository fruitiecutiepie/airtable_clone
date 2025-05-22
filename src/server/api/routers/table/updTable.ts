import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";

export const updTable = publicProcedure
  .input(
    z.object({
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
        UPDATE app_tables
        SET name = $1, updated_at = now()
        WHERE table_id = $2
        RETURNING table_id, name, updated_at
        `,
        [name, tableId]
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
