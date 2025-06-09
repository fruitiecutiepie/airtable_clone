"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { flexRender } from "@tanstack/react-table";
import type { PageParams, TableColumn, TableColumnDataType } from "~/lib/schemas";
import { CheckboxIcon, LetterCaseCapitalizeIcon, MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { ContextMenu, Popover } from "radix-ui";
import { CalendarIcon, HashtagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { NumericFilterCell } from "~/app/components/NumericFilterCell";
import { TextFilterCell } from "~/app/components/TextFilterCell";
import { DateRangeFilterCell } from "~/app/components/DateRangeFilterCell";
import { Button } from "~/app/components/ui/Button";
import { useRowsStream } from "~/app/hooks/useRowsStream";
import { PopoverSection, type PopoverSectionProps } from "~/app/components/ui/PopoverSection";
import { useTableSearch } from "~/app/hooks/useTableSearch";
import { useTanstackTable } from "~/app/hooks/useTanstackTable";

interface TableViewProps {
  baseId: number;
  tableId: number;

  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  pageParams: PageParams;
  setPageParams: React.Dispatch<React.SetStateAction<PageParams>>;

  onSaveFilterClick: () => Promise<void>;

  columns: TableColumn[];
  hiddenColumnIds: Set<number>;
  handleColumnToggle: (columnId: string, hidden: boolean) => void;
  onAddCol: (name: string, dataType: TableColumnDataType) => Promise<void>;
  onUpdCol: (columnId: number, newName: string) => Promise<void>;
  onDelCol: (columnId: number) => Promise<void>;
  onSortColumn: (column: TableColumn, direction: "asc" | "desc" | undefined) => void;
}

export default function TableView({
  baseId,
  tableId,

  search,
  setSearch,
  pageParams,
  setPageParams,

  onSaveFilterClick,

  columns,
  hiddenColumnIds,
  handleColumnToggle,
  onAddCol,
  onUpdCol,
  onDelCol,
  onSortColumn
}: TableViewProps) {
  const depsKey = [
    search,
    pageParams.sortCol,
    pageParams.sortDir,
    JSON.stringify(pageParams.filters)
  ].join("|");

  const {
    rows,
    totalRows,
    loading: streamLoading,
    error: streamError,
    fetchNextPage,

    onAddRow,
    onUpdRow,
    onDelRow,
    onAdd100kRowsClick,
    is100kRowsLoading,
  } = useRowsStream(baseId, tableId, search, pageParams, depsKey);
  const loadedRows = useMemo(() => rows.length, [rows.length]);

  const {
    liveSearchInput,
    setLiveSearchInput
  } = useTableSearch(
    search,
    setSearch,
    setPageParams
  );

  const loader = useRef<HTMLDivElement>(null);

  const {
    rows: tableModelRows,
    colsLength,
    table,
    rowVirtualizer,
    tableContainerRef,
    onFilterColumn,
    setTriggerFocusOnNewRow,
  } = useTanstackTable(
    rows,
    columns,

    pageParams,
    setPageParams,

    hiddenColumnIds,
    handleColumnToggle,

    onUpdRow,
    onUpdCol,
    onDelCol,
    onSortColumn
  )
  // const canUpdateRef = useRef<boolean>(true);

  // useEffect(() => {
  //   const es = new EventSource(`/api/events/${jobId}`);
  //   es.onmessage = (e) => {
  //     const msg = JSON.parse(e.data as string) as EventSourceMessage;
  //     if (msg.type === "progress" && typeof msg.rows === "number") {
  //       latestCountProgressRef.current = msg.rows;
  //       console.log(`EventSource progress: ${msg.rows} rows canUpdate: ${canUpdateRef.current}`);
  //       if (canUpdateRef.current) {
  //         canUpdateRef.current = false;
  //         setTotalRows(latestCountProgressRef.current);
  //         setTimeout(() => {
  //           canUpdateRef.current = true;
  //         }, 200); // only allow an update every 200 ms
  //       }
  //     }
  //     if (msg.type === "done") {
  //       es.close();
  //       latestCountProgressRef.current = msg.rows ?? latestCountProgressRef.current;
  //       setTotalRows(latestCountProgressRef.current);
  //       setStreamLoading(false);
  //     }
  //     if (msg.type === "error") {
  //       console.error(msg.message);
  //       es.close();
  //       setStreamLoading(false);
  //     }
  //   };
  //   return () => es.close();
  // }, [jobId, setTotalRows, setStreamLoading]);

  useEffect(() => {
    if (!loader.current) {
      return;
    }
    const obs = new IntersectionObserver(([entry]) => {
      console.log(`entry.isIntersecting: ${entry?.isIntersecting} streamLoading: ${streamLoading} loadedRows: ${loadedRows} totalRows: ${totalRows}`);
      if (
        entry?.isIntersecting
        && !streamLoading
        && loadedRows < totalRows
      ) {
        void fetchNextPage();
      }
    }, {
      root: tableContainerRef.current,
      // rootMargin: "0px 0px 200px 0px",
    })
    obs.observe(loader.current);
    return () => obs.disconnect();
  }, [fetchNextPage, loadedRows, streamLoading, tableContainerRef, totalRows]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (
        scrollHeight - (scrollTop + clientHeight) < 1200 // 1200px from the bottom
        && !streamLoading
        && loadedRows < totalRows
      ) {
        void fetchNextPage();
      }
    };

    el.addEventListener("scroll", onScroll);
    // run once in case content is short
    onScroll();
    return () => void el.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, loadedRows, streamLoading, tableContainerRef, totalRows]);

  const onAddRowClick = useCallback(async () => {
    try {
      await onAddRow(Object.fromEntries(
        columns.map((col: TableColumn) => [col.name, undefined])
      ));
      setTriggerFocusOnNewRow(true);
    } catch (error) {
      console.error("Failed to add row:", error);
      setTriggerFocusOnNewRow(false);
    }
  }, [columns, onAddRow, setTriggerFocusOnNewRow]);

  const addColumnOptionsSection: PopoverSectionProps[] = useMemo(() => [
    {
      search: true,
      searchPlaceholder: "Find a field type",
      title: undefined,
      items: [
        {
          text: "Text",
          icon: LetterCaseCapitalizeIcon,
          onClick: () => onAddCol("Label", "text"),
        },
        {
          text: "Numeric",
          icon: HashtagIcon,
          onClick: () => onAddCol("Number", "numeric"),
        },
        {
          text: "Checkbox",
          icon: CheckboxIcon,
          onClick: () => onAddCol("Done", "boolean"),
        },
        {
          text: "Date",
          icon: CalendarIcon,
          onClick: () => onAddCol("Date", "date"),
        },
      ]
    },
  ], [onAddCol]);

  if (streamError) {
    return (
      <div className="flex items-center justify-center w-full h-full text-red-500">
        <p>Error loading data: {streamError}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full h-full p-4 bg-background"
    >
      <div
        className="flex flex-col gap-2 w-full h-full"
      >
        <div
          className="flex items-center justify-between gap-2 w-full"
        >
          <div
            className="flex items-center justify-between gap-2 w-40"
          >
            <div
              className="flex-1 flex items-center justify-center gap-2 w-16"
            >
              <p
                className="text-sm text-gray-500 text-center px-4"
              >
                {`Total rows: ${totalRows}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onAdd100kRowsClick}
              disabled={is100kRowsLoading}
              size="xs"
              className="hover:bg-gray-100 text-gray-700 border-gray-400"
            >
              {is100kRowsLoading ? "Loading..." : "Add 100k rows"}
            </Button>
            <div className="relative w-80">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={liveSearchInput}
                onChange={e => setLiveSearchInput(e.target.value)}
                className="border border-gray-300 pl-9 text-gray-700 text-sm px-3 py-1.5 h-full rounded-md w-full outline-none focus:outline-none ring-0"
                placeholder="Find in view…"
              />
            </div>
          </div>

        </div>
        <div
          className="flex flex-col w-full h-full border border-gray-300 rounded"
        >
          <div
            className="flex flex-col w-full h-full"
          >
            <div
              className="flex flex-col w-full"
            >
              <div
                ref={tableContainerRef}
                className="overflow-auto max-h-[600px] max-w-screen w-full flex-1"
              >
                <div
                  className="sticky top-0 z-10 flex pr-40"
                >
                  <div
                  >
                    <div
                      className="flex flex-col"
                      style={{
                        width: `${table.getTotalSize()}px`,
                      }}
                    >
                      {/* header row */}
                      {table.getHeaderGroups().map((headerGroup) => (
                        <React.Fragment key={headerGroup.id}>
                          <div className="flex w-full">
                            {headerGroup.headers.map((header) => {
                              const isIndex = header.column.id === "#";

                              return (
                                <div
                                  key={header.id}
                                  className={`
                                    flex items-center border-b border-r border-gray-300 bg-stone-50 h-8
                                    ${isIndex
                                      ? "flex-none justify-center"
                                      : "flex-auto justify-between cursor-pointer hover:bg-stone-100"
                                    }
                                  `}
                                  style={{
                                    width: header.getSize(),
                                  }}
                                  onClick={isIndex ? undefined : header.column.getToggleSortingHandler()}
                                  role={isIndex ? undefined : "button"}
                                  tabIndex={isIndex ? undefined : 0}
                                  onKeyDown={isIndex ? undefined : e => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      header.column.getToggleSortingHandler()?.(e);
                                    }
                                  }}
                                >
                                  <div
                                    className={`
                                      flex items-center w-full overflow-hidden
                                      ${isIndex ? "justify-center" : "justify-between gap-1"}
                                    `}
                                  >
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div
                            className="sticky top-8 flex bg-white border-b border-gray-300 z-10 h-8"
                          >
                            {headerGroup.headers.map((header) => {
                              const isIndex = header.column.id === "#";
                              const originalColumn = columns.find(c => c.name === header.column.id);

                              return (
                                <div
                                  key={`filter-${header.id}`}
                                  className={`flex items-center border-r border-gray-300 ${isIndex ? "flex-none bg-stone-50" : "flex-auto"}`}
                                  style={{
                                    width: header.getSize()
                                  }}
                                >
                                  {!isIndex && originalColumn && (
                                    <div
                                      className="relative flex items-center h-full w-full text-sm"
                                    >
                                      {(() => {
                                        switch (originalColumn.dataType) {
                                          case "numeric":
                                            return (
                                              <NumericFilterCell
                                                colName={originalColumn.name}
                                                pageParams={pageParams}
                                                setPageParams={setPageParams}
                                              />
                                            );
                                          case "text":
                                            return (
                                              <TextFilterCell
                                                colName={originalColumn.name}
                                                pageParams={pageParams}
                                                setPageParams={setPageParams}
                                              />
                                            );
                                          case "boolean": {
                                            const filterValue = pageParams.filters?.[originalColumn.name]?.[0]?.value;

                                            return (
                                              <div
                                                className="flex items-center justify-center h-full w-full gap-1"
                                              >
                                                <select
                                                  className="
                                                    border rounded border-gray-300 text-gray-700 
                                                    outline-none focus:outline-none ring-0
                                                  "
                                                  value={filterValue != null ? String(filterValue) : ""}
                                                  onChange={e => {
                                                    const v = e.target.value;
                                                    if (v === "") {
                                                      setPageParams(p => ({
                                                        ...p,
                                                        cursor: undefined,
                                                        filters: { ...p.filters, [originalColumn.name]: [] }
                                                      }));
                                                      return;
                                                    }
                                                    setPageParams(p => ({
                                                      ...p,
                                                      cursor: undefined,
                                                      filters: {
                                                        ...p.filters,
                                                        [originalColumn.name]: [{ op: "eq", value: v === "true" }]
                                                      }
                                                    }));
                                                  }}
                                                >
                                                  <option value="">All</option>
                                                  <option value="true">True</option>
                                                  <option value="false">False</option>
                                                </select>
                                              </div>
                                            );
                                          }
                                          case "date": {
                                            return (
                                              <DateRangeFilterCell
                                                colName={originalColumn.name}
                                                pageParams={pageParams}
                                                setPageParams={setPageParams}
                                              />
                                            );
                                          }
                                          default:
                                            return null;
                                        }
                                      })()}
                                      {pageParams.filters?.[originalColumn.name]?.length ? (
                                        <button
                                          onClick={() => onFilterColumn(originalColumn)}
                                          className="absolute right-1 text-gray-400 hover:text-gray-600"
                                          title="Clear filter"
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div
                    className="flex flex-col"
                  >
                    <Popover.Root>
                      <Popover.Trigger
                        asChild
                        className={`
                          inline-flex items-center justify-center cursor-pointer pr-5
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div
                          className="
                            flex-none top-0 right-0 flex items-center h-8 bg-stone-100
                            border-b border-r border-gray-300 cursor-pointer hover:bg-stone-200 z-10
                          "
                          role="button"
                          tabIndex={0}
                          aria-label="Add new column"

                        >
                          <div
                            className="flex-none flex items-center justify-center h-full w-48"
                          >
                            <PlusIcon className="w-4 h-4 text-gray-600" />
                          </div>
                        </div>
                      </Popover.Trigger>
                      <Popover.Content
                        sideOffset={3}
                        align="end"
                        className="bg-white shadow-xl font-normal px-3 py-4 rounded-lg w-64 border border-gray-300 text-sm text-gray-700 z-20"
                      >
                        {addColumnOptionsSection.map((section, index) => (
                          <PopoverSection
                            key={index}
                            title={section.title}
                            items={section.items}
                            search={section.search}
                          />
                        ))}
                      </Popover.Content>
                    </Popover.Root>
                    <div
                      className="
                        flex-none top-0 right-0 flex items-center h-8 bg-purple-700 text-gray-50
                        cursor-pointer hover:bg-purple-800 z-10
                      "
                      onClick={onSaveFilterClick}
                      role="button"
                      tabIndex={0}
                      onKeyDown={async e => {
                        if (e.key === "Enter" || e.key === " ") {
                          await onSaveFilterClick();
                        }
                      }}
                      aria-label="Save current filter"
                    >
                      <div
                        className="flex-none flex items-center justify-center h-full w-48 text-sm"
                      >
                        Save Filter
                      </div>
                    </div>
                  </div>
                </div>
                <table
                  className="table-fixed w-full text-xs border-collapse"
                >
                  <tbody
                    style={{
                      display: "grid",
                      position: "relative",
                      width: `${table.getTotalSize()}px`,
                      height: `${rowVirtualizer.getTotalSize()}px`,
                    }}
                    className="w-full relative text-xs"
                  >
                    {tableModelRows.length === 0 && !streamLoading ? (
                      <tr
                        className="flex w-full absolute top-0 left-0"
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                      >
                        <td
                          colSpan={colsLength}
                          className="flex items-center justify-center text-gray-500 text-sm p-4"
                          style={{ width: "100%" }}
                        >
                          No rows to display.
                        </td>
                      </tr>
                    ) : (
                      rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = table.getRowModel().rows[virtualRow.index];
                        if (!row) return null;
                        const col = row.getVisibleCells()[0];
                        if (!col) return null;
                        return (
                          <ContextMenu.Root
                            key={row.id}
                          >
                            <ContextMenu.Trigger
                              asChild
                            >
                              <tr
                                ref={(node) => rowVirtualizer.measureElement(node)}
                                data-index={virtualRow.index}
                                style={{
                                  display: "flex",
                                  width: "100%",
                                  position: "absolute",
                                  top: `${virtualRow.start}px`,
                                  height: `${virtualRow.size}px`,
                                  left: 0,
                                }}
                                className="border border-gray-200 bg-white"
                              >
                                {row.getVisibleCells().map((cell) => {
                                  const isIndex = cell.column.id === "#";
                                  return (
                                    <td
                                      key={cell.id}
                                      data-row-index={row.index}
                                      data-col-id={col.id}
                                      className={`
                                        flex items-center p-[0.33rem] border-r border-gray-200
                                        ${isIndex
                                          ? "flex-none justify-center text-center"
                                          : "flex-auto px-2 hover:bg-gray-50 min-w-0"
                                        }
                                      `}
                                      style={{
                                        width: cell.column.getSize(),
                                      }}
                                    >
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            </ContextMenu.Trigger>
                            <ContextMenu.Portal>
                              <ContextMenu.Content
                                className="bg-gray-50 shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs
                                  fixed mt-1 z-50
                                  origin-top-left
                                "
                              >
                                <div key={`context-section-${0}`} className="flex flex-col">
                                  <ContextMenu.Item
                                    key={`${row.original.rowId}`}
                                    className={`flex items-center p-2 gap-2 rounded
                                          cursor-pointer data-[highlighted]:bg-gray-100 outline-none
                                          text-sm leading-none
                                        `}
                                    onSelect={async () => {
                                      const rowId = row.original.rowId;
                                      await onDelRow(rowId);
                                    }}
                                  >
                                    <TrashIcon className="inline-flex items-center justify-center h-4 w-4 shrink-0" />
                                    <span className={`text-red-700`}>
                                      Delete record
                                    </span>
                                  </ContextMenu.Item>
                                </div>
                              </ContextMenu.Content>
                            </ContextMenu.Portal>
                          </ContextMenu.Root >
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div ref={loader} className="w-full h-px opacity-0" />
              </div>
            </div>
            <div
              className="
                sticky bottom-0 left-0 flex items-center w-full h-8 bg-white
                border-t border-gray-300 cursor-pointer hover:bg-stone-50
              "
              onClick={onAddRowClick}
              role="button"
              tabIndex={0}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  await onAddRowClick();
                }
              }}
              aria-label="Add new row"
            >
              <div
                className="flex-none flex items-center justify-center h-full"
                style={{ width: `40px` }}
              >
                <PlusIcon className="w-4 h-4 text-gray-600" />
              </div>
              {/* <div className="flex-auto px-2 text-sm text-gray-500">
                Add new row
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {
        streamLoading && loadedRows < totalRows &&
        <div className="text-center p-2">
          Loading more…
        </div>
      }
    </div >
  );
}
