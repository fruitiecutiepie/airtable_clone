import type { Dispatch, SetStateAction } from "react";
import { useNumericColumnFilter } from "~/app/hooks/useNumericColumnFilter";
import type { PageParams } from "~/lib/schemas";

export function NumericFilterCell({
  colName,
  pageParams,
  setPageParams,
}: {
  colName: string;
  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
}) {
  const { gtInput, setGtInput, ltInput, setLtInput } =
    useNumericColumnFilter(colName, pageParams, setPageParams);

  return (
    <div
      className="flex"
    >
      <input
        type="number"
        placeholder="> value"
        value={gtInput}
        onChange={e => setGtInput(e.target.value)}
        className="px-2 py-1 w-full border-r border-gray-200"
      />
      <input
        type="number"
        placeholder="< value"
        value={ltInput}
        onChange={e => setLtInput(e.target.value)}
        className="px-2 py-1 w-full"
      />
    </div>
  );
}
