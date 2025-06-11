import { pool } from "~/server/db/db";
import { from as copyFrom } from "pg-copy-streams";
import { Readable } from "stream";
import { faker } from "@faker-js/faker";
import { pipeline } from "stream/promises";

import { EventEmitter } from "events";
import { jobs } from "~/app/api/events";

function startBulkLoad(
  jobId: string,
  baseId: string,
  tableId: string
) {
  const emitter = new EventEmitter();
  const p = (async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL synchronous_commit = OFF");

      // Skip WAL and disabled indexes to speed up bulk load 
      await client.query("ALTER TABLE app_rows SET UNLOGGED");
      await client.query("DROP INDEX IF EXISTS app_rows_data_idx");
      await client.query("DROP INDEX IF EXISTS app_rows_search_vector_idx");

      const TARGET = 100_000;
      const BATCH_SIZE = 5_000; // send 5k rows per COPY
      let totalInserted = 0;
      let lastEmit = Date.now();

      while (totalInserted < TARGET) {
        // Build an array of up to BATCH_SIZE lines
        const lines: string[] = [];
        const batchEnd = Math.min(totalInserted + BATCH_SIZE, TARGET);
        for (let i = totalInserted; i < batchEnd; i++) {
          const fakeObj = {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            age: faker.number.int({ min: 18, max: 80 }),
            email: faker.internet.email(),
            active: faker.datatype.boolean(),
            joinedAt: faker.date.past().toISOString(),
          };
          lines.push(
            `${tableId}\t${JSON.stringify(fakeObj).replace(/"/g, '"')}\n`
          );
        }

        const rdBatch = Readable.from(lines, { highWaterMark: 1 << 20 });
        const copyStream = client.query(
          copyFrom(`COPY app_rows(table_id,data) FROM STDIN WITH (FORMAT text)`)
        );

        await pipeline(rdBatch, copyStream);
        totalInserted = batchEnd;

        const now = Date.now();
        // Throttle to max once per 200 ms
        if (now - lastEmit >= 200 || totalInserted === TARGET) {
          emitter.emit("progress", { rows: totalInserted });
          lastEmit = now;
        }

        // Yield control so Node can handle I/O
        await new Promise((r) => setImmediate(r));
      }

      await client.query("COMMIT");
      emitter.emit("done");
    } catch (err) {
      console.error("Error during bulk load:", err);
      await client.query("ROLLBACK");
      emitter.emit("error", err);
    } finally {
      client.release();
    }
  })();
  jobs.set(jobId, { emitter, promise: p });
}

type RequestParams = {
  baseId: string;
  tableId: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { baseId, tableId } = await params;
  const jobId = crypto.randomUUID();
  startBulkLoad(jobId, baseId, tableId);
  return Response.json({ jobId }, { status: 202 });
}
