"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { TableCellsIcon } from "@heroicons/react/24/outline"
import { Button } from "./ui/Button"
import { type SavedFilter } from "~/lib/schemas"
import { PlusIcon, CaretDownIcon, BarChartIcon, CalendarIcon, ImageIcon, ListBulletIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { ContextMenu, Separator } from "radix-ui"
import { redirect } from "next/navigation"
import type { PopoverItem, PopoverSectionProps } from "./ui/PopoverSection"

export interface TableSidebarProps {
  baseId: number
  tableId: number
  viewId: number
  filters: SavedFilter[]
  editViewSections: PopoverSectionProps[]
  onApplyFilter: (filter: SavedFilter) => void
}

export function TableSidebar({
  baseId,
  tableId,
  viewId,
  filters,
  editViewSections,
  onApplyFilter
}: TableSidebarProps) {
  const [viewSearchInput, setViewSearchInput] = useState("");
  const [sideBarCreateOpen, setSideBarCreateOpen] = useState(true);

  const filteredViews = useMemo(
    () =>
      filters.filter((f) =>
        f.name.toLowerCase().includes(viewSearchInput.toLowerCase())
      ),
    [filters, viewSearchInput]
  );

  return (
    <div className="min-w-72 max-w-72 h-full bg-white border-r border-gray-300 flex flex-col">
      <div className="p-4 w-full h-full flex flex-col justify-between">

        <div className="flex flex-col">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={viewSearchInput}
              onChange={e => setViewSearchInput(e.target.value)}
              className="pl-9 text-sm text-gray-700 px-3 py-1.5 h-full rounded-md w-full outline-none focus:outline-none ring-0"
              placeholder="Find a view"
            />
          </div>

          <Separator.Root className="my-4 bg-gray-300 h-px" />

          <div className="px-2 min-h-[675px]">
            {filteredViews.length === 0 && (
              <div className="text-gray-500 text-sm">
                No saved views.
              </div>
            )}
            {filteredViews.map(f => (
              <ContextMenu.Root
                key={f.filterId}
              >
                <ContextMenu.Trigger
                  asChild
                >
                  <Button
                    size="sm"
                    className={`justify-start w-full text-gray-700 ${f.filterId === viewId
                      ? "bg-sky-100 hover:bg-sky-200" : "bg-white hover:bg-gray-100"
                      }`}
                    onClick={() => {
                      if (f.filterId === viewId) return;
                      onApplyFilter(f);
                      redirect(`/${baseId}/${tableId}/${f.filterId}`)
                    }}
                  >
                    <TableCellsIcon className="w-4 h-4 mr-2 text-blue-500" />
                    {f.name}
                  </Button>
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                  <ContextMenu.Content
                    className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs
                      fixed mt-1 z-20
                      origin-top-left
                    "
                  >
                    {editViewSections.map((section, sectionIdx) => (
                      <div key={`context-section-${sectionIdx}`} className="flex flex-col">
                        {section.title && (
                          <p className="m-2 text-gray-400 text-[11px]">{section.title}</p>
                        )}
                        {section.items.map((item: PopoverItem, itemIdx: number) => {
                          if (item.separator) {
                            return <ContextMenu.Separator
                              key={`context-item-${sectionIdx}-${itemIdx}`}
                              className="my-2 mx-2 h-px bg-gray-200"
                            />;
                          }

                          const isDisabled = item.disabled ?? false;
                          const tooltip = isDisabled
                            ? "You can’t delete the only remaining view. Create another view first."
                            : undefined;
                          const Icon = item.icon;
                          // Links are inline-flex, buttons take full width
                          const itemClasses = `
                            flex items-center p-1 px-2 gap-2 rounded
                            ${isDisabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer data-[highlighted]:bg-gray-100'
                            }
                            outline-none text-xs leading-none
                            ${item.href ? '' : 'w-full text-left'} 
                          `;

                          const handleSelect = async () => {
                            if (isDisabled) return;
                            if (item.href) {
                              redirect(item.href);
                            } else if (item.onClick) {
                              await item.onClick();
                            }
                          };

                          return (
                            <ContextMenu.Item
                              key={`context-item-${sectionIdx}-${itemIdx}`}
                              disabled={isDisabled}
                              className={itemClasses}
                              onSelect={handleSelect}
                              title={tooltip}
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
            ))}
          </div>
        </div>


        <div className="sticky bottom-0 left-0 px-2">
          <Separator.Root className="my-2 bg-gray-200 h-px" />
          <div
            className="flex items-center justify-between tracking-wide py-2 cursor-pointer"
            onClick={() => setSideBarCreateOpen(!sideBarCreateOpen)}
          >
            <span>Create...</span>
            <CaretDownIcon
              className={`w-5 h-5 text-gray-500 transform transition-transform duration-200 ${sideBarCreateOpen ? "" : "-rotate-90"
                }`}
            />
          </div>
          {sideBarCreateOpen && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    <TableCellsIcon className="w-4 h-4 mr-2 text-blue-500" />
                    Grid
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    <CalendarIcon className="w-4 h-4 mr-2 text-red-600" />
                    Calendar
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    <ImageIcon className="w-4 h-4 mr-2 text-purple-500" />
                    Gallery
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    <BarChartIcon className="w-4 h-4 mr-2 text-green-600" />
                    Kanban
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    <ListBulletIcon className="w-4 h-4 mr-2 text-red-600" />
                    Timeline
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    <ListBulletIcon className="w-4 h-4 mr-2 text-blue-500" />
                    List
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div className="flex items-center justify-between hover:bg-gray-100">
                  <Button variant="ghost" size="xs" className="text-gray-700 w-full justify-start hover:bg-gray-100">
                    New section
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
