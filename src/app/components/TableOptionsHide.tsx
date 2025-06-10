"use client"

import type React from "react"
import { useMemo, useCallback, useState } from "react"
import { Popover } from "radix-ui"
import { CalendarIcon, EyeSlashIcon, HashtagIcon } from "@heroicons/react/24/outline"
import { Button } from "./ui/Button"
import type { TableColumn } from "~/lib/schemas"
import { ToggleFieldSection, type FieldItem } from "./ToggleFieldSection"
import { LetterCaseCapitalizeIcon, CheckboxIcon, QuestionMarkIcon } from "@radix-ui/react-icons"

export interface TableOptionsHideProps {
  columns: TableColumn[]
  hiddenColumnIds: Set<number>
  setHiddenColumnIds: React.Dispatch<React.SetStateAction<Set<number>>>,
  handleColumnToggle: (columnId: string, enabled: boolean) => void,
}

export function TableOptionsHide({
  columns,
  hiddenColumnIds,
  setHiddenColumnIds,
  handleColumnToggle,
}: TableOptionsHideProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const fields: FieldItem[] = useMemo(
    () =>
      columns.map((col) => ({
        id: col.columnId.toString(),
        name: col.name,
        enabled: !hiddenColumnIds.has(col.columnId),
        icon: col.dataType === "text" ? <LetterCaseCapitalizeIcon className="w-4 h-4" /> :
          col.dataType === "numeric" ? <HashtagIcon className="w-4 h-4" /> :
            col.dataType === "date" ? <CalendarIcon className="w-4 h-4" /> :
              col.dataType === "boolean" ? <CheckboxIcon className="w-4 h-4" /> :
                <QuestionMarkIcon className="w-4 h-4" />,
      })),
    [columns, hiddenColumnIds]
  );

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields
    return fields.filter((field) => field.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [fields, searchQuery])

  const handleShowAll = useCallback(() => {
    setHiddenColumnIds(new Set())
  }, [setHiddenColumnIds]);

  const handleHideAll = useCallback(() => {
    setHiddenColumnIds(new Set(columns.map((c) => c.columnId)));
  }, [columns, setHiddenColumnIds]);

  // const handleFieldAction = (fieldId: string, action: string) => {
  //   console.log(`Action "${action}" triggered for field "${fieldId}"`)
  //   // Handle field actions like edit, duplicate, delete
  // }

  return (
    <Popover.Root>
      <Popover.Trigger
        asChild
      >
        <Button
          variant="ghost"
          size="xs"
          className={`hover:bg-gray-200 text-gray-700
            ${hiddenColumnIds.size > 0 && "bg-blue-200 hover:bg-blue-200 border border-blue-200 hover:border-blue-300"}`}
        >
          <EyeSlashIcon className="w-4 h-4 mr-1" />
          Hide fields
        </Button>
      </Popover.Trigger>
      <Popover.Content
        sideOffset={5}
        align="start"
        className="shadow-xl text-xs min-w-72 text-gray-700 z-20"
      >
        <ToggleFieldSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredFields={filteredFields}
          onFieldToggle={handleColumnToggle}
          onShowAll={handleShowAll}
          onHideAll={handleHideAll}
        // onFieldAction={handleFieldAction}
        />
      </Popover.Content>
    </Popover.Root>
  )
}