import { z } from "zod";
import { SavedFilterSchema, type Filter } from "~/schemas";
import { publicProcedure } from "../../trpc";
import { pool } from "~/app/db/db";
import { TRPCError } from "@trpc/server";

export const getSavedFilters = publicProcedure
  .input(z.object({
    userId: z.string(),
    baseId: z.number(),
    tableId: z.number()
  }))
  .output(z.array(SavedFilterSchema))
  .query(async ({ ctx, input }) => {
    const client = await pool.connect();
    try {
      const res = await client.query<{
        filter_id: number;
        name: string;
        filters: Record<string, Filter>;
        created_at: Date;
        updated_at: Date;
      }>(`
        SELECT filter_id, name, filters, created_at, updated_at
          FROM saved_filters
        WHERE user_id  = $1
          AND base_id  = $2::int
          AND table_id = $3::int
        ORDER BY created_at
      `, [input.userId, input.baseId, input.tableId]);

      return res.rows.map(r => ({
        filter_id: r.filter_id,
        name: r.name,
        filters: r.filters,
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
