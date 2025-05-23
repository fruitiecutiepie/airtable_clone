import { createTRPCRouter } from "../../trpc";
import { setSavedFilter } from "./setSavedFilter";
import { delSavedFilter } from "./delSavedFilter";
import { getSavedFilters } from "./getSavedFilters";

export const filterRouter = createTRPCRouter({
  getSavedFilters,
  setSavedFilter,
  delSavedFilter
});
