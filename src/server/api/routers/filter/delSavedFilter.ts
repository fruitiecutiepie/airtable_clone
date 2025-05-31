import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { pool } from "~/server/db/db";

export const delSavedFilter = publicProcedure
  .input(z.object({
    filterId: z.number(),
  }))
  .mutation(async ({ input }) => {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        DELETE FROM saved_filters
        WHERE filter_id = $1
        `,
        [input.filterId]
      );
      return result.rowCount && result.rowCount > 0;
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : err };
    }
    finally {
      client.release();
    }
  });
