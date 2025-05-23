import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";

export const getTables = publicProcedure
  .input(
    z.object({
      baseId: z.number(),
      userId: z.string(),
    })
  )
  .output(
    z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        rowCount: z.number(),
      })
    )
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
        JOIN app_bases b
          ON t.base_id = b.base_id
        WHERE t.base_id = $1
          AND b.user_id = $2
        ORDER BY created_at ASC
        `,
        [input.baseId, input.userId]
      );

      const results = await Promise.all(
        rows.map(async (r) => {
          const countRes = await client.query<{ count: string }>(`
            SELECT COUNT(*) AS count
            FROM data_${r.table_id}
          `);
          return {
            id: r.table_id,
            name: r.name,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
            rowCount: Number(countRes.rows?.[0]?.count ?? 0),
          };
        })
      );

      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });