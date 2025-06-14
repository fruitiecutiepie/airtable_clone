import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pool } from "~/server/db/db";
import { BaseSchema, } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";

export const addBase = publicProcedure
  .input(z.object({
    userId: z.string(),
    name: z.string().min(1).max(255),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }))
  .output(BaseSchema)
  .mutation(async ({ input }) => {
    const insertResult = await pool.query<{
      base_id: number
    }>(
      `
      INSERT INTO app_bases(
        user_id, name, created_at, updated_at
      )
      VALUES($1, $2, $3, $4)
      RETURNING base_id
      `,
      [input.userId, input.name, input.createdAt, input.updatedAt]
    );
    if (insertResult.rowCount === 0 || !insertResult.rows[0]) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create base',
      });
    }
    const baseId = insertResult.rows[0].base_id;

    return {
      id: baseId,
      userId: input.userId,
      name: input.name,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };
  });
