import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pool } from "~/app/db/db";
import { TableSchema } from "~/schemas";
import { publicProcedure } from "../../trpc";
import { updTableSearchTrigger } from "./updTableSearchTrigger";

export const addTable = publicProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }))
  .output(TableSchema)
  .mutation(async ({ input }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertResult = await client.query<{
        table_id: number
      }>(
        `
        INSERT INTO app_tables(
          name, created_at, updated_at
        )
        VALUES($1, $2, $3)
        RETURNING table_id
        `,
        [input.name, input.createdAt, input.updatedAt]
      );
      if (insertResult.rowCount === 0 || !insertResult.rows[0]) {
        throw new Error('Failed to create table');
      }
      const tableId = insertResult.rows[0].table_id;
      const tableName = `data_${tableId}`;

      await client.query(`
        CREATE TABLE ${tableName} (
          id          TEXT         PRIMARY KEY,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
          _search     TSVECTOR
        )
      `);

      // create index for full-text search
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_search
        ON ${tableName} USING GIN (_search)
      `);

      await updTableSearchTrigger(client, tableId, tableName)

      await client.query('COMMIT');
      return {
        id: tableId,
        name: input.name,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        rowCount: 0,
      };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      client.release();
    }
  });
