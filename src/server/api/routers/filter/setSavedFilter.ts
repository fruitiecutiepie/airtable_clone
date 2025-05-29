import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pool } from "~/server/db/db";
import { FilterOperationSchema, SavedFilterSchema, TableRowValueSchema, } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";

export const setSavedFilter = publicProcedure
  .input(z.object({
    userId: z.string(),
    baseId: z.number(),
    tableId: z.number(),
    name: z.string(),
    filters: z.record(z.object({
      op: FilterOperationSchema,
      value: TableRowValueSchema,
    })),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }))
  .output(SavedFilterSchema)
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      const result = await client.query<{
        filter_id: number
      }>(`
        INSERT INTO saved_filters(
          user_id, 
          base_id, 
          table_id, 
          name, 
          filters, 
          created_at, 
          updated_at
        )
        VALUES(
          $1, 
          $2::int, 
          $3::int, 
          $4, 
          $5::jsonb, 
          $6::timestamptz, 
          $7::timestamptz
        )
        ON CONFLICT (user_id, table_id, name)
        DO UPDATE
          SET filters    = EXCLUDED.filters
        RETURNING filter_id
        `, [
        input.userId,
        input.baseId,
        input.tableId,
        input.name,
        JSON.stringify(input.filters),
        input.createdAt,
        input.updatedAt,
      ]);
      if (result.rowCount === 0 || !result.rows[0]) {
        throw new Error('Failed to create filter');
      }
      return {
        filter_id: result.rows[0].filter_id,
        name: input.name,
        filters: input.filters,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      };
    } catch (err: unknown) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    }
    finally {
      client.release();
    }
  });
