import React, { useState, useEffect } from "react";
import type { PageParams } from "~/lib/schemas";

interface Props {
  colName: string;
  pageParams: PageParams;
  setPageParams: React.Dispatch<React.SetStateAction<PageParams>>;
}

export function DateRangeFilterCell({
  colName,
  pageParams,
  setPageParams
}: Props) {
  // pull out any existing gt/lt filters
  const colFilters = pageParams.filters?.[colName] ?? [];
  const gt = colFilters.find(f => f.op === "gt")?.value as string | undefined;
  const lt = colFilters.find(f => f.op === "lt")?.value as string | undefined;

  // local yyyy-MM-dd strings
  const [start, setStart] = useState(gt ? new Date(gt).toISOString().slice(0, 10) : "");
  const [end, setEnd] = useState(lt ? new Date(lt).toISOString().slice(0, 10) : "");

  // whenever start/end changes, push back into pageParams
  useEffect(() => {
    setPageParams(p => {
      const newFilt = { ...p.filters };
      const arr = [] as { op: "gt" | "lt"; value: string }[];
      if (start) arr.push({ op: "gt", value: new Date(start).toISOString() });
      if (end) arr.push({ op: "lt", value: new Date(end).toISOString() });
      newFilt[colName] = arr;
      return { ...p, cursor: undefined, filters: newFilt };
    });
  }, [start, end, setPageParams, colName]);

  return (
    <div className="flex items-center gap-1 px-1 pr-4 text-sm overflow-auto">
      <input
        type="date"
        value={start}
        onChange={e => setStart(e.target.value)}
        className="border rounded w-30 border-gray-300 text-gray-700 outline-none focus:ring-0"
      />
      <span className="text-sm">–</span>
      <input
        type="date"
        value={end}
        onChange={e => setEnd(e.target.value)}
        className="border rounded w-30 border-gray-300 text-gray-700 outline-none focus:ring-0"
      />
    </div>
  );
}
