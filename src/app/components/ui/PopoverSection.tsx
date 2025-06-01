import React from "react"
import Link from "next/link"

type PopoverItemLink = {
  icon?: React.ElementType<{ className?: string }>
  text: string
  href: string
  onClick?: never
  separator?: never
  textColorClass?: string
}

type PopoverItemButton = {
  icon?: React.ElementType<{ className?: string }>
  text: string
  onClick: () => void
  href?: never
  separator?: never
  textColorClass?: string
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
}

export const PopoverSection: React.FC<PopoverSectionProps> = ({ title, items }) => (
  <div className="flex flex-col">
    {title && (
      <p className="m-2 text-gray-400 text-[11px]">{title}</p>
    )}
    {items.map((item, i) => {
      if (item.separator) {
        return <hr key={i} className="m-2 border-gray-200" />
      }

      const Icon = item.icon;
      const itemTextColor = item.textColorClass ?? 'inherit';

      return item.href ? (
        <Link
          key={i}
          href={item.href}
          className="flex items-center p-2 cursor-pointer hover:bg-gray-100 gap-2 rounded"
        >
          {Icon && (
            <Icon
              className="inline-flex items-center justify-center h-4 w-4"
            />
          )}
          <span className={itemTextColor}>{item.text}</span>
        </Link>
      ) : (
        <button
          key={i}
          onClick={item.onClick}
          className="flex items-center p-2 cursor-pointer hover:bg-gray-100 gap-2 rounded"
          type="button"
        >
          {Icon && (
            <Icon
              className="inline-flex items-center justify-center h-4 w-4"
            />
          )}
          <span className={itemTextColor}>{item.text}</span>
        </button>
      )
    })}
  </div>
)
