import { type Dispatch, type SetStateAction, useState, useEffect } from "react";
import type { PageParams, FilterOperation } from "~/schemas";

export function useTextColumnFilter(
  colName: string,
  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
  refetchRows: () => Promise<unknown>,
) {
  const raw = pageParams.filters?.[colName] ?? { op: "in", value: "" };
  const initOp = raw.op;
  const initText = raw.value != null ? String(raw.value) : "";

  const [op, setOp] = useState<FilterOperation>(initOp);
  const [text, setText] = useState<string>(initText);

  // sync from external filters
  useEffect(() => {
    const f = pageParams.filters?.[colName] ?? { op: "in", value: "" };
    const newOp = f.op;
    const newText = f.value != null ? String(f.value) : "";
    if (newOp !== op) setOp(newOp);
    if (newText !== text) setText(newText);
  }, [pageParams.filters, colName]);

  // commit op immediately
  useEffect(() => {
    // clear text when null ops
    if (["isnull", "isnotnull"].includes(op)) {
      setText("");
    }
    setPageParams(p => ({
      ...p,
      cursor: undefined,
      filters: {
        ...(p.filters ?? {}),
        [colName]: {
          op,
          value: ["isnull", "isnotnull"].includes(op) ? undefined : text,
        }
      }
    }));
    void refetchRows();
  }, [op]);

  // debounce text commits
  useEffect(() => {
    if (["isnull", "isnotnull"].includes(op)) return;
    const h = setTimeout(() => {
      const cur = pageParams.filters?.[colName];
      const curVal = cur?.value != null ? String(cur.value) : "";
      if (text !== curVal) {
        setPageParams(p => ({
          ...p,
          cursor: undefined,
          filters: {
            ...(p.filters ?? {}),
            [colName]: { op, value: text || undefined }
          }
        }));
        void refetchRows();
      }
    }, 300);
    return () => clearTimeout(h);
  }, [text]);

  return { op, setOp, text, setText };
}
