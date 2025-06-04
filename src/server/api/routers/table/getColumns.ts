import { z } from "zod";
import { pool } from "~/server/db/db";
import { TableColumnSchema, type TableColumnDataType } from "~/lib/schemas";
import { publicProcedure } from "../../trpc";

export const getColumns = publicProcedure
  .input(
    z.object({
      tableId: z.number()
    }))
  .output(z.array(TableColumnSchema))
  .query(async ({ input }) => {
    const { tableId } = input;
    const client = await pool.connect();
    const columns = await client.query<{
      column_id: number;
      name: string;
      data_type: TableColumnDataType;
      position: number;
    }>(
      `
      SELECT column_id, name, data_type, position
      FROM app_columns
      WHERE table_id = $1
      ORDER BY position ASC
      `,
      [tableId]
    );
    return columns.rows.map(col => ({
      columnId: col.column_id,
      name: col.name,
      dataType: col.data_type,
      position: col.position
    }));
  });
