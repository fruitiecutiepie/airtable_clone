import { z } from "zod";
import { pool } from "~/app/db/db";
import { TableRowValueSchema, type TableColumnDataType, type TableRow } from "~/schemas";
import { publicProcedure } from "../../trpc";

export const addRow = publicProcedure
  .input(z.object({
    tableId: z.number(),
    data: z.record(TableRowValueSchema),
  }))
  .mutation(async ({ input }) => {
    const { tableId, data } = input;
    const client = await pool.connect();
    try {
      // 1) fetch column metadata (in order)
      const { rows: cols } = await client.query<{
        name: string;
        data_type: TableColumnDataType;
      }>(
        `
        SELECT name, data_type
        FROM app_columns
        WHERE table_id = $1
        ORDER BY position
        `,
        [tableId]
      );

      const tableName = `data_${tableId}`;
      const colNames = cols.map(c => `"${c.name}"`);
      const insertCols = ['id', ...colNames].join(', ');

      // 2) build a values array, coercing each by type
      const values: unknown[] = [
        ...cols.map((c) => {
          const raw = data[c.name];
          // explicit null for missing
          if (raw === undefined) return null;

          switch (c.data_type) {
            case 'numeric':
              // if it came in as a string, parse it
              return typeof raw === 'string' ? parseFloat(raw) || 0 : raw;
            case 'boolean':
              // coerce string -> boolean
              return typeof raw === 'string' ? raw === 'true' : raw;
            case 'date':
              // expect ISO‐8601 string
              return raw;
            default: // text
              return String(raw);
          }
        })
      ];

      // 3) build placeholders like $1, $2, … 
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      // 4) run the INSERT
      const { rows: [inserted] } = await client.query<TableRow>(
        `
        INSERT INTO ${tableName} (${insertCols})
        VALUES (${placeholders})
        RETURNING id, ${colNames.join(', ')}
        `,
        values
      );

      return inserted;
    } finally {
      client.release();
    }
  });
