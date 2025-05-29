import { z } from "zod";
import { pool } from "~/server/db/db";
import type { TableColumn } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";

export const getColumns = publicProcedure
  .input(
    z.object({
      tableId: z.number()
    }))
  .query(async ({ input }) => {
    const { tableId } = input;
    const client = await pool.connect();
    const columns = await client.query<TableColumn>(
      `
      SELECT column_id, name, data_type, position
      FROM app_columns
      WHERE table_id = $1
      ORDER BY position ASC
      `,
      [tableId]
    );
    return columns.rows;
  });
