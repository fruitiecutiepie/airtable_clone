import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { z } from "zod";
import { TableRowSchema, type PageParams, type TableRow } from "~/lib/schemas";
import type { RowsStreamReqBody } from "../api/[baseId]/[tableId]/rows/stream/route";

const StreamRowSchema = z.union([
  z.object({ totalRows: z.number() }),
  TableRowSchema
]);

const CHUNK_SIZE = 50;

export type EventSourceMessage = {
  type: "progress" | "done" | "error";
  rows?: number;
  message?: string;
};

export function useRowsStream(
  baseId: number,
  tableId: number,
  search: string,
  pageParams: PageParams,
  // concat of sort+filter+search+limit
  depsKey: string,
) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const buffer = useRef("");
  const chunkRef = useRef<TableRow[]>([]);
  // const cursorRef = useRef<string | undefined>(undefined);
  const cancelledRef = useRef(false);

  const flush = useCallback(() => {
    if (chunkRef.current.length === 0) return;
    const newRows = chunkRef.current;
    chunkRef.current = [];
    startTransition(() => {
      setRows((prev) => prev.concat(newRows));
    });
  }, []);

  const fetchNextPage = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      // 1) Use cursorRef.current instead of pageParams.cursor, so we advance pagination as we stream
      const res = await fetch(`/api/${baseId}/${tableId}/rows/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search,
          limit: pageParams.pageSize,
          cursor: pageParams.cursor,         // ← send the latest rowId here
          sortCol: pageParams.sortCol,
          sortDir: pageParams.sortDir,
          filters: pageParams.filters,
        } as RowsStreamReqBody),
      });

      if (!res.ok) throw new Error("Stream failed");

      const reader = res.body!.getReader();
      const dec = new TextDecoder();

      // 2) Read until done or cancellation
      while (true) {
        // If someone signaled cancellation, abort the reader and exit
        if (cancelledRef.current) {
          await reader.cancel();
          break;
        }

        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer.current += dec.decode(value, { stream: true });

        let idx: number;
        // 3) Extract full lines (NDJSON) from buffer
        while ((idx = buffer.current.indexOf("\n")) >= 0) {
          const line = buffer.current.slice(0, idx).trim();
          buffer.current = buffer.current.slice(idx + 1);

          if (!line) continue;

          // 4) Parse each line as either { totalRows } or a TableRow
          const parsed = StreamRowSchema.parse(JSON.parse(line));
          if ("totalRows" in parsed) {
            setTotalRows(parsed.totalRows); // update total count
          } else {
            chunkRef.current.push(parsed);
            // cursorRef.current = parsed.rowId; // advance cursor to last rowId
            if (chunkRef.current.length >= CHUNK_SIZE) {
              flush();
            }
          }
        }
      }

      // 5) One final flush if not cancelled
      if (!cancelledRef.current) {
        flush();
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError((err as Error).message);
      }
    } finally {
      // 6) Only clear loading if not cancelled
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [
    baseId,
    flush,
    pageParams.cursor,
    pageParams.filters,
    pageParams.pageSize,
    pageParams.sortCol,
    pageParams.sortDir,
    search,
    tableId,
  ]);
  const reset = useCallback(() => {
    // cursorRef.current = undefined;
    setRows([]);
    setLoading(false);
    setError(undefined);
    void fetchNextPage();
    console.log("Rows stream reset");
  }, [fetchNextPage]);

  useEffect(() => {
    cancelledRef.current = false;
    reset();
    return () => {
      cancelledRef.current = true;
      buffer.current = "";
      chunkRef.current = [];
      // cursorRef.current = undefined;
      setRows([]);
      setLoading(false);
      setError(undefined);
    };
  }, [depsKey, reset]);

  return {
    rows,
    totalRows,
    setTotalRows,
    loading: loading || pending,
    error,
    fetchNextPage,
    reset
  };
}
