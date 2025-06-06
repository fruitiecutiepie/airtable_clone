import { jobs } from "..";

type RequestParams = {
  jobId: string;
};

// export const dynamic = "force-static";
// export const revalidate = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { jobId } = await params;

  const job = jobs.get(jobId);
  if (!job) return new Response("job not found", { status: 404 });

  const { emitter, promise } = job;
  const encoder = new TextEncoder();

  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // If client aborts, call cleanup immediately
      req.signal.addEventListener("abort", () => {
        if (!closed) cleanup();
      });

      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // if enqueue fails, the controller is already closed—ignore
        }
      };

      const onProgress = (payload: { rows: number }) => {
        send({ type: "progress", ...payload });
      }
      const onDone = () => {
        send({ type: "done" });
        cleanup();
      };
      const onError = (err: Error) => {
        send({ type: "error", message: err.message });
        cleanup();
      };

      const cleanup = () => {
        closed = true;
        emitter.off("progress", onProgress);
        emitter.off("done", onDone);
        emitter.off("error", onError);
        try {
          controller.close();
        } catch {
          // already closed
        }
        jobs.delete(jobId);
      };

      emitter.on("progress", onProgress);
      emitter.on("done", onDone);
      emitter.on("error", onError);

      // Handle case job promise rejects after attach listeners
      promise.catch(onError);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
