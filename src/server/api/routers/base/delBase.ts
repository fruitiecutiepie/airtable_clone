import { pool } from "~/server/db/db";
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
    const delTable = await pool.query(
      `
      DELETE FROM app_bases
      WHERE base_id = $1
        AND user_id = $2
      `,
      [input.baseId, input.userId]
    );
    if (delTable.rowCount === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Base not found or you do not have permission to delete it',
      });
    }
  });
