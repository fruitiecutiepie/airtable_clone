import React from "react"
import Link from "next/link"

type PopoverItemLink = {
  icon: React.ElementType<{ className?: string }>
  text: string
  href: string
  onClick?: never
}

type PopoverItemButton = {
  icon: React.ElementType<{ className?: string }>
  text: string
  onClick: () => void
  href?: never
}

type PopoverItem = PopoverItemLink | PopoverItemButton

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
      const Icon = item.icon
      return item.href ? (
        <div
          key={i}
          className="flex items-center justify-center p-2 cursor-pointer hover:bg-gray-100 gap-2 rounded"
        >
          <Icon
            className="inline-flex items-center justify-center h-4 w-4"
          />
          <Link
            href={item.href}
            className="h-full w-full"
          >
            {item.text}
          </Link>
        </div>
      ) : (
        <button
          key={i}
          onClick={item.onClick}
          className="flex items-center p-2 cursor-pointer hover:bg-gray-100 gap-2 rounded"
          type="button"
        >
          <Icon
            className="inline-flex items-center justify-center h-4 w-4"
          />
          {item.text}
        </button>
      )
    })}
  </div>
)
