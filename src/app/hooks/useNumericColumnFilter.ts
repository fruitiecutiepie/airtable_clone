import { useState, useEffect, type Dispatch, type SetStateAction, useCallback } from "react";
import type { PageParams, Filter } from "~/lib/schemas";

export function useNumericColumnFilter(
  colName: string,
  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
) {
  const getInitial = useCallback(() => {
    const ext = pageParams.filters?.[colName];
    let gt = "", lt = "";
    const apply = (f: Filter) => {
      if (f.op === "gt") gt = String(f.value);
      if (f.op === "lt") lt = String(f.value);
    };
    if (Array.isArray(ext)) ext.forEach(apply);
    else if (ext) apply(ext);
    return { gt, lt };
  }, [pageParams.filters, colName]);

  const [gtInput, setGtInput] = useState(() => getInitial().gt);
  const [ltInput, setLtInput] = useState(() => getInitial().lt);

  // keep inputs in sync if user clicks “clear filter” externally
  useEffect(() => {
    const { gt, lt } = getInitial();
    setGtInput(gt);
    setLtInput(lt);
  }, [getInitial]);

  // debounce → write back _array_ of 0–2 filters
  useEffect(() => {
    const h = setTimeout(() => {
      setPageParams(p => {
        const arr: Filter[] = [];
        if (gtInput !== "") arr.push({ op: "gt", value: parseFloat(gtInput) });
        if (ltInput !== "") arr.push({ op: "lt", value: parseFloat(ltInput) });

        // avoid needless updates
        const old = p.filters?.[colName];
        const oldArr = Array.isArray(old) ? old : old ? [old] : [];
        if (
          JSON.stringify(oldArr) === JSON.stringify(arr)
        ) {
          return p;
        }

        const newF: Record<string, Filter[]> = Object.fromEntries(
          Object.entries(p.filters ?? {}).map(([key, value]) => [
            key,
            Array.isArray(value) ? value : [value],
          ])
        );
        if (arr.length) newF[colName] = arr;
        else delete newF[colName];

        return { ...p, cursor: undefined, filters: newF };
      });
    }, 300);
    return () => clearTimeout(h);
  }, [gtInput, ltInput, colName, setPageParams]);

  return { gtInput, setGtInput, ltInput, setLtInput };
}
