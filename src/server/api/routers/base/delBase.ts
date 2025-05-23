import { pool } from "~/app/db/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../../trpc";

export const delBase = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      baseId: z.number()
    })
  )
  .output(z.void())
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const delTable = await client.query<{
        name: string;
      }>(
        `
        DELETE FROM app_bases
        WHERE base_id = $1
          AND user_id = $2
        RETURNING name
        `,
        [input.baseId, input.userId]
      );
      if (delTable.rowCount === 0 || !delTable.rows[0]) {
        throw new Error('Failed to delete table');
      }
      const tableName = delTable.rows[0].name;
      await client.query(`
        DROP TABLE IF EXISTS ${tableName} CASCADE
      `);
      await client.query('COMMIT');
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
