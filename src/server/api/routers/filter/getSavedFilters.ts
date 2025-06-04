import { z } from "zod";
import { SavedFilterSchema, type Filter } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";
import { pool } from "~/server/db/db";
import { TRPCError } from "@trpc/server";

export const getSavedFilters = publicProcedure
  .input(z.object({
    baseId: z.number(),
    tableId: z.number()
  }))
  .output(z.array(SavedFilterSchema))
  .query(async ({ input }) => {
    const client = await pool.connect();
    try {
      const res = await client.query<{
        filter_id: number;
        name: string;
        filters: Record<string, Filter[]>;
        created_at: Date;
        updated_at: Date;
      }>(`
        SELECT filter_id, name, filters, created_at, updated_at
          FROM saved_filters
        WHERE base_id  = $1::int
          AND table_id = $2::int
        ORDER BY created_at
      `, [input.baseId, input.tableId]);

      return res.rows.map(r => ({
        filterId: r.filter_id,
        name: r.name,
        filters: r.filters,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      }));
    } catch (err) {
      console.error("Error fetching saved filters:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
