"use client"

import type React from "react"
import { useCallback } from "react"
import { AdjustmentsHorizontalIcon, TrashIcon } from "@heroicons/react/24/outline"
import { Button } from "./ui/Button"
import { FilterOperationSchema, type Filter, type FilterOperation, type PageParams, type SavedFilter, type TableColumn } from "~/lib/schemas"
import { PlusIcon, CaretDownIcon } from "@radix-ui/react-icons"
import { Popover, Select } from "radix-ui"

export interface TableOptionsFilterProps {
  currFilter: SavedFilter | undefined,
  columns: TableColumn[],
  pageParams: PageParams,
  setPageParams: React.Dispatch<React.SetStateAction<PageParams>>,
  onAddFilter: (
    filterId: number | undefined,
    filters: Record<string, Filter[]>,
    name: string | undefined
  ) => Promise<SavedFilter | void>,
  filterPopoverOpen: boolean,
  setFilterPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>,
}

export function TableOptionsFilter({
  currFilter,
  columns,
  pageParams,
  setPageParams,
  onAddFilter,
  filterPopoverOpen,
  setFilterPopoverOpen
}: TableOptionsFilterProps) {
  // column name to filter
  // const [conditions, setConditions] = useState<Record<string, Filter[]>>(() => {
  //   return currFilter?.filters ?? {};
  // });

  const updateFilters = useCallback(
    (fn: (f: Record<string, Filter[]>) => Record<string, Filter[]>) => {
      const next = fn(pageParams.filters ?? {});
      setPageParams(prev => ({
        ...prev,
        filters: next,
        cursor: undefined
      }));
      void onAddFilter(currFilter?.filterId, next, currFilter?.name)
    }, [currFilter?.filterId, currFilter?.name, onAddFilter, pageParams.filters, setPageParams]
  );

  const onAddCondition = useCallback(() => {
    const first = columns[0]?.name
    if (!first) return
    updateFilters(f => ({
      ...f,
      [first]: [...(f[first] ?? []), { op: "in", value: "" }]
    }))
  }, [columns, updateFilters])
  // const isFirst = useRef(true);

  // const onAddCondition = useCallback(() => {
  //   // Add a new condition for the first column
  //   const firstColumn = columns[0];
  //   console.log("Adding condition for column:", firstColumn?.name);
  //   if (!firstColumn) return;
  //   setConditions((prev) => {
  //     const existing = prev[firstColumn.name] ?? [];
  //     return {
  //       ...prev,
  //       [firstColumn.name]: [
  //         ...existing,
  //         { op: "in", value: "" } // Default condition
  //       ]
  //     };
  //   });
  // }, [columns]);

  const getFilterOperationDisplay = (op: FilterOperation) => {
    switch (op) {
      case "in":
        return "Contains";
      case "nin":
        return "Not contains";
      case "eq":
        return "Equal";
      case "neq":
        return "Not equal";
      case "isnull":
        return "Empty";
      case "isnotnull":
        return "Not empty";
      case "lt":
        return "Less than";
      case "gt":
        return "Greater than";
      default:
        return "Unknown";
    }
  };

  // useEffect(() => {
  //   const newFilters: Record<string, Filter[]> = {}
  //   for (const [colName, conds] of Object.entries(pageParams.filters ?? {})) {
  //     const col = columns.find(c => c.name === colName)
  //     if (!col) continue
  //     newFilters[colName] = conds.map(({ op, value }) => {
  //       let v: TableRowValue = value;
  //       if (col.dataType === "numeric") v = value === "" ? undefined : parseFloat(value as string);
  //       if (col.dataType === "boolean") v = Boolean(value);
  //       if (col.dataType === "date") v = value === "" ? undefined : value;
  //       return { op, value: v };
  //     })
  //   }

  //   if (JSON.stringify(newFilters) === JSON.stringify(pageParams.filters)) {
  //     return;
  //   }

  //   setPageParams(prev => {
  //     return {
  //       ...prev,
  //       cursor: undefined,
  //       filters: newFilters
  //     }
  //   });

  //   if (isFirst.current) {
  //     isFirst.current = false
  //     return
  //   }

  //   if (currFilter) {
  //     void onAddFilter(currFilter.filterId, newFilters, currFilter.name)
  //   }
  // }, [columns, currFilter, setPageParams, onAddFilter, pageParams.filters])

  return (
    <Popover.Root
      open={filterPopoverOpen}
      onOpenChange={setFilterPopoverOpen}
    >
      <Popover.Trigger
        asChild
      >
        <Button
          variant="ghost"
          size="xs"
          className={`hover:bg-gray-200 text-gray-700
            ${Object.keys(pageParams.filters ?? {}).length > 0 && "bg-green-200 hover:bg-green-200 border border-green-200 hover:border-green-300"}`}
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
          Filter
        </Button>
      </Popover.Trigger>
      <Popover.Content
        sideOffset={5}
        align="start"
        className="shadow-xl text-xs text-gray-700 z-20 min-w-80"
      >
        <div className={`w-full p-3 gap-2 flex flex-col bg-white border border-gray-200 rounded-sm shadow-sm`}>
          {/* Field List */}
          <div className="w-full flex flex-col gap-2">
            {Object.keys(pageParams.filters ?? {}).length === 0 ? (
              <div className="text-gray-400 text-sm px-2 py-1">
                No filter conditions are applied.
              </div>
            ) : (
              <div className="text-gray-400 text-sm px-2 py-1">
                In this view, show records
              </div>
            )}
            {columns.length > 0 && Object.entries(pageParams.filters ?? {}).flatMap(([colName, conds]) =>
              conds.map((cond, index) => {
                const dataType = columns.find(c => c.name === colName)?.dataType;
                return (
                  <div
                    key={`${colName}-${index}`}
                    className="flex items-center px-2 text-sm w-xl"
                  >
                    <div
                      className="flex items-center justify-center px-3 w-20 h-8"
                    >
                      <div
                        className="text-gray-600 flex items-center justify-center h-full w-full"
                      >
                        {index === 0 ? "Where" :
                          <Select.Root
                            value="and"
                            onValueChange={(value) => {
                              console.log("Logic operator changed:", value);
                              // Add logic for AND/OR handling if needed
                            }}
                          >
                            <Select.Trigger
                              className="
                                inline-flex h-8 w-16 items-center leading-none justify-between
                                border border-gray-200 rounded-xs px-2 py-1
                              "
                            >
                              <Select.Value>
                                {index === 0 ? "Where" :
                                  <div className="flex items-center justify-between">
                                    <span>and</span>
                                    <CaretDownIcon className="w-4 h-4 text-gray-500" />
                                  </div>
                                }
                              </Select.Value>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content
                                position="popper"
                                sideOffset={5}
                                align="start"
                                className="bg-white shadow-lg rounded-sm border border-gray-200 text-xs z-30 w-16"
                              >
                                <Select.Item
                                  value="and"
                                  className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                                >
                                  and
                                </Select.Item>
                                <Select.Item
                                  value="or"
                                  className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                                >
                                  or
                                </Select.Item>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        }
                      </div>
                    </div>
                    <Select.Root
                      value={colName}
                      onValueChange={(newColName) => {
                        console.log("Column changed:", newColName);
                        updateFilters((prev) => {
                          const updated = { ...prev };

                          // If column exists, update the array
                          if (updated[colName]) {
                            // Remove the condition from old column
                            const condToMove = updated[colName][index];
                            if (!condToMove) return prev;
                            updated[colName] = updated[colName].filter((_, i) => i !== index);

                            // Clean up empty arrays
                            if (updated[colName].length === 0) {
                              delete updated[colName];
                            }

                            // Add to new column
                            updated[newColName] = updated[newColName] ?? [];
                            updated[newColName].push(condToMove);
                          }

                          return updated;
                        });
                      }}
                    >
                      <Select.Trigger
                        className="
                          inline-flex h-8 w-36 items-center leading-none justify-between
                          border border-gray-200 rounded-xs px-2 py-1
                        "
                      >
                        <Select.Value>
                          {colName}
                        </Select.Value>
                        <CaretDownIcon className="w-4 h-4 text-gray-500" />
                      </Select.Trigger>
                      <Select.Content
                        position="popper"
                        sideOffset={5}
                        align="start"
                        className="
                          bg-white shadow-lg rounded-sm border border-gray-200 text-xs z-30 w-36
                        "
                      >
                        <Select.Viewport className="max-h-60 overflow-auto">
                          {columns.map((col) => (
                            <Select.Item
                              key={col.name}
                              value={col.name}
                              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                            >
                              {col.name}
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Root>
                    <Select.Root
                      value={cond.op}
                      onValueChange={(newOp) => {
                        console.log("Operation changed:", newOp);
                        updateFilters((prev) => {
                          const updated = { ...prev };
                          if (!updated[colName]) return prev;

                          const prevCond = updated[colName][index];
                          if (!prevCond) return prev;

                          updated[colName][index] = {
                            ...prevCond,
                            op: newOp as FilterOperation,
                          };

                          return updated;
                        });
                      }}
                    >
                      <Select.Trigger
                        className="
                          inline-flex h-8 w-36 items-center leading-none justify-between
                          border-t border-b border-r border-gray-200 rounded-xs px-2 py-1
                        "
                      >
                        <Select.Value>
                          {getFilterOperationDisplay(cond.op)}
                        </Select.Value>
                        <CaretDownIcon className="w-4 h-4 text-gray-500" />
                      </Select.Trigger>
                      <Select.Content
                        position="popper"
                        sideOffset={5}
                        align="start"
                        className="
                          bg-white shadow-lg rounded-sm border border-gray-200 text-xs p-2 z-30 w-36
                        "
                      >
                        <Select.Viewport
                          className="max-h-60 overflow-auto">
                          {Object.values(FilterOperationSchema.enum).map((op) => (
                            <Select.Item
                              key={op}
                              value={op}
                              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                            >
                              {getFilterOperationDisplay(op)}
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Root>
                    <div
                      className="
                        inline-flex h-8 w-36 items-center leading-none justify-between
                        border-t border-b border-r border-gray-200 rounded-xs px-2 py-1
                      "
                    >
                      <input
                        type={
                          dataType === "numeric" ? "number" :
                            dataType === "date" ? "date" :
                              dataType === "boolean" ? "checkbox" :
                                "text"
                        }
                        placeholder="Enter a value"
                        checked={dataType === "boolean" ? Boolean(cond.value) : undefined}
                        value={dataType === "boolean"
                          ? undefined
                          : String(cond.value ?? "")}
                        onChange={e => {
                          const raw = e.currentTarget
                          let newValue: string | number | boolean | undefined

                          if (dataType === "numeric") {
                            // number inputs give you a string, so parse it here:
                            newValue = raw.value === ""
                              ? undefined
                              : parseFloat(raw.value)
                          }
                          else if (dataType === "boolean") {
                            // checkbox → checked
                            newValue = raw.checked
                          }
                          else if (dataType === "date") {
                            newValue = raw.value === ""
                              ? undefined
                              : raw.value
                          }
                          else {
                            newValue = raw.value
                          }

                          updateFilters(prev => {
                            const updated = { ...prev };
                            const bucket = updated[colName]?.slice();  // copy the array
                            if (!bucket) return prev;

                            const filterToUpdate = bucket[index];
                            if (!filterToUpdate) {
                              console.warn(`Filter at index ${index} for column ${colName} not found during value update.`);
                              return prev;
                            }

                            bucket[index] = { ...filterToUpdate, value: newValue };
                            updated[colName] = bucket;
                            return updated;
                          })
                        }}
                        className="w-full h-full px-2 text-gray-700 outline-none focus:outline-none ring-0"
                      />
                    </div>
                    <div
                      className="
                        flex border-t border-b border-r border-gray-200 h-8 w-8 justify-center items-center
                        hover:bg-gray-50 transition-colors
                      "
                    >
                      <TrashIcon
                        className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-500"
                        onClick={() => {
                          updateFilters((prev) => {
                            const updated = { ...prev };
                            if (!updated[colName]) return prev;
                            updated[colName] = updated[colName].filter((_, i) => i !== index);
                            if (updated[colName].length === 0) {
                              delete updated[colName];
                            }
                            console.log("Condition removed");
                            return updated;
                          });
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex py-1">
            <button
              onClick={onAddCondition}
              className="
                flex px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 items-center cursor-pointer
              "
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add condition
            </button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}
