import { useState, useEffect, useRef, useCallback, useTransition, type Dispatch, type SetStateAction } from "react";
import { z } from "zod";
import { TableRowSchema, type Cursor, type PageParams, type TableRow, type TableRowValue } from "~/lib/schemas";
import type { RowsStreamReqBody } from "../api/[baseId]/[tableId]/rows/stream/route";
import { api } from "~/trpc/react";

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
  ready: boolean,
  // concat of sort+filter+search+limit
  depsKey: string,
  jobId: string | undefined,
  setIs100kRowsLoading: Dispatch<SetStateAction<boolean>>
) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const buffer = useRef("");
  const chunkRef = useRef<TableRow[]>([]);
  const cursorRef = useRef<Cursor | undefined>(undefined);
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
    if (loading || cancelledRef.current) return;
    setLoading(true);
    setError(undefined);
    console.log("▶️ fetchNextPage with filters:", pageParams.filters);

    try {
      // 1) Use cursorRef.current instead of pageParams.cursor, so we advance pagination as we stream
      const cursorToSend = cursorRef.current ?? pageParams.cursor;
      const res = await fetch(`/api/${baseId}/${tableId}/rows/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search,
          limit: pageParams.pageSize,
          cursor: cursorToSend,
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
            cursorRef.current = {
              lastId: parsed.rowId,
              lastValue: (pageParams.sortCol && pageParams.sortCol !== "row_id")
                ? (parsed.data)[pageParams.sortCol]
                : undefined,
            }
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
    loading,
    pageParams.cursor,
    pageParams.filters,
    pageParams.pageSize,
    pageParams.sortCol,
    pageParams.sortDir,
    search,
    tableId,
  ]);

  const reset = useCallback(() => {
    buffer.current = "";
    chunkRef.current = [];
    cursorRef.current = undefined;
    setRows([]);
    setTotalRows(0);
    setLoading(false);
    setError(undefined);
    void fetchNextPage();
  }, [fetchNextPage]);

  const addRows = api.table.addRows.useMutation({
    onSuccess: async (addedRowsData: TableRow[], variables, context) => {
      // Assuming 'addedRowsData' is the array of newly created TableRow objects returned by the mutation.
      // This typically includes the server-generated rowId and other default values.
      if (addedRowsData && addedRowsData.length > 0) {
        startTransition(() => {
          setRows((prevRows) => [...prevRows, ...addedRowsData]); // Append new row(s) to the end
          setTotalRows((prevTotal) => prevTotal + addedRowsData.length);
        });
      }
    },
    onError: (error, variables, context) => {
      console.error(`Error adding rows: ${error.message}`, variables, context);
      setError(error.message);
      setLoading(false);
    }
  });

  const updRow = api.table.updRow.useMutation({
    onSuccess: async (updatedRowData: TableRow, variables, context) => {
      // Assuming 'updatedRowData' is the complete updated TableRow object returned by the mutation.
      if (updatedRowData) {
        startTransition(() => {
          setRows((prevRows) =>
            prevRows.map((r) => (r.rowId === updatedRowData.rowId ? updatedRowData : r))
          );
          // totalRows does not change on update
        });
      }
    },
    onError: (error, variables, context) => {
      console.error(`Error updating row: ${error.message}`, variables, context);
      setError(error.message);
      setLoading(false);
    }
  });

  const delRow = api.table.delRow.useMutation({
    onSuccess: async (data, variables, context) => {
      // 'variables' will contain { tableId, rowId } passed to mutateAsync
      const { rowId } = variables;
      startTransition(() => {
        setRows((prevRows) => prevRows.filter((r) => r.rowId !== rowId));
        setTotalRows((prevTotal) => prevTotal - 1);
      });
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
        reset();
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
    if (!ready) return;
    cancelledRef.current = false;
    reset();   // ← clear buffer, rows, cursor, totalRows, then fetch
    return () => {
      cancelledRef.current = true;
    };
  }, [depsKey, ready, reset]);

  return {
    rows,
    totalRows,
    loading: loading || pending,
    error,
    reset,
    fetchNextPage,

    onAddRow,
    onUpdRow,
    onDelRow
  };
}
