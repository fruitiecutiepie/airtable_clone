import type { Dispatch, SetStateAction } from "react";
import { useTextColumnFilter } from "~/app/hooks/useTextColumnFilter";
import type { PageParams, FilterOperation } from "~/lib/schemas";

export function TextFilterCell({
  colName,
  pageParams,
  setPageParams,
}: {
  colName: string;
  pageParams: PageParams;
  setPageParams: Dispatch<SetStateAction<PageParams>>,
}) {
  const { op, setOp, text, setText } =
    useTextColumnFilter(colName, pageParams, setPageParams);

  return (
    <div className="flex gap-1 pl-1 h-max w-max">
      <select
        value={op}
        className="
          border rounded border-gray-300 text-gray-700 
          outline-none focus:outline-none ring-0
        "
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
          className="text-gray-700 outline-none focus:outline-none ring-0 w-full"
        />
      )}
    </div>
  );
}
