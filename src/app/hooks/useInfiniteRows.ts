"use client";

import { api } from "~/trpc/react";
import type { RouterInputs, RouterOutputs } from "~/trpc/react";

export function useInfiniteRows(
  params: RouterInputs["table"]["getRows"]
) {
  return api.table.getRows.useInfiniteQuery<
    RouterOutputs["table"]["getRows"]
  >(
    params,
    {
      getNextPageParam: last => last.nextCursor,
    }
  );
}
