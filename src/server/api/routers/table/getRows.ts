import { z } from "zod";
import { pool } from "~/server/db/db";
import {
  CursorSchema,
  FilterSchema,
  TableRowSchema,
  type TableRow,
  type TableColumnDataType,
  type TableRowValue,
} from "~/lib/schemas";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const getRows = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      query: z.string().optional(),
      limit: z.number().min(1).max(5000).default(1000),
      cursor: CursorSchema.optional(),
      sortCol: z.string().default("row_id"),
      sortDir: z.enum(["asc", "desc"]).default("asc"),
      filters: z
        .record(z.array(FilterSchema))
        .default({}),
    })
  )
  .output(
    z.object({
      rows: z.array(TableRowSchema),
      nextCursor: CursorSchema.optional(),
      totalRows: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    const { tableId, query, limit, cursor, sortCol, sortDir, filters } = input;
    const client = await pool.connect();

    const zForType: Record<TableColumnDataType, z.ZodTypeAny> = {
      text: z.string().optional(),
      numeric: z.number().optional(),
      boolean: z.boolean().optional(),
      date: z.string().datetime().optional(),
    };

    try {
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

      const dataSchema = z
        .object(
          Object.fromEntries(
            cols.map((c) => [c.name, zForType[c.data_type]])
          )
        )
        // Allow missing keys for undefined columns
        .partial();

      const where: string[] = ["table_id = $1"];
      const params: unknown[] = [tableId];
      let idx = 2;

      if (query) {
        where.push(`search_vector @@ plainto_tsquery('english', $${idx})`);
        params.push(query);
        idx++;
      }

      for (const [col, condArray] of Object.entries(filters)) {
        for (const cond of condArray) {
          if (
            cond.value === undefined &&
            !["isnull", "isnotnull"].includes(cond.op)
          ) continue;

          if ((cond.op === "in" || cond.op === "nin") && cond.value === "") {
            continue;
          }

          const path = `(data->>'${col}')`;
          switch (cond.op) {
            case "lt":
              where.push(`${path}::${(cond.value as unknown)
                instanceof Date || typeof cond.value === "string"
                ? `timestamp <= $${idx}`
                : `numeric < $${idx}`}
              `);
              params.push(cond.value);
              idx++;
              break;
            case "gt":
              where.push(`${path}::${(cond.value as unknown)
                instanceof Date || typeof cond.value === "string"
                ? `timestamp >= $${idx}`
                : `numeric > $${idx}`}
              `);
              params.push(cond.value);
              idx++;
              break;
            case "eq":
              if (typeof cond.value === "boolean") {
                where.push(`${path}::boolean = $${idx}`);
              } else {
                where.push(`${path} = $${idx}`);
              }
              params.push(cond.value);
              idx++;
              break;
            case "neq":
              if (typeof cond.value === "boolean") {
                where.push(`${path}::boolean <> $${idx}`);
              } else {
                where.push(`${path} <> $${idx}`);
              }
              params.push(cond.value);
              idx++;
              break;
            case "in":
              where.push(`${path} ILIKE $${idx}`);
              params.push(`%${cond.value}%`);
              idx++;
              break;
            case "nin":
              where.push(`${path} NOT ILIKE $${idx}`);
              params.push(`%${cond.value}%`);
              idx++;
              break;
            case "isnull":
              where.push(`(${path} IS NULL OR ${path} = '')`);
              break;
            case "isnotnull":
              where.push(`${path} IS NOT NULL`);
              break;
          }
        }
      }

      if (!query && cursor) {
        if (sortCol === "row_id") {
          where.push(`row_id > $${idx}`);
          params.push(cursor.lastId);
          idx++;
        } else {
          where.push(
            `( (data->>'${sortCol}')::text, row_id ) > ( $${idx}, $${idx + 1} )`
          );
          params.push(cursor.lastValue, cursor.lastId);
          idx += 2;
        }
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const orderExpr =
        sortCol === "row_id"
          ? `row_id ${sortDir}`
          : `(data->>'${sortCol}')::text ${sortDir}, row_id ${sortDir}`

      // 4) fetch rows
      const res = await client.query<{
        row_id: string;
        data: Record<string, TableRowValue>;
        created_at: Date;
        updated_at: Date;
        total_count: number;
      }>(
        `
        SELECT
          row_id,
          data,
          created_at,
          updated_at,
          COUNT(*) OVER() AS total_count
        FROM app_rows
        ${whereSql}
        ORDER BY ${orderExpr}
        LIMIT ${limit + 1}
        `,
        params
      );

      const raw = res.rows;
      const validated: TableRow[] = [];
      for (const r of raw) {
        const parsed = dataSchema.safeParse(r.data);
        if (!parsed.success) {
          console.error(
            `Row ${r.row_id} data validation failed:`,
            parsed.error.issues
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Row ${r.row_id} data mismatch: ${JSON.stringify(parsed.error.issues)}`
          });
        }
        validated.push({
          rowId: r.row_id,
          tableId,
          data: parsed.data,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        });
      }

      const hasMore = validated.length > limit;
      if (hasMore) validated.pop();
      console.log(
        `Fetched ${validated.length} rows for table ${tableId}, hasMore: ${hasMore}`
      );

      const lastValue =
        sortCol === "row_id"
          ? validated[validated.length - 1]?.rowId
          : validated[validated.length - 1]?.data[sortCol];

      return {
        rows: validated,
        nextCursor: hasMore
          ? {
            lastId: validated[validated.length - 1]?.rowId,
            lastValue,
          }
          : undefined,
        totalRows:
          raw[0]?.total_count != null ? Number(raw[0].total_count) : undefined,
      };
    } finally {
      client.release();
    }
  });
