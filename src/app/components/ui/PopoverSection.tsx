import React, { useMemo, useState } from "react"
import Link from "next/link"
import { SearchInput } from "./SearchInput"

type PopoverItemLink = {
  icon?: React.ElementType<{ className?: string }>
  text: string
  href: string
  onClick?: never
  separator?: never
  textColorClass?: string
  disabled?: boolean
}

type PopoverItemButton = {
  icon?: React.ElementType<{ className?: string }>
  text: string
  onClick: () => Promise<void> | void
  href?: never
  separator?: never
  textColorClass?: string
  disabled?: boolean
}

type PopoverItemSeparator = {
  icon?: never
  text?: never
  href?: never
  onClick?: never
  separator: true
  textColorClass?: string
}

export type PopoverItem = PopoverItemLink | PopoverItemButton | PopoverItemSeparator

export interface PopoverSectionProps {
  title: string | undefined
  items: PopoverItem[]
  search: boolean,
  searchPlaceholder?: string
}

export const PopoverSection: React.FC<PopoverSectionProps> = ({
  title,
  items,
  search,
  searchPlaceholder = "Search...",
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    return items.filter((item) => item.text?.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [items, searchQuery])

  return (
    <div className="flex flex-col">
      {search && (
        <div className="px-2">
          <SearchInput
            searchPlaceholder={searchPlaceholder}
            value={searchQuery}
            onChange={setSearchQuery}
            size="sm"
          />
        </div>
      )}
      {title && (
        <p className="m-2 text-gray-400 text-[11px]">{title}</p>
      )}
      {filteredItems.map((item, i) => {
        if (item.separator) {
          return <hr key={i} className="m-2 border-gray-200" />
        }

        const Icon = item.icon;
        const itemTextColor = item.textColorClass ?? 'inherit';
        const isDisabled = item.disabled ?? false;

        const base = 'flex items-center p-2 gap-2 rounded'
        const stateClasses = isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-gray-100'
        const className = `${base} ${stateClasses}`

        if ('href' in item && item.href && !isDisabled) {
          return (
            <Link
              key={i}
              href={item.href}
              className={className}
              aria-disabled={false}
            >
              {Icon && <Icon className="inline-flex h-4 w-4" />}
              <span className={itemTextColor}>{item.text}</span>
            </Link>
          )
        }

        // fallback for button or disabled link
        return (
          <div
            key={i}
            onClick={isDisabled ? undefined : (item as PopoverItemButton).onClick}
            className={className}
            aria-disabled={isDisabled}
          >
            {Icon && <Icon className="inline-flex h-4 w-4" />}
            <span className={itemTextColor}>{item.text}</span>
          </div>
        )
      })}
    </div>
  )
}
