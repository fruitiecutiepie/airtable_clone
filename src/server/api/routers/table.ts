import { z } from 'zod';
import type { PoolClient } from 'pg';
import { publicProcedure, createTRPCRouter } from '../trpc';
import { pool } from '~/app/db/db';
import { TableRowValueSchema, type TableRowValue, type TableColumnDataType, type TableRow, PageParamsSchema, type TableColumn } from '~/schemas';
import { TRPCError } from '@trpc/server';

/**
 * Updates the full-text search trigger for a given table.
 * It fetches 'text' type columns from app_columns and rebuilds the trigger
 * to include these columns in the _search tsvector.
 * Defaults to indexing only the 'id' column if no text columns are found.
 */
export async function updateTableSearchTrigger(
  client: PoolClient,
  tableId: number,
  tableName: string
) {
  const columnsResult = await client.query<{ name: string }>(
    `
    SELECT name
    FROM app_columns
    WHERE table_id = $1
      AND data_type = 'text'
    ORDER BY position
    `,
    [tableId]
  );

  const excluded = new Set(['id', 'created_at', 'updated_at', '_search']);
  const searchable = columnsResult.rows
    .map(r => r.name)
    .filter(name => !excluded.has(name))
    .map(name => `"${name}"`);

  const cols = searchable.length > 0 ? searchable : ['"id"'];
  const colList = cols.join(', ');

  await client.query(`
    DROP TRIGGER IF EXISTS ${tableName}_search_trigger 
    ON ${tableName};
  `);
  await client.query(
    `CREATE TRIGGER ${tableName}_search_trigger
     BEFORE INSERT OR UPDATE ON ${tableName}
     FOR EACH ROW EXECUTE PROCEDURE
     tsvector_update_trigger('_search', 'pg_catalog.english', ${colList});`
  );
  console.log(`Search trigger for ${tableName} updated with columns: ${colList}`);
}

export const tableRouter = createTRPCRouter({
  addTable: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const { name } = input;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const insertResult = await client.query<{
          table_id: number
        }>(
          `
          INSERT INTO app_tables(
            name
          )
          VALUES($1)
          RETURNING table_id
          `,
          [name]
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

        await updateTableSearchTrigger(client, tableId, tableName)

        await client.query('COMMIT');
        return { table_id: tableId };
      } catch (err: unknown) {
        await client.query('ROLLBACK');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        client.release();
      }
    }),
  getColumns: publicProcedure
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
    }),
  addColumn: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        name: z.string(),
        dataType: z.enum(['text', 'numeric', 'boolean', 'date']),
        position: z.number(),
      }))
    .mutation(async ({ input }) => {
      const { tableId, name, dataType, position } = input;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const insertCol = await client.query<{
          column_id: number;
        }>(
          `
          INSERT INTO app_columns(
            table_id, name, data_type, position
          )
          VALUES($1, $2, $3, $4)
          RETURNING column_id
          `,
          [tableId, name, dataType, position]
        );
        if (insertCol.rowCount === 0 || !insertCol.rows[0]) {
          throw new Error('Failed to create column');
        }
        const columnId = insertCol.rows[0].column_id;
        const tableName = `data_${tableId}`;

        await client.query(
          `
          ALTER TABLE ${tableName} 
          ADD COLUMN "${name}" ${dataType} NULL
          `
        );

        await updateTableSearchTrigger(client, tableId, tableName)

        await client.query('COMMIT');
        return { column_id: columnId, name, dataType, position };
      } catch (err: unknown) {
        await client.query('ROLLBACK');
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  addRow: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        rowId: z.string(),
        data: z.record(TableRowValueSchema),
      }))
    .mutation(async ({ input }) => {
      const { tableId, rowId, data } = input;
      const client = await pool.connect();
      try {
        const columns = await client.query<{
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

        const colNames = columns.rows.map((c) => `"${c.name}"`);
        const tableName = `data_${tableId}`;

        const values = [rowId, ...columns.rows.map((c) => data[c.name] ?? null)];
        const insertCols = ['id', ...colNames].join(', ');
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const result = await client.query<TableRow>(
          `
          INSERT INTO ${tableName} (${insertCols})
          VALUES (${placeholders})
          RETURNING id, ${colNames.join(', ')}
          `,
          values
        );

        return result.rows[0];
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  addRows: publicProcedure
    .input(z.object({
      tableId: z.number(),
      rows: z.array(z.object({
        rowId: z.string(),
        data: z.record(TableRowValueSchema)
      }))
    }))
    .mutation(async ({ input }) => {
      const { tableId, rows } = input;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // fetch column order
        const colsRes = await client.query<{ name: string }>(
          `SELECT name FROM app_columns WHERE table_id=$1 ORDER BY position`,
          [tableId]
        );
        const names = colsRes.rows.map((c) => c.name);
        const quoted = names.map((n) => `"${n}"`);
        const tableName = `data_${tableId}`;

        // insert each row in the same transaction
        for (const { rowId, data } of rows) {
          const values = [rowId, ...names.map((n) => data[n] ?? null)];
          const insertCols = ["id", ...quoted].join(", ");
          const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
          await client.query(
            `INSERT INTO ${tableName} (${insertCols}) VALUES (${placeholders})`,
            values
          );
        }

        await client.query("COMMIT");
        return { count: rows.length };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }),
  searchRows: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        query: z.string(),
        pageSize: z.number().optional(),
      }))
    .query(async ({ input }) => {
      const { tableId, query, pageSize = 1000 } = input;
      const client = await pool.connect();
      try {
        const columns = await client.query<{
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

        const colNames = columns.rows.map((c) => c.name);
        const colNamesQuoted = columns.rows.map((c) => `"${c.name}"`);
        const tableName = `data_${tableId}`;

        const textCols = columns.rows.filter(c => c.data_type === 'text').map(c => `"${c.name}"`);
        const nonTextCols = columns.rows.filter(c => c.data_type !== 'text').map(c => `"${c.name}"`);

        const textSearchCols = textCols.join(', ');
        const nonTextSearchExpr = nonTextCols
          .map((col, i) => `${col}::text ILIKE $${2 + i}`)
          .join(' OR ');

        const result = await client.query<TableRow>(
          `
          SELECT id, ${colNamesQuoted.join(',')}
          FROM ${tableName}
          WHERE (
            _search @@ plainto_tsquery('english', $1)
            ${nonTextCols.length ? `OR (${nonTextSearchExpr})` : ''}
          )
          ORDER BY id ASC
          LIMIT $${2 + nonTextCols.length}
          `,
          [
            query,
            ...nonTextCols.map(() => `%${query}%`),
            pageSize
          ]
        );

        return {
          rows: result.rows.map((r) => {
            const row: TableRow = { id: r.id };
            for (const name of colNames) {
              row[name] = r[name];
            }
            return row;
          })
        };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  getRows: publicProcedure
    .input(z.object({
      tableId: z.number(),
      params: PageParamsSchema,
    }))
    .query(async ({ input }) => {
      const {
        tableId,
        params,
      } = input;
      const {
        pageSize = 1000,
        sortCol = 'id',
        sortDir = 'asc',
        lastValue,
        lastId,
        filters = {}
      } = params;

      const client = await pool.connect();
      try {
        const columns = await client.query<
          { name: string }
        >(
          `
          SELECT name
          FROM app_columns
          WHERE table_id = $1
          ORDER BY position
          `,
          [tableId]
        );
        const colNames = columns.rows.map((c) => c.name);
        const colNamesQuoted = columns.rows.map((c) => `"${c.name}"`);
        const tableName = `data_${tableId}`;

        // Index for sorting
        const idxNameSortCol = `idx_${tableName}_${sortCol}`;
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${idxNameSortCol} 
          ON ${tableName} ("${sortCol}")
        `);
        const idxNameSortColId = `idx_${tableName}_${sortCol}_id`;
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${idxNameSortColId}
          ON ${tableName} ("${sortCol}", id)
        `);

        const whereClauses: string[] = [];
        const values: TableRowValue[] = [];
        let idx = 1;

        // Filters
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

        const whereSql = whereClauses.length
          ? `WHERE ${whereClauses.join(' AND ')}`
          : '';

        const result = await client.query<TableRow>(
          `
          SELECT id, ${colNamesQuoted.join(',')}
          FROM ${tableName}
          ${whereSql}
          ORDER BY "${sortCol}" ${sortDir}, id ${sortDir}
          LIMIT ${pageSize + 1}
          `,
          values
        );
        let rows = result.rows;

        const hasMore = rows.length > pageSize;
        if (hasMore) rows = rows.slice(0, pageSize);

        const lastRow = rows[rows.length - 1];
        const nextCursor = hasMore && lastRow
          ? {
            lastId: lastRow.id,
            lastValue: lastRow[sortCol],
          }
          : undefined;

        return {
          rows: rows.map((r) => {
            const row: TableRow = { id: r.id };
            for (const name of colNames) {
              row[name] = r[name];
            }
            return row;
          }),
          nextCursor,
        };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  updateRow: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        rowId: z.string(),
        data: z.record(TableRowValueSchema),
      }))
    .mutation(async ({ input }) => {
      const { tableId, rowId, data } = input;
      const client = await pool.connect();
      try {
        const columns = await client.query<
          { name: string }
        >(
          `
          SELECT name
          FROM app_columns
          WHERE table_id = $1
          ORDER BY position
          `,
          [tableId]
        );
        const tableName = `data_${tableId}`;
        const cols = Object.keys(data);
        const colNamesQuoted = cols.map((c) => `"${c}"`);
        const values = cols.map((c) => data[c]);

        const setClauses = [
          ...colNamesQuoted.map((col, i) => `${col} = $${i + 1}`),
          'updated_at = now()'
        ].join(', ');

        const result = await client.query<TableRow>(
          `
          UPDATE ${tableName}
          SET ${setClauses}
          WHERE id = $${cols.length + 1}
          RETURNING *
          `,
          [...values, rowId]
        );
        return result.rows[0];
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  deleteRow: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        rowId: z.string(),
      }))
    .mutation(async ({ input }) => {
      const { tableId, rowId } = input;
      const client = await pool.connect();
      try {
        const tableName = `data_${tableId}`;
        const result = await client.query(
          `
          DELETE FROM ${tableName} 
          WHERE id = $1
          `,
          [rowId]
        );
        return result.rowCount && result.rowCount > 0;
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  updateColumn: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        columnId: z.number(),
        name: z.string(),
        dataType: z.enum(['text', 'numeric', 'boolean', 'date']),
      })
    )
    .mutation(async ({ input }) => {
      const { tableId, columnId, name, dataType } = input;
      const client = await pool.connect();
      const tableName = `data_${tableId}`;
      try {
        await client.query('BEGIN');
        // lookup old column name
        const old = await client.query<{ name: string }>(
          `SELECT name FROM app_columns WHERE column_id = $1`,
          [columnId]
        );
        if (old.rowCount === 0) throw new Error("Column not found");
        const oldItem = old.rows[0];
        if (!oldItem) throw new Error("Column not found");
        const oldName = oldItem.name;
        // rename the physical column
        await client.query(
          `ALTER TABLE ${tableName}
             RENAME COLUMN "${oldName}" TO "${name}"
          `
        );
        // change its type if needed
        await client.query(
          `ALTER TABLE ${tableName}
             ALTER COLUMN "${name}" TYPE ${dataType}
             USING "${name}"::${dataType}
          `
        );
        // update our metadata table
        await client.query(
          `UPDATE app_columns
              SET name = $1, data_type = $2
            WHERE column_id = $3
          `,
          [name, dataType, columnId]
        );
        // rebuild search trigger
        await updateTableSearchTrigger(client, tableId, tableName);
        await client.query('COMMIT');
        return { columnId, name, dataType };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  deleteColumn: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        columnId: z.number(),
      }))
    .mutation(async ({ input }) => {
      const { tableId, columnId } = input;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const deleteCol = await client.query<{
          name: string;
        }>(
          `
          DELETE FROM app_columns
          WHERE column_id = $1
            AND table_id = $2
          RETURNING name
          `,
          [columnId, tableId]
        );
        if (deleteCol.rowCount === 0 || !deleteCol.rows[0]) {
          throw new Error('Failed to delete column');
        }
        const colName = deleteCol.rows[0].name;
        const tableName = `data_${tableId}`;

        await client.query(`
          ALTER TABLE ${tableName} 
          DROP COLUMN "${colName}"
        `);

        await updateTableSearchTrigger(client, tableId, tableName)

        await client.query('COMMIT');
        return { column_id: columnId, name: colName };
      } catch (err: unknown) {
        await client.query('ROLLBACK');
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  updateTable: publicProcedure
    .input(
      z.object({
        tableId: z.number(),
        name: z.string(),
      }))
    .mutation(async ({ input }) => {
      const { tableId, name } = input;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const updateTable = await client.query<{
          table_id: number;
          name: string;
          updated_at: Date;
        }>(
          `
          UPDATE app_tables
          SET name = $1, updated_at = now()
          WHERE table_id = $2
          RETURNING table_id, name, updated_at
          `,
          [name, tableId]
        );
        if (updateTable.rowCount === 0 || !updateTable.rows[0]) {
          throw new Error('Failed to update table');
        }
        return {
          table_id: updateTable.rows[0].table_id,
          name: updateTable.rows[0].name,
          updatedAt: updateTable.rows[0].updated_at.toISOString(),
        };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  deleteTable: publicProcedure
    .input(
      z.object({
        tableId: z.number()
      })
    )
    .mutation(async ({ input }) => {
      const { tableId } = input;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const deleteTable = await client.query<{
          name: string;
        }>(
          `
          DELETE FROM app_tables
          WHERE table_id = $1
          RETURNING name
          `,
          [tableId]
        );
        if (deleteTable.rowCount === 0 || !deleteTable.rows[0]) {
          throw new Error('Failed to delete table');
        }
        const tableName = deleteTable.rows[0].name;
        await client.query(`
          DROP TABLE IF EXISTS ${tableName}
        `);
        await client.query('COMMIT');
        return { table_id: tableId, name: tableName };
      } catch (err: unknown) {
        await client.query('ROLLBACK');
        return { error: err instanceof Error ? err.message : err };
      } finally {
        client.release();
      }
    }),
  getTables: publicProcedure
    .output(
      z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
        })
      )
    )
    .query(async () => {
      const client = await pool.connect();
      const { rows } = await client.query<{
        table_id: number
        name: string
        created_at: Date
        updated_at: Date
      }>(`
        SELECT table_id, name, created_at, updated_at
          FROM app_tables
         ORDER BY created_at ASC
      `)

      return rows.map((r) => ({
        id: r.table_id,
        name: r.name,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      }))
    })
});