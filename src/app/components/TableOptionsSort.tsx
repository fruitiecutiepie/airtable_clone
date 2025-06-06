"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { DropdownMenu, Select } from "radix-ui"
import { CalendarIcon, CaretDownIcon, CheckboxIcon, LetterCaseCapitalizeIcon, PlusIcon, QuestionMarkIcon } from "@radix-ui/react-icons"
import { SearchInput } from "./ui/SearchInput"
import { ArrowsUpDownIcon, HashtagIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { Button } from "./ui/Button"
import { type TableColumn, type TableColumnDataType } from "~/lib/schemas"

const getSortDirPlaceholderText = (
  dir: "asc" | "desc" | undefined,
  colDataType: TableColumnDataType | undefined
): string => {
  if (dir === undefined) {
    return "Order";
  }
  const isNumeric = colDataType === "numeric";
  // You can extend this for other data types like date, boolean if needed
  if (dir === "asc") {
    return isNumeric ? "1 → 9" : "A → Z";
  } else { // dir === "desc"
    return isNumeric ? "9 → 1" : "Z → A";
  }
};

export interface TableOptionsSortProps {
  columns: TableColumn[]
  onSortColumn: (column: TableColumn, direction: "asc" | "desc" | undefined) => void
}

export function TableOptionsSort({
  columns,
  onSortColumn
}: TableOptionsSortProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumns, setSortColumns] = useState<[string, "asc" | "desc" | undefined][]>([]);

  useEffect(() => {
    if (sortColumns.length > 0) {
      const [colName, direction] = sortColumns[0]!;
      const columnDef = columns.find(c => c.name === colName);
      if (columnDef) {
        onSortColumn(columnDef, direction);
      }
    }
  }, [sortColumns, columns, onSortColumn]);


  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns
    return columns.filter((column) => column.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [columns, searchQuery])

  const onAddSortColumn = () => {
    const firstColumn = columns[0];
    if (!firstColumn) return;
    setSortColumns(prev => [...prev, [firstColumn.name, "asc"]]);
  }

  if (sortColumns.length === 0) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-200 text-gray-700"
          >
            <ArrowsUpDownIcon className="w-4 h-4 mr-1" />
            Sort
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          className="bg-white shadow-xl p-3 rounded-lg w-72
          border border-gray-300 text-xs flex flex-col
          fixed mt-1 z-20 origin-top-left
        "
          sideOffset={5}
          align="start"
        >
          <p className="m-2 text-gray-400 text-[11px]">
            {`Sort by`}
          </p>

          <DropdownMenu.Separator
            className="mx-2 mb-2 h-px bg-gray-200"
          />

          <SearchInput
            searchPlaceholder="Find a field"
            value={searchQuery}
            onChange={setSearchQuery}
            size="xs"
            className="my-1 w-full"
          />

          {sortColumns.length === 0 && filteredColumns.map(col => (
            <DropdownMenu.Item
              key={col.columnId}
              onSelect={(e) => {
                e.preventDefault();
                setSortColumns([[col.name, "asc"]]);
              }}
              className="flex items-center p-2 gap-2 rounded w-full
              cursor-pointer data-[highlighted]:bg-gray-100
              outline-none text-xs leading-none
            "
            >
              {col.dataType === "text" ? (
                <LetterCaseCapitalizeIcon className="w-4 h-4 text-gray-600 shrink-0" />
              ) : col.dataType === "numeric" ? (
                <HashtagIcon className="w-4 h-4 text-gray-600 shrink-0" />
              ) : col.dataType === "date" ? (
                <CalendarIcon className="w-4 h-4 text-gray-600 shrink-0" />
              ) : col.dataType === "boolean" ? (
                <CheckboxIcon className="w-4 h-4 text-gray-600 shrink-0" />
              ) : (
                <QuestionMarkIcon className="w-4 h-4 text-gray-600 shrink-0" />
              )}
              {col.name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="hover:bg-gray-200 text-gray-700"
        >
          <ArrowsUpDownIcon className="w-4 h-4 mr-1" />
          Sort
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        className="bg-white shadow-xl p-3 rounded-lg w-80
          border border-gray-300 text-xs flex flex-col
          fixed mt-1 z-20 origin-top-left
        "
        sideOffset={5}
        align="start"
      >
        <p className="m-2 text-gray-400 text-[11px]">
          {`Sort by`}
        </p>

        <DropdownMenu.Separator
          className="mx-2 mb-2 h-px bg-gray-200"
        />

        <div className="w-full flex flex-col gap-2">
          {sortColumns.map(([colName, sortDir], index) => {
            const dataType = columns.find(c => c.name === colName)?.dataType;
            return (
              <div
                key={`${colName}-${index}`}
                className="flex items-center px-2 text-sm w-full gap-1"
              >
                <Select.Root
                  value={colName || undefined}
                  onValueChange={(newSelectedColName) => {
                    console.log("Column changed to:", newSelectedColName);
                    setSortColumns(prev => {
                      const updated = [...prev];
                      const currentSort = updated[index];
                      if (!currentSort) return prev;

                      const newSortDirection = currentSort[1] ?? 'asc';
                      updated[index] = [newSelectedColName, newSortDirection];
                      return updated;
                    });
                  }}
                >
                  <Select.Trigger
                    className="
                      inline-flex h-8 flex-1 items-center leading-none justify-between
                      border border-gray-200 rounded-xs px-2 py-1
                    "
                  >
                    <Select.Value>
                      {colName || (columns[0] ? columns[0].name : "Select column")}
                    </Select.Value>
                    <CaretDownIcon className="w-4 h-4 text-gray-500" />
                  </Select.Trigger>
                  <Select.Content
                    position="popper"
                    align="start"
                    side="bottom"
                    sideOffset={5}
                    className="
                      bg-white shadow-lg rounded-sm border border-gray-200 text-xs z-30 w-48
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
                  value={sortDir ?? undefined}
                  onValueChange={(newSelectedSortDirString: string) => {
                    const newSelectedSortDir = newSelectedSortDirString as "asc" | "desc";
                    console.log("Sort direction changed to:", newSelectedSortDir);
                    setSortColumns(prev => {
                      const updated = [...prev];
                      const currentSort = updated[index];
                      if (!currentSort) return prev;

                      const currentColName = currentSort[0];
                      updated[index] = [currentColName, newSelectedSortDir];

                      if (currentColName) {
                        const columnDef = columns.find(c => c.name === currentColName);
                        if (columnDef) {
                          onSortColumn(columnDef, newSelectedSortDir);
                        }
                      }
                      return updated;
                    });
                  }}
                >
                  <Select.Trigger
                    className="
                      inline-flex h-8 w-32 items-center leading-none justify-between
                      border border-gray-200 rounded-xs px-2 py-1
                    "
                  >
                    <Select.Value>
                      {sortDir ? getSortDirPlaceholderText(sortDir, dataType) : "Order"}
                    </Select.Value>
                    <CaretDownIcon className="w-4 h-4 text-gray-500" />
                  </Select.Trigger>
                  <Select.Content
                    position="popper"
                    align="start"
                    side="bottom"
                    sideOffset={5}
                    className="
                      bg-white shadow-lg rounded-sm border border-gray-200 text-xs p-1 z-30 w-32
                    "
                  >
                    <Select.Viewport
                      className="max-h-60 overflow-auto">
                      {["asc", "desc"].map((op) => (
                        <Select.Item
                          key={op}
                          value={op}
                          className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                        >
                          {getSortDirPlaceholderText(op as "asc" | "desc", dataType)}
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Root>
                <div
                  className="
                    flex border border-gray-200 rounded-xs h-8 w-8 justify-center items-center
                    hover:bg-gray-50 transition-colors
                  "
                >
                  <XMarkIcon
                    className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      const removedSortConfig = sortColumns[index];
                      setSortColumns((prev) => {
                        const updated = [...prev];
                        updated.splice(index, 1);
                        return updated;
                      });
                      if (removedSortConfig) {
                        const [colNameToRemove] = removedSortConfig;
                        const columnDef = columns.find(c => c.name === colNameToRemove);
                        if (columnDef) {
                          onSortColumn(columnDef, undefined); // Signal removal of sort
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex py-1">
          <button
            onClick={onAddSortColumn}
            className="
              flex px-2 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 items-center cursor-pointer
            "
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add another sort
          </button>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}