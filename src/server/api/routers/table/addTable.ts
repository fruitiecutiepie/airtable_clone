import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pool } from "~/server/db/db";
import { TableSchema } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";

export const addTable = publicProcedure
  .input(z.object({
    baseId: z.number(),
    name: z.string().min(1).max(255),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }))
  .output(TableSchema)
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      const insertResult = await client.query<{
        table_id: number
      }>(
        `
        INSERT INTO app_tables(
          base_id, name, created_at, updated_at
        )
        VALUES($1, $2, $3, $4)
        RETURNING table_id
        `,
        [input.baseId, input.name, input.createdAt, input.updatedAt]
      );
      if (insertResult.rowCount === 0 || !insertResult.rows[0]) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create table',
        });
      }
      const tableId = insertResult.rows[0].table_id;

      return {
        id: tableId,
        name: input.name,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt
      };
    } catch (err: unknown) {
      console.error("Error adding table:", err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
