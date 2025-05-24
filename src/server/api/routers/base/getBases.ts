import { z } from "zod";
import { pool } from "~/app/db/db";
import { publicProcedure } from "../../trpc";
import { BaseSchema } from "~/schemas";
import { TRPCError } from "@trpc/server";

export const getBases = publicProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .output(z.array(BaseSchema))
  .query(async ({ input }) => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{
        base_id: number;
        user_id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `
        SELECT *
        FROM app_bases
        WHERE user_id = $1
        ORDER BY created_at ASC
        `,
        [input.userId]
      );

      return rows.map((r) => ({
        id: r.base_id,
        userId: r.user_id,
        name: r.name,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      }));
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
