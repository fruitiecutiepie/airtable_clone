import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pool } from "~/server/db/db";
import { FilterSchema, SavedFilterSchema, type Filter } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";

export const setSavedFilter = publicProcedure
  .input(z.object({
    baseId: z.number(),
    tableId: z.number(),
    filterId: z.number().optional(),
    name: z.string(),
    filters: z.record(z.array(FilterSchema)),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }))
  .output(SavedFilterSchema)
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      let row;
      if (input.filterId == null) {
        // create
        const result = await client.query<{
          filter_id: number
          name: string
          filters: Record<string, Filter[]>
          created_at: Date
          updated_at: Date
        }>(`
          INSERT INTO saved_filters
            (base_id, table_id, name, filters, created_at, updated_at)
          VALUES
            ($1,$2,$3,$4::jsonb,$5::timestamptz,$6::timestamptz)
          RETURNING filter_id, name, filters, created_at, updated_at
        `, [
          input.baseId,
          input.tableId,
          input.name,
          JSON.stringify(input.filters),
          input.createdAt,
          input.updatedAt,
        ]);
        if (result.rowCount === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create saved filter",
          });
        }
        row = result.rows[0];
      } else {
        // update
        const result = await client.query<{
          filter_id: number
          name: string
          filters: Record<string, Filter[]>
          created_at: Date
          updated_at: Date
        }>(`
          UPDATE saved_filters
          SET
            name       = $2,
            filters    = $3::jsonb,
            updated_at = $4::timestamptz
          WHERE filter_id = $1
          RETURNING filter_id, name, filters, created_at, updated_at
        `, [
          input.filterId,
          input.name,
          JSON.stringify(input.filters),
          input.updatedAt,
        ]);
        if (result.rowCount === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Saved filter not found",
          });
        }
        row = result.rows[0];
      }
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved filter not found",
        });
      }

      return {
        filterId: row.filter_id,
        name: row.name,
        filters: row.filters,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    } catch (err: unknown) {
      console.error("Error setting saved filter:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
