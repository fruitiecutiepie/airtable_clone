import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
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
    const { rows } = await pool.query<{
      table_id: number;
      name: string;
      created_at: Date;
      updated_at: Date;
      count: string;
    }>(
      `
      SELECT
        t.table_id,
        t.name,
        t.created_at,
        t.updated_at,
        (
          SELECT COUNT(*)::text
            FROM app_rows r
           WHERE r.table_id = t.table_id
        ) AS count
      FROM app_tables t
      WHERE t.base_id = $1
      ORDER BY t.created_at ASC
      `,
      [input.baseId]
    );

    return rows.map((r) => ({
      id: r.table_id,
      name: r.name,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      rowCount: Number(r.count),
    }));
  });
