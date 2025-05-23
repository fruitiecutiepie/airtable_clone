import { createTRPCRouter } from "../../trpc";
import { addBase } from "./addBase";
import { delBase } from "./delBase";
import { getBases } from "./getBases";
import { updBase } from "./updBase";

export const baseRouter = createTRPCRouter({
  getBases,
  addBase,
  updBase,
  delBase
});
