"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { DropdownMenu } from "radix-ui"
import { CalendarIcon, CheckboxIcon, LetterCaseCapitalizeIcon, QuestionMarkIcon } from "@radix-ui/react-icons"
import { SearchInput } from "./ui/SearchInput"
import { ArrowsUpDownIcon, HashtagIcon } from "@heroicons/react/24/outline"
import { Button } from "./ui/Button"
import type { TableColumn } from "~/lib/schemas"

export interface TableOptionsSortProps {
  columns: TableColumn[]
  onSortColumn: (column: TableColumn, direction: "asc" | "desc" | undefined) => void
}

export function TableOptionsSort({
  columns,
  onSortColumn
}: TableOptionsSortProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns
    return columns.filter((column) => column.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [columns, searchQuery])

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

        {filteredColumns.map(col => (
          <DropdownMenu.Item
            key={col.columnId}
            onSelect={() => onSortColumn(col, "asc")}
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