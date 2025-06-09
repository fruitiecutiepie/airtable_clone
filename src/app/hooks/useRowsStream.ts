import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { z } from "zod";
import { TableRowSchema, type PageParams, type TableRow, type TableRowValue } from "~/lib/schemas";
import type { RowsStreamReqBody } from "../api/[baseId]/[tableId]/rows/stream/route";
import { api } from "~/trpc/react";
import { fetcher } from "~/lib/fetcher";

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

  const [is100kRowsLoading, setIs100kRowsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>(undefined);

  const buffer = useRef("");
  const chunkRef = useRef<TableRow[]>([]);
  // const cursorRef = useRef<string | undefined>(undefined);
  const cancelledRef = useRef(false);
  const latestCountProgressRef = useRef<number>(0);

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

  const addRows = api.table.addRows.useMutation({
    onSuccess: async () => {
      reset();
    },
    onError: (error, variables, context) => {
      console.error(`Error adding rows: ${error.message}`, variables, context);
      setError(error.message);
      setLoading(false);
    }
  });
  const updRow = api.table.updRow.useMutation({
    onSuccess: async () => {
      await fetchNextPage();
    },
    onError: (error, variables, context) => {
      console.error(`Error updating row: ${error.message}`, variables, context);
      setError(error.message);
      setLoading(false);
    }
  });
  const delRow = api.table.delRow.useMutation({
    onSuccess: async () => {
      await fetchNextPage();
    },
    onError: (error, variables, context) => {
      console.error(`Error deleting row: ${error.message}`, variables, context);
      setError(error.message);
      setLoading(false);
    }
  });

  const onAddRow = useCallback(async (data: Record<string, TableRowValue>) => {
    await addRows.mutateAsync({
      tableId,
      rows: [data],
      createdAt: new Date().toISOString()
    });
  }, [addRows, tableId]);

  const onUpdRow = useCallback(async (
    rowId: string,
    data: Record<string, TableRowValue>
  ) => {
    await updRow.mutateAsync({
      tableId,
      rowId,
      data
    });
  }, [updRow, tableId]);

  const onDelRow = useCallback(async (rowId: string) => {
    await delRow.mutateAsync({
      tableId,
      rowId
    });
  }, [delRow, tableId]);

  const onAdd100kRowsClick = useCallback(async () => {
    setIs100kRowsLoading(true);
    const { jobId } = await fetcher<{ jobId: string }>(
      `/api/${baseId}/${tableId}/rows/100k`,
      { method: "POST" }
    );
    setJobId(jobId);
  }, [baseId, tableId]);

  useEffect(() => {
    latestCountProgressRef.current = 0;

    if (!jobId) return;

    const initialTotal = totalRows;

    let rafId: number | undefined = undefined;
    const flushToState = () => {
      setTotalRows(latestCountProgressRef.current + initialTotal);
      rafId = undefined;
    };

    console.log(`Starting EventSource for jobId: ${jobId}`);
    const es = new EventSource(`/api/events/${jobId}`);
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as EventSourceMessage;
      if (msg.type === "progress" && typeof msg.rows === "number") {
        console.log(`EventSource progress: ${msg.rows} rows`);
        // keep updating the ref (no re-render yet)
        latestCountProgressRef.current = msg.rows;
        // schedule exactly one rAF per frame
        rafId ??= requestAnimationFrame(flushToState);
      }
      if (msg.type === "done") {
        es.close();
        setIs100kRowsLoading(false);
        void fetchNextPage();
        latestCountProgressRef.current = 0;
      }
      if (msg.type === "error") {
        latestCountProgressRef.current = 0;
        console.error(msg.message);
        es.close();
        setIs100kRowsLoading(false);
      }
    };
    es.onerror = (e) => {
      latestCountProgressRef.current = 0;
      console.error("EventSource error:", e);
      es.close();
      setIs100kRowsLoading(false);
    }

    return () => {
      es.close();
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      latestCountProgressRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

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
    loading: loading || pending,
    error,
    fetchNextPage,

    onAddRow,
    onUpdRow,
    onDelRow,
    onAdd100kRowsClick,
    is100kRowsLoading,
  };
}
