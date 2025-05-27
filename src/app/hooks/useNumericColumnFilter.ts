import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import type { PageParams } from "~/schemas";

export function useNumericColumnFilter(
  colName: string,
  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
  refetchRows: () => Promise<unknown>,
) {
  // derive initial values from pageParams.filters[colName]
  const rawFilter = pageParams.filters?.[colName];
  const initGt = rawFilter?.op === "gt" ? String(rawFilter.value) : "";
  const initLt = rawFilter?.op === "lt" ? String(rawFilter.value) : "";

  const [gtInput, setGtInput] = useState(initGt);
  const [ltInput, setLtInput] = useState(initLt);

  // 1) Sync in whenever external filters change
  useEffect(() => {
    const f = pageParams.filters?.[colName];
    const newGt = f?.op === "gt" ? String(f.value) : "";
    const newLt = f?.op === "lt" ? String(f.value) : "";

    if (newGt !== gtInput) setGtInput(newGt);
    if (newLt !== ltInput) setLtInput(newLt);
  }, [pageParams.filters, colName]);

  // 2) Debounced‐commit for “>” input
  useEffect(() => {
    const h = setTimeout(() => {
      const cur = pageParams.filters?.[colName];
      const curVal = cur?.op === "gt" ? String(cur.value) : "";
      if (gtInput && gtInput !== curVal) {
        setPageParams(p => ({
          ...p,
          cursor: undefined,
          filters: {
            ...(p.filters ?? {}),
            [colName]: { op: "gt", value: gtInput || undefined }
          }
        }));
        void refetchRows();
      }
    }, 300);
    return () => clearTimeout(h);
  }, [gtInput]);

  // 3) Debounced‐commit for “<” input
  useEffect(() => {
    const h = setTimeout(() => {
      const cur = pageParams.filters?.[colName];
      const curVal = cur?.op === "lt" ? String(cur.value) : "";
      if (ltInput && ltInput !== curVal) {
        setPageParams(p => ({
          ...p,
          cursor: undefined,
          filters: {
            ...(p.filters ?? {}),
            [colName]: { op: "lt", value: ltInput || undefined }
          }
        }));
        void refetchRows();
      }
    }, 300);
    return () => clearTimeout(h);
  }, [ltInput]);

  return { gtInput, setGtInput, ltInput, setLtInput };
}
