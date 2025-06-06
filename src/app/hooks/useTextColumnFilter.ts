import { type Dispatch, type SetStateAction, useState, useEffect, useCallback, useRef } from "react";
import type { PageParams, FilterOperation, Filter } from "~/lib/schemas";

export function useTextColumnFilter(
  colName: string,
  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
) {
  const initImmediateRef = useRef(false);
  const initDebounceRef = useRef(false);
  // pull out the first filter in the array (or none)
  const getInitialFilterState = useCallback(() => {
    const arr = pageParams.filters?.[colName];
    const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
    return {
      op: first?.op ?? "in",
      text: first?.value != null ? String(first.value) : "",
    };
  }, [pageParams.filters, colName]);

  const [op, setOp] = useState<FilterOperation>(() => getInitialFilterState().op);
  const [text, setText] = useState<string>(() => getInitialFilterState().text);

  // keep local op/text in sync if filters change externally
  useEffect(() => {
    const { op: extOp, text: extText } = getInitialFilterState();
    setOp(o => extOp !== o ? extOp : o);
    setText(t => extText !== t ? extText : t);
  }, [getInitialFilterState]);

  // write back immediately on op change (or text if null‐ops)
  useEffect(() => {
    // skip the very first render
    if (!initImmediateRef.current) {
      initImmediateRef.current = true;
      return;
    }
    const valueForFilter = ["isnull", "isnotnull"].includes(op) ? undefined : text;
    setPageParams(p => {
      const existing = p.filters?.[colName] ?? [];
      if (
        !existing[0]
        || existing[0].op !== op
        || existing[0].value !== valueForFilter
      ) {
        return {
          ...p,
          cursor: undefined,
          filters: {
            ...(p.filters ?? {}),
            [colName]: [{ op, value: valueForFilter }],
          }
        };
      }
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, colName, setPageParams]);

  // write back on text changes after debounce, except for null‐ops
  useEffect(() => {
    if (["isnull", "isnotnull"].includes(op)) return;
    // skip the very first render
    if (!initDebounceRef.current) {
      initDebounceRef.current = true;
      return;
    }
    const h = setTimeout(() => {
      setPageParams(p => {
        const existing = p.filters?.[colName] ?? [];
        if (!existing[0]) {
          return {
            ...p,
            cursor: undefined,
            filters: {
              ...(p.filters ?? {}),
              [colName]: [{ op, value: text }] as Filter[],
            }
          };
        }

        const oldVal = existing.length === 1 ? existing[0].value : undefined;
        if ((oldVal ?? "") === text) {
          return p;
        }
        return {
          ...p,
          cursor: undefined,
          filters: {
            ...(p.filters ?? {}),
            [colName]: [{ op, value: text }] as Filter[],
          }
        };
      });
    }, 300);
    return () => clearTimeout(h);
  }, [text, op, colName, setPageParams]);

  return { op, setOp, text, setText };
}