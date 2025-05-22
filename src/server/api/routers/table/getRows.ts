import { z } from "zod";
import { pool } from "~/app/db/db";
import { CursorSchema, FilterSchema, TableRowSchema, type TableRowValue, type TableRow, type TableColumnDataType } from "~/schemas";
import { publicProcedure } from "../../trpc";

export const getRows = publicProcedure
  .input(
    z.object({
      tableId: z.number(),
      query: z.string().optional(),
      limit: z.number().min(1).max(5000).default(1000),
      cursor: CursorSchema.optional(),
      sortCol: z.string().default("id"),
      sortDir: z.enum(["asc", "desc"]).default("asc"),
      filters: z.record(FilterSchema).default({}),
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
    const {
      tableId, query, limit, cursor, sortCol, sortDir, filters
    } = input;

    const client = await pool.connect();
    try {
      // fetch column metadata
      const cols = await client.query<{
        name: string,
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
      const names = cols.rows.map(c => c.name);
      const quotedNames = cols.rows.map(c => `"${c.name}"`);
      const tableName = `data_${tableId}`;

      // ensure indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_${sortCol}
          ON ${tableName} ("${sortCol}")
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_${sortCol}_id
          ON ${tableName} ("${sortCol}", id)
      `);

      // build WHERE + values
      const where: string[] = [];
      const params: TableRowValue[] = [];
      let idx = 1;

      if (query) {
        // gather all expressions into one OR-clause
        const textExpr = `_search @@ plainto_tsquery('english', $${idx})`;
        params.push(query);
        idx++;

        const nonTextCols = cols.rows
          .filter(c => c.data_type !== "text")
          .map(c => `"${c.name}"`);

        const ilikeExprs = nonTextCols.map((col, i) =>
          `${col}::text ILIKE $${idx + i}`
        );
        params.push(...nonTextCols.map(() => `%${query}%`));
        idx += nonTextCols.length;

        const allExprs = [textExpr, ...ilikeExprs].join(" OR ");
        where.push(`(${allExprs})`);
      }

      // filters
      for (const [col, cond] of Object.entries(filters)) {
        // skip filters without value except isnull/isnotnull
        if (
          cond.value === undefined
          && !["isnull", "isnotnull"].includes(cond.op)
        ) {
          continue;
        }
        switch (cond.op) {
          case "eq":
            where.push(`"${col}" = $${idx}`);
            params.push(cond.value);
            idx++;
            break;
          case "neq":
            where.push(`"${col}" <> $${idx}`);
            params.push(cond.value);
            idx++;
            break;
          case "lt":
            where.push(`"${col}" < $${idx}`);
            params.push(cond.value);
            idx++;
            break;
          case "gt":
            where.push(`"${col}" > $${idx}`);
            params.push(cond.value);
            idx++;
            break;
          case "in":
            where.push(`"${col}"::text ILIKE $${idx}`);
            params.push(`%${cond.value}%`);
            idx++;
            break;
          case "nin":
            where.push(`"${col}"::text NOT ILIKE $${idx}`);
            params.push(`%${cond.value}%`);
            idx++;
            break;
          case "isnull":
            where.push(`("${col}" IS NULL OR "${col}" = '')`);
            break;
          case "isnotnull":
            where.push(`"${col}" IS NOT NULL`);
            break;
        }
      }

      if (!query && cursor) {
        where.push(`
          ("${sortCol}", id) > ($${idx}, $${idx + 1})
        `);
        params.push(cursor.lastValue, cursor.lastId);
        idx += 2;
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      // 4) query one extra row to detect more pages
      const res = await client.query<TableRow>(
        `
        SELECT id, ${quotedNames.join(",")}, COUNT(*) OVER() AS total_count
        FROM ${tableName}
        ${whereSql}
        ${query
          ? `ORDER BY id ASC, created_at DESC`
          : `ORDER BY "${sortCol}" ${sortDir}, id ${sortDir}, created_at DESC`
        }
        LIMIT ${limit + 1}
        `,
        params
      );

      const rawRows = res.rows;
      // map raw rows into our TableRow shape, null → undefined
      const rows = rawRows.map(r => {
        const out: TableRow = { id: r.id };
        names.forEach((colName) => {
          const v = r[colName];
          out[colName] = v === null ? undefined : v;
        });
        return out;
      });
      const hasMore = rows.length > limit;
      if (hasMore) rows.pop();

      const nextCursorRes =
        hasMore && rows.length > 0
          ? {
            lastId: rows[rows.length - 1]?.id,
            lastValue: rows[rows.length - 1]?.[sortCol],
          }
          : undefined;

      const result: {
        rows: TableRow[];
        nextCursor?: typeof nextCursorRes;
        totalRows?: number;
      } = {
        rows,
        nextCursor: nextCursorRes,
        totalRows:
          rawRows.length && rawRows[0]?.total_count != null
            ? Number(rawRows[0].total_count)
            : undefined,
      };
      console.log("getRows result.totalRows", result.totalRows ?? 0);

      return result;
    } finally {
      client.release();
    }
  });
