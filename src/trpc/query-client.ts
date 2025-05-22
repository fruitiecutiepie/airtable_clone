import type { PlaceholderDataFunction } from '@tanstack/react-query';

import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

  queryClient.setDefaultOptions({
    queries: {
      placeholderData: (queryKey: unknown[]) => {
        if (!queryKey) return undefined;
        return queryClient.getQueryData(queryKey);
      },
    },
  });

  return queryClient;
};
