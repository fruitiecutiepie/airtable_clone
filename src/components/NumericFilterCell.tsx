import type { Dispatch, SetStateAction } from "react";
import { useNumericColumnFilter } from "~/app/hooks/useNumericColumnFilter";
import type { PageParams } from "~/schemas";

export function NumericFilterCell({
  colName,
  pageParams,
  setPageParams,
  refetchRows,
}: {
  colName: string;
  pageParams: PageParams,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
  refetchRows: () => Promise<unknown>;
}) {
  const { gtInput, setGtInput, ltInput, setLtInput } =
    useNumericColumnFilter(colName, pageParams, setPageParams, refetchRows);

  return (
    <>
      <input
        type="number"
        placeholder="> value"
        value={gtInput}
        onChange={e => setGtInput(e.target.value)}
        className="border rounded px-2 py-1 w-full"
      />
      <input
        type="number"
        placeholder="< value"
        value={ltInput}
        onChange={e => setLtInput(e.target.value)}
        className="border rounded px-2 py-1 w-full"
      />
    </>
  );
}
