'use client';
import { ContextMenu, Popover } from "radix-ui";
import { AdjustmentsHorizontalIcon, BarsArrowDownIcon, BarsArrowUpIcon, EyeSlashIcon, HashtagIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline"
import React from 'react';
import type { TableColumn } from '~/lib/schemas';
import { CaretDownIcon, CheckboxIcon, LetterCaseCapitalizeIcon, Pencil1Icon, Pencil2Icon } from "@radix-ui/react-icons";
import { PopoverSection, type PopoverItem, type PopoverSectionProps } from "~/app/components/ui/PopoverSection";
import { redirect } from "next/navigation";

interface TableHeaderProps {
  col: TableColumn;
}

export default function TableHeader({
  col
}: TableHeaderProps) {
  const headerSections: PopoverSectionProps[] = [
    {
      title: undefined,
      items: [
        {
          icon: Pencil1Icon,
          text: "Edit field",
          onClick: () => {
            // onUpdateColumn(col);
          }
        },
        {
          separator: true,
        },
        {
          icon: BarsArrowDownIcon,
          text: "Sort A -> Z",
          onClick: () => {
            // onSortColumn(col, "asc");
          }
        },
        {
          icon: BarsArrowUpIcon,
          text: "Sort Z -> A",
          onClick: () => {
            // onSortColumn(col, "desc");
          }
        },
        {
          separator: true,
        },
        {
          icon: AdjustmentsHorizontalIcon,
          onClick: () => {
            // onFilterColumn(col);
          },
          text: "Filter by this field",
        },
        {
          separator: true,
        },
        {
          icon: EyeSlashIcon,
          text: "Hide field",
          onClick: () => {
            // onHideColumn(col);
          }
        },
        {
          icon: TrashIcon,
          text: "Delete field",
          textColorClass: "text-red-700",
          onClick: () => {
            // onDeleteColumn(col);
          }
        }
      ]
    },
  ];

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          className="
            flex p-2 items-center gap-2 bg-stone-100 w-60 h-8 justify-between
            hover:bg-stone-200 cursor-pointer border border-gray-300
          ">
          <div
            className="flex items-center justify-center gap-2 px-2 text-gray-700 max-w-5/6"
          >
            {col.dataType === "text" ? (
              <LetterCaseCapitalizeIcon className="w-4 h-4 text-gray-600 shrink-0" />
            ) : col.dataType === "numeric" ? (
              <HashtagIcon className="w-4 h-4 text-gray-600 shrink-0" />
            ) : col.dataType === "date" ? (
              <BarsArrowUpIcon className="w-4 h-4 text-gray-600 shrink-0" />
            ) : col.dataType === "boolean" ? (
              <CheckboxIcon className="w-4 h-4 text-gray-600 shrink-0" />
            ) : (
              <TrashIcon className="w-4 h-4 text-gray-600 shrink-0" />
            )}
            <p className="truncate overflow-hidden text-sm">
              {col.name}
            </p>
          </div>
          <Popover.Root>
            <Popover.Trigger
              asChild
              className={`
                 h-6 w-6 inline-flex items-center justify-center cursor-pointer
              `}
            >
              <CaretDownIcon
                className="w-6 h-6 text-gray-500 shrink-0"
              />
            </Popover.Trigger>
            <Popover.Content
              sideOffset={3}
              align="end"
              className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-sm text-gray-700"
            >
              {headerSections.map((section, index) => (
                <PopoverSection
                  key={index}
                  title={section.title}
                  items={section.items}
                />
              ))}
            </Popover.Content>
          </Popover.Root>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs
            fixed mt-1 z-50
            origin-top-left
          "
        >
          {headerSections.map((section, sectionIdx) => (
            <div key={`context-section-${sectionIdx}`} className="flex flex-col">
              {section.title && (
                <p className="m-2 text-gray-400 text-[11px]">{section.title}</p>
              )}
              {section.items.map((item: PopoverItem, itemIdx: number) => {
                if (item.separator) {
                  return <ContextMenu.Separator key={`context-item-${sectionIdx}-${itemIdx}`} className="my-2 mx-2 h-px bg-gray-200" />;
                }

                const Icon = item.icon;
                // Links are inline-flex, buttons take full width
                const itemClasses = `
                  flex items-center p-2 gap-2 rounded
                  cursor-pointer data-[highlighted]:bg-gray-100 outline-none
                  text-sm leading-none
                  ${item.href ? '' : 'w-full text-left'} 
                `;

                const handleSelect = () => {
                  if (item.href) {
                    redirect(item.href);
                  } else if (item.onClick) {
                    item.onClick();
                  }
                };

                return (
                  <ContextMenu.Item
                    key={`context-item-${sectionIdx}-${itemIdx}`}
                    className={itemClasses}
                    onSelect={handleSelect}
                  >
                    {Icon && <Icon className="inline-flex items-center justify-center h-4 w-4 shrink-0" />}
                    <span className={`${item.textColorClass ?? 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </ContextMenu.Item>
                );
              })}
            </div>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
