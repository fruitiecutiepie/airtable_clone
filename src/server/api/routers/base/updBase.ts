import { z } from "zod";
import { pool } from "~/server/db/db";
import { BaseSchema } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const updBase = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      base: BaseSchema
    }))
  .output(
    z.void()
  )
  .mutation(async ({ input }) => {
    const { userId, base } = input;
    const client = await pool.connect();
    try {
      const res = await client.query<{
        base_id: number;
        name: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `
        UPDATE app_bases
        SET name       = $1
        WHERE base_id = $2
          AND user_id = $3
        RETURNING base_id, name, created_at, updated_at
        `,
        [base.name, base.id, userId]
      );

      if (res.rowCount === 0) {
        console.error("Base not found or you do not have permission to update it");
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or you do not have permission",
        });
      }

      return;
    } catch (err: unknown) {
      console.error("Error updating base:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
