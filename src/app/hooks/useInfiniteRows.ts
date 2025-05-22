"use client";

import { api } from "~/trpc/react";
import type { RouterInputs } from "~/trpc/react";

export function useInfiniteRows(
  params: RouterInputs["table"]["getRows"]
) {
  return api.table.getRows.useInfiniteQuery(
    params,
    {
      getNextPageParam: last => last.nextCursor,
    }
  );
}
