import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { pool } from "~/app/db/db";

export const delSavedFilter = publicProcedure
  .input(z.object({
    userId: z.string(),
    filterId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        DELETE FROM saved_filters
        WHERE filter_id = $1
          AND user_id = $2
        `,
        [input.filterId, input.userId]
      );
      return result.rowCount && result.rowCount > 0;
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    }
    finally {
      client.release();
    }
  });
