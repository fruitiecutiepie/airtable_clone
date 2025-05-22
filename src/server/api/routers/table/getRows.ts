import { z } from "zod";
import { pool } from "~/app/db/db";
import { CursorSchema, FilterSchema, TableRowSchema, type TableRowValue, type TableRow } from "~/schemas";
import { publicProcedure } from "../../trpc";

export const getRows = publicProcedure
  .input(z.object({
    tableId: z.number(),
    limit: z.number().min(1).max(5000).default(1000),
    cursor: CursorSchema.optional(),
    sortCol: z.string().default("id"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),
    filters: z.record(FilterSchema).default({}),
  }))
  .output(z.object({
    rows: z.array(TableRowSchema),
    nextCursor: CursorSchema.optional(),
  }))
  .query(async ({ input }) => {
    const {
      tableId,
      limit,
      cursor,
      sortCol,
      sortDir,
      filters,
    } = input;

    const client = await pool.connect();
    try {
      // 1) fetch column metadata
      const cols = await client.query<{ name: string }>(
        `
        SELECT name
        FROM app_columns
        WHERE table_id = $1
        ORDER BY position
        `,
        [tableId]
      );
      const names = cols.rows.map(c => c.name);
      const quotedNames = cols.rows.map(c => `"${c.name}"`);
      const tableName = `data_${tableId}`;

      // 2) ensure indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_${sortCol}
          ON ${tableName} ("${sortCol}")
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_${sortCol}_id
          ON ${tableName} ("${sortCol}", id)
      `);

      // 3) build WHERE + values
      const where: string[] = [];
      const params: TableRowValue[] = [];
      let i = 1;

      // filters
      for (const [col, cond] of Object.entries(filters)) {
        // skip filters without value except isnull/isnotnull
        if (cond.value === undefined && !["isnull", "isnotnull"].includes(cond.op)) continue;
        switch (cond.op) {
          case "eq":
            where.push(`"${col}" = $${i}`);
            params.push(cond.value);
            i++;
            break;
          case "neq":
            where.push(`"${col}" <> $${i}`);
            params.push(cond.value);
            i++;
            break;
          case "lt":
            where.push(`"${col}" < $${i}`);
            params.push(cond.value);
            i++;
            break;
          case "gt":
            where.push(`"${col}" > $${i}`);
            params.push(cond.value);
            i++;
            break;
          case "in":
            where.push(`"${col}"::text ILIKE $${i}`);
            params.push(`%${cond.value}%`);
            i++;
            break;
          case "nin":
            where.push(`"${col}"::text NOT ILIKE $${i}`);
            params.push(`%${cond.value}%`);
            i++;
            break;
          case "isnull":
            where.push(`("${col}" IS NULL OR "${col}" = '')`);
            break;
          case "isnotnull":
            where.push(`"${col}" IS NOT NULL`);
            break;
        }
      }

      if (cursor) {
        where.push(`("${sortCol}", id) > ($${i}, $${i + 1})`);
        params.push(cursor.lastValue, cursor.lastId);
        i += 2;
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // 4) query one extra row to detect more pages
      const res = await client.query<TableRow>(
        `
        SELECT id, ${quotedNames.join(",")}
        FROM ${tableName}
        ${whereSql}
        ORDER BY "${sortCol}" ${sortDir}, id ${sortDir}
        LIMIT ${limit + 1}
        `,
        params
      );

      const rows = res.rows;
      const hasMore = rows.length > limit;
      if (hasMore) rows.pop();

      // 5) compute nextCursor
      const last = rows[rows.length - 1];
      const nextCursor = hasMore
        ? { lastId: last?.id, lastValue: last?.[sortCol] }
        : undefined;

      const rowsRes = rows.map(r => {
        const out: TableRow = { id: r.id };
        for (const n of names) {
          out[n] = r[n] ?? undefined;
        };
        return out;
      });

      return {
        rows: rowsRes,
        nextCursor,
      };
    } finally {
      client.release();
    }
  });
