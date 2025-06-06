"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Switch } from "radix-ui"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"

export interface FieldItem {
  id: string
  name: string
  icon: React.ReactNode
  enabled: boolean
}

export interface ToggleFieldSectionProps {
  fields: FieldItem[]
  onFieldToggle: (fieldId: string, enabled: boolean) => void
  onShowAll: () => void
  onHideAll: () => void
  // onFieldAction?: (fieldId: string, action: string) => void
  searchPlaceholder?: string
  className?: string
}

// const defaultFields: FieldItem[] = [
//   { id: "notes", name: "Notes", icon: <AlignLeft className="w-4 h-4" />, enabled: true },
//   { id: "assignee", name: "Assignee", icon: <User className="w-4 h-4" />, enabled: true },
//   { id: "status", name: "Status", icon: <CheckCircle className="w-4 h-4" />, enabled: true },
//   { id: "attachments", name: "Attachments", icon: <Folder className="w-4 h-4" />, enabled: true },
//   { id: "attachment-summary", name: "Attachment Summary", icon: <FileText className="w-4 h-4" />, enabled: true },
//   { id: "number", name: "Number", icon: <Hash className="w-4 h-4" />, enabled: true },
// ]

export function ToggleFieldSection({
  fields = [],
  onFieldToggle,
  onShowAll,
  onHideAll,
  // onFieldAction,
  searchPlaceholder = "Find a field",
  className = "",
}: ToggleFieldSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields
    return fields.filter((field) => field.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [fields, searchQuery])

  const handleFieldToggle = (fieldId: string, enabled: boolean) => {
    onFieldToggle(fieldId, enabled)
  }

  // const handleFieldAction = (fieldId: string, action: string) => {
  //   onFieldAction?.(fieldId, action)
  // }

  return (
    <div className={`w-full max-w-md p-2 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Search Header */}
      <div className="border-b border-gray-100">
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border-0 focus:outline-none focus:ring-0 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Field List */}
      <div className="py-2">
        {filteredFields.map((field) => (
          <div key={field.id} className="flex items-center gap-3 px-2 py-1 hover:bg-gray-50 transition-colors">
            {/* Toggle Switch */}
            <Switch.Root
              checked={field.enabled}
              onCheckedChange={(checked) => handleFieldToggle(field.id, checked)}
              className="
                w-7 h-4 bg-gray-200 rounded-full relative 
                data-[state=checked]:bg-green-500 transition-colors duration-200 ease-in-out 
                focus:outline-none focus:ring-1 focus:ring-green-500 focus:ring-offset-2
              "
            >
              <Switch.Thumb
                className="
                  block w-3 h-3 bg-white rounded-full shadow-lg 
                  transform transition-transform duration-200 ease-in-out translate-x-0.5
                  data-[state=checked]:translate-x-[15px]
                "
              />
            </Switch.Root>

            {/* Field Icon */}
            <div
              className="text-gray-600 flex-shrink-0"
            >
              {field.icon}
            </div>

            {/* Field Name */}
            <span
              className="flex-1 text-sm font-medium text-gray-900"
            >
              {field.name}
            </span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex border-t border-gray-100">
        <button
          onClick={onHideAll}
          className="
            flex-1 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 
            transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300
          "
        >
          Hide all
        </button>
        <div className="w-px bg-gray-200" />
        <button
          onClick={onShowAll}
          className="flex-1 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300"
        >
          Show all
        </button>
      </div>
    </div>
  )
}