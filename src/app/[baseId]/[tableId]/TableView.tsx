"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { flexRender } from "@tanstack/react-table";
import type { PageParams, TableColumn, TableColumnDataType } from "~/lib/schemas";
import { CheckboxIcon, Cross2Icon, LetterCaseCapitalizeIcon, PlusIcon, UploadIcon } from "@radix-ui/react-icons";
import { ContextMenu, Popover } from "radix-ui";
import { CalendarIcon, HashtagIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRowsStream } from "~/app/hooks/useRowsStream";
import { PopoverSection, type PopoverSectionProps } from "~/app/components/ui/PopoverSection";
import { useTanstackTable } from "~/app/hooks/useTanstackTable";

interface TableViewProps {
  baseId: number;
  tableId: number;

  ready: boolean;

  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  pageParams: PageParams;
  setPageParams: React.Dispatch<React.SetStateAction<PageParams>>;

  jobId: string | undefined;
  setIs100kRowsLoading: React.Dispatch<React.SetStateAction<boolean>>;

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

  ready,

  search,
  pageParams,
  setPageParams,

  jobId,
  setIs100kRowsLoading,

  // onSaveFilterClick,

  columns,
  hiddenColumnIds,
  handleColumnToggle,
  onAddCol,
  onUpdCol,
  onDelCol,
  onSortColumn
}: TableViewProps) {
  const filtersKey = useMemo(() => JSON.stringify(pageParams.filters ?? {}), [pageParams.filters]);
  const depsKey = [
    search,
    pageParams.sortCol,
    pageParams.sortDir,
    filtersKey,
  ].join("|");

  const {
    rows,
    totalRows,
    loading: streamLoading,
    error: streamError,
    reset,
    fetchNextPage,

    onAddRow,
    onUpdRow,
    onDelRow
  } = useRowsStream(baseId, tableId, search, pageParams, ready, depsKey, jobId, setIs100kRowsLoading);
  const loadedRows = useMemo(() => rows.length, [rows.length]);

  const loader = useRef<HTMLDivElement>(null);
  const {
    rows: tableModelRows,
    colsLength,
    table,
    rowVirtualizer,
    tableContainerRef,
    // onFilterColumn,
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
    if (!loader.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        // guard with your loading+rows checks
        if (streamLoading || loadedRows >= totalRows) return;

        // prevent any further callbacks until this batch is done
        obs.unobserve(entry.target);
        void fetchNextPage();
        // resume observing for the *next* batch
        obs.observe(entry.target);
      },
      { root: tableContainerRef.current }
    );

    obs.observe(loader.current);
    return () => obs.disconnect();
  }, [fetchNextPage, streamLoading, loadedRows, totalRows, tableContainerRef]);

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
      className="flex flex-col w-full h-full bg-background overflow-hidden"
    >
      <div
        className="flex flex-col gap-2 w-full flex-1"
      >
        <div
          className="flex flex-col flex-1 relative w-full"
        >
          <div
            ref={tableContainerRef}
            className="flex-1 overflow-auto w-full h-full max-h-screen"
          >
            <div
              className="sticky top-0 z-10 flex pr-40"
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
                              }`}
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
                    {/* <div
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
                  </div> */}
                  </React.Fragment>
                ))}
              </div>
              <div
                className="flex flex-col"
              >
                <Popover.Root>
                  <Popover.Trigger
                    asChild
                    className={`inline-flex items-center justify-center cursor-pointer pr-5`}
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
                {/* <div
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
              </div> */}
              </div>
            </div>

            <div>
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
                  {
                    streamLoading && loadedRows < totalRows && (
                      <>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="flex w-full animate-pulse">
                            {table.getHeaderGroups()[0]?.headers.map(h => (
                              <td
                                key={h.id}
                                className="p-2 border-r border-gray-200 bg-gray-100"
                                style={{ width: h.getSize() }}
                              />
                            ))}
                          </tr>
                        ))}
                      </>
                    )
                  }
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
                      const row = tableModelRows[virtualRow.index];
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
                                const columnName = cell.column.id;

                                const isFiltered = !isIndex && pageParams.filters &&
                                  Object.keys(pageParams.filters).includes(columnName) &&
                                  (pageParams.filters[columnName]?.length ?? 0) > 0;
                                const isSorted = !isIndex && pageParams.sortCol === columnName && pageParams.sortDir !== undefined;

                                let cellSpecificClasses = "";
                                if (isSorted) {
                                  cellSpecificClasses = "bg-orange-100";
                                } else if (isFiltered) {
                                  cellSpecificClasses = "bg-green-100";
                                }

                                return (
                                  <td
                                    key={cell.id}
                                    data-row-index={row.index}
                                    data-col-id={col.column.id}
                                    className={`
                                    flex items-center p-[0.33rem] border-r border-gray-200
                                    ${isIndex
                                        ? "flex-none justify-center text-center"
                                        : "flex-auto px-2 min-w-0"
                                      }
                                    ${cellSpecificClasses}
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
              <div
                className="
                    sticky bottom-8 left-0 flex items-center w-full h-8
                    bg-white border-y border-gray-300
                    cursor-pointer hover:bg-stone-50 z-10
                  "
                onClick={onAddRowClick}
                role="button"
                tabIndex={0}
                onKeyDown={async e => {
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
              </div>
              <div ref={loader} className="w-full h-60 opacity-0" />
            </div>
          </div>
          <div
            className="sticky bottom-0 left-0 z-10 flex-none w-full h-8 bg-stone-50 border-t border-gray-300 flex pr-40"
          >
            <div
              className="flex h-full"
              style={{ width: `${table.getTotalSize()}px` }}
            >
              {table.getHeaderGroups()[0]?.headers.map((header, idx) => {
                const isIndex = header.column.id === "#";
                return (
                  <div
                    key={header.id}
                    className={`
                      flex items-center border-y border-r border-gray-300 h-8 text-xs
                      ${isIndex
                        ? "flex-none px-2 text-gray-700 text-sm font-medium"
                        : "flex-auto px-2 text-gray-700 text-sm"
                      }
                    `}
                    style={{ width: header.getSize() }}
                  >
                    {idx === 1 ? `${totalRows} records` : null}
                  </div>
                );
              })}
            </div>
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  className="
                  absolute bottom-10 left-4 inline-flex items-center justify-center w-10 h-10 border border-gray-300
                  bg-white text-gray-500 rounded-full shadow-lg hover:bg-gray-100 focus:outline-none z-100
                "
                  aria-label="Add…"
                  onClick={e => e.stopPropagation()}
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </Popover.Trigger>
              <Popover.Content
                sideOffset={8}
                align="start"
                className="bg-white shadow-2xl rounded-md py-2 border border-gray-300 text-sm text-gray-700 z-20"
              >
                <button
                  onClick={onAddRowClick}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  <PlusIcon className="inline-block w-4 h-4 mr-2" />
                  Add a record
                </button>
                <button
                  onClick={() => {
                    /* TODO: implement create-from-attachments */
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  <UploadIcon className="inline-block w-4 h-4 mr-2" />
                  Create records from attachments
                </button>
              </Popover.Content>
            </Popover.Root>
          </div>
        </div>
      </div>
    </div>
  );
}
