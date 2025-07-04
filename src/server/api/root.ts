import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { tableRouter } from "./routers/table/table";
import { baseRouter } from "./routers/base/base";
import { filterRouter } from "./routers/filter/filter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  base: baseRouter,
  table: tableRouter,
  filter: filterRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
