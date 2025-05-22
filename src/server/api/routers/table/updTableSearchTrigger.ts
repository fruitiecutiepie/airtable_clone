import type { PoolClient } from "@neondatabase/serverless";

/**
 * Updates the full-text search trigger for a given table.
 * It fetches 'text' type columns from app_columns and rebuilds the trigger
 * to include these columns in the _search tsvector.
 * Defaults to indexing only the 'id' column if no text columns are found.
 */
export async function updTableSearchTrigger(
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
  await client.query(`
    CREATE TRIGGER ${tableName}_search_trigger
    BEFORE INSERT OR UPDATE ON ${tableName}
    FOR EACH ROW EXECUTE PROCEDURE
    tsvector_update_trigger('_search', 'pg_catalog.english', ${colList});
  `);
  console.log(`Search trigger for ${tableName} updated with columns: ${colList}`);
}
