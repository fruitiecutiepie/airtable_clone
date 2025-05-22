"use client";
import { useRef, useEffect } from "react";
import { useInfiniteRows } from "~/app/hooks/useInfiniteRows";

export default function InfiniteList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRows({
    tableId: 42,
    limit: 100,
    cursor: undefined,
    sortCol: "id",
    sortDir: "asc",
    filters: {},
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.length > 0 && entries[0]!.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "200px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  return (
    <>
      {data
        ?
        <ul>
          {data.pages[0]?.rows.map(page =>
            <li key={page.id}>{JSON.stringify(page)}</li>
          )}
        </ul>
        : <p>Loading data…</p>
      }
      <div ref={loadMoreRef} style={{ height: 1 }} />
      {isFetchingNextPage && <p>Loading more…</p>}
      {!hasNextPage && <p>No more items</p>}
    </>
  );
}
