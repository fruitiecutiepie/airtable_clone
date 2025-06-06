"use client";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button } from "~/app/components/ui/Button";
import { redirect } from "next/navigation";
import { BarChartIcon, CalendarIcon, CaretDownIcon, CheckboxIcon, ImageIcon, LetterCaseCapitalizeIcon, ListBulletIcon, MagnifyingGlassIcon, Pencil1Icon, PlusIcon, QuestionMarkIcon, TrashIcon } from "@radix-ui/react-icons";
import TablePageHeader from "./TablePageHeader";
import { useTables } from "../../hooks/useTables";
import TableView from "./TableView";
import { ContextMenu, DropdownMenu, Popover, Separator } from "radix-ui";
import { PopoverSection, type PopoverItem, type PopoverSectionProps } from "~/app/components/ui/PopoverSection";
import { AdjustmentsHorizontalIcon, ArrowsUpDownIcon, ArrowTopRightOnSquareIcon, Bars3Icon, EyeSlashIcon, HashtagIcon, SwatchIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import type { PageParams } from "~/lib/schemas";
import { useSavedFilters } from "~/app/hooks/useSavedFilters";
import { ToggleFieldSection, type FieldItem } from "~/app/components/ToggleFieldSection";
import { SidebarContext } from "./[viewId]/layout";
import { useColumns } from "~/app/hooks/useColumns";

interface TablePageProps {
  baseId: number,
  tableId: number,
  viewId: number
}

export default function TablePage({
  baseId,
  tableId,
  viewId
}: TablePageProps) {
  const { sideBarOpen, setSidebarOpen } = useContext(SidebarContext);

  const [search, setSearch] = useState("");
  const [pageParams, setPageParams] = useState<PageParams>({ pageSize: 50 });
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<number>>(new Set());
  const [viewSearchInput, setViewSearchInput] = useState("");

  const {
    tables,
    tablesError,
    tablesLoading,
    onAddTable,
    onUpdTable,
    onDelTable
  } = useTables(baseId);

  const {
    columns,
    columnsError,
    columnsIsLoading,

    onAddCol,
    onUpdCol,
    onDelCol,
  } = useColumns(baseId, tableId, setPageParams);

  const {
    filters,
    filtersError,
    filtersLoading,
    onApplyFilter,
    onSetFilter,
    onDelFilter,
  } = useSavedFilters(baseId, tableId, setPageParams);

  useEffect(() => {
    if (!filtersLoading) {
      const fv = filters.find((f) => f.filterId === viewId);
      if (fv) onApplyFilter(fv);
    }
  }, [filters, viewId, onApplyFilter, filtersLoading]);

  const filteredViews = useMemo(
    () =>
      filters.filter((f) =>
        f.name.toLowerCase().includes(viewSearchInput.toLowerCase())
      ),
    [filters, viewSearchInput]
  );

  const onSaveFilterClick = useCallback(async () => {
    const name = prompt("Name this filter set");
    if (!name) return;
    const newView = await onSetFilter(
      undefined,
      name,
      pageParams.filters ?? {}
    );
    if (newView?.filterId) {
      onApplyFilter(newView);
      redirect(`/${baseId}/${tableId}/${newView.filterId}`);
    }
  }, [onSetFilter, onApplyFilter, pageParams.filters, baseId, tableId]);

  const editTableSections: PopoverSectionProps[] = useMemo(() => [
    {
      title: undefined,
      items: [
        {
          icon: Pencil1Icon,
          text: "Rename table",
          onClick: async () => {
            const tableName = tables.find(t => t.id === tableId)?.name;
            const newName = prompt("Rename table", tableName);
            if (newName && newName !== tableName) {
              await onUpdTable(tableId, newName);
            }
          }
        },
        // {
        //   icon: EyeSlashIcon,
        //   text: "Hide table",
        //   onClick: () => {
        //     // onHideTable(table);
        //   }
        // },
        {
          separator: true,
        },
        {
          icon: TrashIcon,
          text: "Delete table",
          textColorClass: "text-red-700",
          onClick: async () => {
            if (!confirm("Are you sure you want to delete this table?")) return;
            await onDelTable(tableId);
          }
        }
      ]
    },
  ], [onDelTable, onUpdTable, tableId, tables]);

  const editViewSections: PopoverSectionProps[] = useMemo(() => [
    {
      title: undefined,
      items: [
        {
          icon: Pencil1Icon,
          text: "Rename view",
          onClick: async () => {
            const filter = filters?.find(f => f.filterId === viewId);
            if (!filter) return;
            const newName = prompt("Rename view", filter.name ?? "New view");
            if (newName) {
              const renamedFilter = await onSetFilter(
                filter.filterId,
                newName,
                pageParams.filters ?? {}
              );
              onApplyFilter(renamedFilter);
            }
          }
        },
        {
          separator: true,
        },
        {
          icon: TrashIcon,
          text: "Delete view",
          textColorClass: "text-red-700",
          disabled: true,
          onClick: async () => {
            if (!confirm("Are you sure you want to delete this view?")) return;
            await onDelFilter(viewId);
            redirect(`/${baseId}/${tableId}/${filters?.[0]?.filterId}`);
          }
        }
      ]
    },
  ], [baseId, filters, onApplyFilter, onDelFilter, onSetFilter, pageParams.filters, tableId, viewId]);

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

  const handleColumnToggle = useCallback((columnId: string, enabled: boolean) => {
    setHiddenColumnIds((prev) => {
      const copy = new Set(prev);
      const cid = Number(columnId);
      if (enabled) {
        copy.delete(cid)
      } else {
        copy.add(cid);
      }
      return copy;
    });
  }, []);

  const handleShowAll = useCallback(() => {
    setHiddenColumnIds(new Set())
  }, []);

  const handleHideAll = useCallback(() => {
    setHiddenColumnIds(new Set(columns.map((c) => c.columnId)));
  }, [columns]);

  const handleFieldAction = (fieldId: string, action: string) => {
    console.log(`Action "${action}" triggered for field "${fieldId}"`)
    // Handle field actions like edit, duplicate, delete
  }

  return (
    <div className="flex flex-col w-full h-full max-h-screen">
      <TablePageHeader />
      <div
        className="flex flex-row justify-between items-center px-2 bg-purple-700"
      >
        <div
          className="flex flex-row gap-2 w-full h-8"
        >
          <div
            className="flex items-center rounded-t-md w-full h-full bg-purple-800"
          >
            {tables?.map(t => {
              return (
                <Button
                  key={t.id}
                  onClick={() => redirect(`/${baseId}/${t.id}/${viewId}`)}
                  className={`w-fit gap-1 text-gray-800 rounded-b-none rounded-t-sm h-8
                  ${tableId === t.id ? "bg-white hover:bg-white" : "bg-purple-800 text-white hover:bg-purple-900"}
                `}
                >
                  {t.name}
                  <Popover.Root>
                    <Popover.Trigger
                      asChild
                      className={`
                      h-6 w-6 inline-flex items-center justify-center cursor-pointer
                    `}
                    >
                      <CaretDownIcon
                        className={`w-6 h-6 text-gray-500 shrink-0
                        ${tableId === t.id ? "text-gray-800" : "text-white opacity-70"}
                      `}
                      />
                    </Popover.Trigger>
                    <Popover.Content
                      sideOffset={8}
                      align="end"
                      className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-sm text-gray-700 z-20"
                    >
                      {editTableSections.map((section, index) => (
                        <PopoverSection
                          key={index}
                          title={section.title}
                          items={section.items}
                        />
                      ))}
                    </Popover.Content>
                  </Popover.Root>
                </Button>
              )
            })}
            <div
              className="h-8 w-8 flex items-center justify-center"
            >
              <PlusIcon
                className="w-5 h-5 text-gray-100 cursor-pointer"
                onClick={onAddTable}
              />
            </div>
          </div>
          <div
            className="flex items-center gap-2 text-gray-100 rounded-t-md bg-purple-800 px-2"
          >
            <Button
              variant="ghost"
              size="xs"
              className="hover:text-white hover:bg-inherit text-gray-100 cursor-pointer"
            >
              Extensions
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="hover:text-white hover:bg-inherit text-gray-100 cursor-pointer"
            >
              Tools
            </Button>
          </div>
        </div>
      </div>
      {/* Toolbar */}
      <div
        className="bg-white border-b border-gray-300 px-2 h-12 text-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            className={`
              hover:bg-gray-200 text-gray-700 active:outline active:outline-gray-300
              ${sideBarOpen && "bg-gray-200"}  
            `}
            onClick={() => setSidebarOpen(!sideBarOpen)}
          >
            <Bars3Icon className="w-4 h-4 mr-2" />
            Views
          </Button>

          <div
            className="w-px h-5 bg-gray-300 mx-2 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px"
          />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="ghost"
                size="xs"
                className="hover:bg-gray-100 text-gray-700 gap-1 font-semibold"
              >
                <TableCellsIcon className="w-4 h-4 mr-1" />
                {`${filters?.find(f => f.filterId === viewId)?.name ?? "Default view name"}`}
                <CaretDownIcon className="w-6 h-6 text-gray-500 shrink-0" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              className="bg-white shadow-xl px-2 py-3 rounded-lg w-64 border border-gray-300 text-xs
                fixed mt-1 z-20
                origin-top-left
              "
              sideOffset={5}
              align="start"
            >
              {editViewSections.map((section, sectionIdx) => (
                <div key={`context-section-${sectionIdx}`} className="flex flex-col">
                  {section.title && (
                    <p className="m-2 text-gray-400 text-[11px]">{section.title}</p>
                  )}
                  {section.items.map((item: PopoverItem, itemIdx: number) => {
                    if (item.separator) {
                      return <DropdownMenu.Separator
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
                      <DropdownMenu.Item
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
                      </DropdownMenu.Item>
                    );
                  })}
                </div>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <div
            className="w-px h-5 bg-gray-300 mx-2 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px"
          />

          <div>
            <Popover.Root>
              <Popover.Trigger
                asChild
              >
                <Button
                  variant="ghost"
                  size="xs"
                  className="hover:bg-gray-100 text-gray-700"
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
                  fields={fields}
                  onFieldToggle={handleColumnToggle}
                  onShowAll={handleShowAll}
                  onHideAll={handleHideAll}
                  onFieldAction={handleFieldAction}
                />
              </Popover.Content>
            </Popover.Root>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-100 text-gray-700"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
            Filter
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-100 text-gray-700"
          >
            <ArrowsUpDownIcon className="w-4 h-4 mr-1" />
            Sort
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-100 text-gray-700"
          >
            <SwatchIcon className="w-4 h-4 mr-1" />
            Color
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-100 text-gray-700"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
            Share and sync
          </Button>
        </div>
      </div>
      <div
        className="flex flex-row h-svh overflow-hidden"
      >
        {/* Sidebar */}
        {sideBarOpen &&
          <div className="min-w-72 max-w-72 h-full bg-white border-r border-gray-300 flex flex-col">
            <div className="p-4 w-full h-full justify-between">

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
                          <TableCellsIcon className="w-4 h-4 mr-2" />
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
                    </ContextMenu.Root >
                  ))}
                </div>
              </div>

              <Separator.Root className="my-4 bg-gray-300 h-px" />

              <div className="space-y-2 px-2">
                <div className="tracking-wide py-2"
                >
                  Create...
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    <TableCellsIcon className="w-4 h-4 mr-2" />
                    Grid
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Calendar
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Gallery
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    <BarChartIcon className="w-4 h-4 mr-2" />
                    Kanban
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    <ListBulletIcon className="w-4 h-4 mr-2" />
                    Timeline
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    <ListBulletIcon className="w-4 h-4 mr-2" />
                    List
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
                <div
                  className="flex items-center justify-between hover:bg-gray-100"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-gray-700 w-full justify-start hover:bg-gray-100"
                  >
                    New section
                  </Button>
                  <PlusIcon className="w-5 h-5 text-gray-500 cursor-pointer mx-2" />
                </div>
              </div>
            </div>
          </div>
        }

        <div>
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <TableView
              baseId={baseId}
              tableId={tableId}

              search={search}
              setSearch={setSearch}
              pageParams={pageParams}
              setPageParams={setPageParams}

              onSaveFilterClick={onSaveFilterClick}

              hiddenColumnIds={hiddenColumnIds}
              handleColumnToggle={handleColumnToggle}
              columns={columns}
              onAddCol={onAddCol}
              onUpdCol={onUpdCol}
              onDelCol={onDelCol}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
