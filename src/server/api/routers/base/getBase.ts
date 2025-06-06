import { z } from "zod";
import { pool } from "~/server/db/db";
import { publicProcedure } from "../../trpc";
import { BaseSchema } from "~/lib/schemas";
import { TRPCError } from "@trpc/server";

export const getBase = publicProcedure
  .input(
    z.object({
      baseId: z.number(),
    })
  )
  .output(BaseSchema)
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
        WHERE base_id = $1
        `,
        [input.baseId]
      );
      if (rows.length === 0 || !rows[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Base not found or you do not have permission to access it',
        });
      }
      const r = rows[0];
      return {
        id: r.base_id,
        userId: r.user_id,
        name: r.name,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      };
    } catch (err) {
      console.error('Error fetching bases:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
