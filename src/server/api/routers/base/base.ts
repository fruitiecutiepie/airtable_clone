import { createTRPCRouter } from "../../trpc";
import { addBase } from "./addBase";
import { delBase } from "./delBase";
import { getBase } from "./getBase";
import { getBases } from "./getBases";
import { updBase } from "./updBase";

export const baseRouter = createTRPCRouter({
  getBases,
  getBase,
  addBase,
  updBase,
  delBase
});
