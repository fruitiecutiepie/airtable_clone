import { useEffect, type Dispatch, type SetStateAction, useState } from "react"
import type { PageParams } from "~/lib/schemas";

export function useTableSearch(
  search: string,
  setSearch: Dispatch<string>,
  setPageParams: Dispatch<SetStateAction<PageParams>>,
) {
  const [liveSearchInput, setLiveSearchInput] = useState<string>(search ?? "");

  useEffect(() => {
    // whenever the external `search` prop changes, reset the input
    setLiveSearchInput(search ?? "");
  }, [search]);

  // debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (liveSearchInput !== search) {
        setSearch(liveSearchInput);
        setPageParams(p => ({ ...p, cursor: undefined, search: liveSearchInput }));
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [liveSearchInput, search, setSearch, setPageParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (liveSearchInput !== search) {
        setSearch(liveSearchInput);
        setPageParams(p => ({ ...p, cursor: undefined, search: liveSearchInput }));
      }
    }, 300); // 300ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [liveSearchInput, search, setPageParams, setSearch]);

  return {
    liveSearchInput,
    setLiveSearchInput,
  };
}
