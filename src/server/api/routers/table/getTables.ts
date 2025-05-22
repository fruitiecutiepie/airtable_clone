import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";

export const getTables = publicProcedure
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
  .query(async () => {
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
        SELECT table_id, name, created_at, updated_at
          FROM app_tables
        ORDER BY created_at ASC
        `,
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