import type { Dispatch, SetStateAction } from "react";
import { useTextColumnFilter } from "~/app/hooks/useTextColumnFilter";
import type { PageParams, FilterOperation } from "~/schemas";

export function TextFilterCell({
  colName,
  pageParams,
  setPageParams,
  refetchRows,
}: {
  colName: string;
  pageParams: PageParams;
  setPageParams: Dispatch<SetStateAction<PageParams>>,
  refetchRows: () => Promise<unknown>,
}) {
  const { op, setOp, text, setText } =
    useTextColumnFilter(colName, pageParams, setPageParams, refetchRows);

  return (
    <div className="flex gap-1 w-full">
      <select
        value={op}
        className="border border-gray-700 text-gray-700 rounded px-2 py-1 outline-none focus:outline-none ring-0"
        onChange={e => setOp(e.target.value as FilterOperation)}
      >
        <option value="in">Contains</option>
        <option value="nin">Not contains</option>
        <option value="eq">Equal</option>
        <option value="neq">Not equal</option>
        <option value="isnull">Empty</option>
        <option value="isnotnull">Not empty</option>
      </select>
      {!["isnull", "isnotnull"].includes(op) && (
        <input
          type="text"
          placeholder="Filter…"
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full border border-gray-700 text-gray-700 rounded px-2 py-1 outline-none focus:outline-none ring-0"
        />
      )}
    </div>
  );
}
