// File: app/api/[baseId]/[tableId]/rows/stream.ts

import { z } from "zod";
import { pool } from "~/server/db/db";
import Cursor from "pg-cursor";
import type { TableRow, TableRowValue } from "~/lib/schemas";
import {
  CursorSchema,
  FilterSchema,
} from "~/lib/schemas";

const ReqBodySchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(200),
  cursor: CursorSchema.optional(),
  sortCol: z.string().default("row_id"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  filters: z.record(z.array(FilterSchema)).default({}),
});
export type RowsStreamReqBody = z.infer<typeof ReqBodySchema>;

type RequestParams = {
  baseId: string;
  tableId: string;
};

interface ReadableCursor<T> {
  read(count: number): Promise<T[]>;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { tableId } = await params;
  const raw: unknown = await req.json();
  const parsed = ReqBodySchema.safeParse(raw);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", message: parsed.error }),
      { status: 400 }
    );
  }

  const { search = "", limit, cursor, sortCol, sortDir, filters } = parsed.data;
  const encoder = new TextEncoder();
  const client = await pool.connect();

  const stream = new ReadableStream({
    async start(controller) {
      const onAbort = () => {
        console.warn("rows/stream aborted by client");
        // make sure we don’t enqueue any more
        try { controller.close() } catch { }
        client.release();
      };
      req.signal.addEventListener("abort", onAbort);
      try {
        // Build the WHERE clause
        // - Always filter by table_id = $1
        // - If `search` is provided, use full‐text or ILIKE search
        // - For each filter in `filters`, add appropriate conditions
        // - If `cursor` is provided, add a “> last position” clause,
        //   using row_id or (sortCol, row_id) tuple
        const where: string[] = ["table_id = $1"];
        const params: unknown[] = [Number(tableId)];
        let idx = 2;

        // search_text
        if (search) {
          where.push(`search_vector @@ plainto_tsquery('english', $${idx})`);
          params.push(search);
          idx++;
        }

        // filters
        for (const [col, condArray] of Object.entries(filters)) {
          for (const cond of condArray) {
            if (
              cond.value === undefined &&
              !["isnull", "isnotnull"].includes(cond.op)
            ) {
              continue;
            }
            if ((cond.op === "in" || cond.op === "nin") && cond.value === "") {
              continue;
            }

            const path = `(data->>'${col}')`;
            switch (cond.op) {
              case "lt":
                if ((cond.value as unknown) instanceof Date || typeof cond.value === "string") {
                  where.push(`${path}::timestamp <= $${idx}`);
                } else {
                  where.push(`${path}::numeric < $${idx}`);
                }
                params.push(cond.value);
                idx++;
                break;
              case "gt":
                if ((cond.value as unknown) instanceof Date || typeof cond.value === "string") {
                  where.push(`${path}::timestamp >= $${idx}`);
                } else {
                  where.push(`${path}::numeric > $${idx}`);
                }
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

        // count the rows without pagination
        const whereWithoutCursor = where.length
          ? `WHERE ${where.join(" AND ")}`
          : "";
        const paramsWithoutCursor = params.slice();
        const countSql = `
          SELECT COUNT(*) AS count
          FROM app_rows
          ${whereWithoutCursor}
        `;

        // cursor pagination
        // If sortCol === "row_id": use row_id > lastId
        // Otherwise: use (data->>sortCol)::text, row_id > (lastValue, lastId)
        let lastId: string | undefined;
        let lastValue: TableRowValue;
        if (cursor) {
          const parsedCursor: z.infer<typeof CursorSchema> =
            CursorSchema.parse(cursor);
          lastId = parsedCursor.lastId;
          lastValue = parsedCursor.lastValue;
          const op = sortDir === 'asc' ? '>' : '<';
          if (sortCol === 'row_id') {
            where.push(`row_id ${op} $${idx}`);
            params.push(Number(lastId));
            idx++;
          } else {
            // TODO: cast to proper type
            where.push(
              `((data->>'${sortCol}')::text, row_id) ${op} ($${idx}, $${idx + 1})`
            );
            params.push(lastValue ?? '', lastId);
            idx += 2;
          }
        }

        // Compute totalRows
        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const orderExpr =
          sortCol === "row_id"
            ? `row_id ${sortDir}`
            : `(data->>'${sortCol}')::text ${sortDir}, row_id ${sortDir}`;

        const dataSql = `
          SELECT
            COUNT(*) OVER() AS total_rows,
            row_id, data, created_at, updated_at
          FROM app_rows
          ${whereSql}
          ORDER BY ${orderExpr}
          LIMIT $${idx}
        `;
        params.push(limit);

        await client.query("BEGIN");
        const { rows: countRows } = await client.query<{
          count: string
        }>(
          countSql,
          paramsWithoutCursor
        );
        const totalRows = Number(countRows[0]?.count);
        controller.enqueue(
          encoder.encode(JSON.stringify({ totalRows }) + "\n")
        );

        // Open a pg-cursor on SELECT
        const cursorInstance = new Cursor<{
          row_id: number;
          data: Record<string, TableRowValue>;
          created_at: Date;
          updated_at: Date;
        }>(
          dataSql,
          params
        );

        const cursorQuery = client.query(
          cursorInstance
        ) as unknown as ReadableCursor<{
          row_id: number;
          data: Record<string, TableRowValue>;
          created_at: Date;
          updated_at: Date;
        }>;

        // Loop, read in batches of 100 rows, and enqueue each as NDJSON
        let batch: Array<{
          row_id: number;
          data: Record<string, TableRowValue>;
          created_at: Date;
          updated_at: Date;
        }>;

        do {
          batch = await cursorQuery.read(100);
          if (req.signal.aborted) {
            break;
          }
          for (const row of batch) {
            if (req.signal.aborted) {
              break;
            }
            const out: TableRow = {
              rowId: row.row_id.toString(),
              tableId: Number(tableId),
              data: row.data,
              createdAt: row.created_at.toISOString(),
              updatedAt: row.updated_at.toISOString(),
            };
            controller.enqueue(encoder.encode(JSON.stringify(out) + "\n"));
          }
        } while (batch.length > 0);

        if (!req.signal.aborted) {
          await client.query("COMMIT");
          controller.close();
        }
      } catch (err) {
        console.error("Error in rows stream:", err);
        await client.query("ROLLBACK");
        controller.error(err instanceof Error ? err : new Error(String(err)));
      } finally {
        req.signal.removeEventListener("abort", onAbort);
        client.release();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
