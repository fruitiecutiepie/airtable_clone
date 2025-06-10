"use client";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button } from "~/app/components/ui/Button";
import { redirect } from "next/navigation";
import { CaretDownIcon, ChevronRightIcon, FileIcon, FileTextIcon, MagnifyingGlassIcon, Pencil1Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import TablePageHeader from "./TablePageHeader";
import { useTables } from "../../hooks/useTables";
import TableView from "./TableView";
import { DropdownMenu, Popover } from "radix-ui";
import { PopoverSection, type PopoverItem, type PopoverSectionProps } from "~/app/components/ui/PopoverSection";
import { ArrowTopRightOnSquareIcon, Bars3Icon, BookOpenIcon, SwatchIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import type { PageParams, TableColumn } from "~/lib/schemas";
import { useSavedFilters } from "~/app/hooks/useSavedFilters";
import { useColumns } from "~/app/hooks/useColumns";
import { SidebarContext } from "./SidebarContext";
import Image from "next/image";
import { TableOptionsSort } from "~/app/components/TableOptionsSort";
import { TableOptionsHide } from "~/app/components/TableOptionsHide";
import { TableOptionsFilter } from "~/app/components/TableOptionsFilter";
import { useTableSearch } from "~/app/hooks/useTableSearch";
import { fetcher } from "~/lib/fetcher";
import { Cross2Icon } from "@radix-ui/react-icons";
import { TableSidebar } from "~/app/components/TableSidebar";

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

  const [is100kRowsLoading, setIs100kRowsLoading] = useState(false);
  const [jobId, setJobId] = useState<string | undefined>(undefined);

  const {
    tables,
    // tablesError,
    // tablesLoading,
    onAddTable,
    onUpdTable,
    onDelTable
  } = useTables(baseId);

  const {
    columns,
    // columnsError,
    // columnsIsLoading,

    onAddCol,
    onUpdCol,
    onDelCol,
  } = useColumns(baseId, tableId, setPageParams);

  const {
    filters,
    // filtersError,
    filtersLoading,
    onApplyFilter,
    onSetFilter,
    onDelFilter,
  } = useSavedFilters(baseId, tableId, setPageParams);

  const {
    liveSearchInput,
    setLiveSearchInput
  } = useTableSearch(
    search,
    setSearch,
    setPageParams
  );

  const onAdd100kRowsClick = useCallback(async () => {
    setIs100kRowsLoading(true);
    const { jobId } = await fetcher<{ jobId: string }>(
      `/api/${baseId}/${tableId}/rows/100k`,
      { method: "POST" }
    );
    setJobId(jobId);
  }, [baseId, tableId]);

  useEffect(() => {
    if (!filtersLoading) {
      const fv = filters.find((f) => f.filterId === viewId);
      if (fv) onApplyFilter(fv);
    }
  }, [filters, viewId, onApplyFilter, filtersLoading]);

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
      search: false,
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
          disabled: tables.length <= 1,
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
      search: false,
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
          disabled: filters?.length <= 1,
          onClick: async () => {
            if (!confirm("Are you sure you want to delete this view?")) return;
            await onDelFilter(viewId);
            redirect(`/${baseId}/${tableId}/${filters?.[0]?.filterId}`);
          }
        }
      ],
    },
  ], [baseId, filters, onApplyFilter, onDelFilter, onSetFilter, pageParams.filters, tableId, viewId]);

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

  const onSortColumn = useCallback((column: TableColumn, direction: "asc" | "desc" | undefined) => {
    setPageParams(p => ({
      ...p,
      cursor: undefined, // Reset cursor when sorting changes
      sortCol: column.name,
      sortDir: direction,
    }));
  }, [setPageParams]);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      <TablePageHeader
        baseId={baseId}
      />
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
                <Popover.Root
                  key={t.id}
                >
                  <Popover.Trigger
                    asChild
                    className={`
                      h-6 w-6 inline-flex items-center justify-center cursor-pointer
                    `}
                  >
                    <Button
                      onClick={() => {
                        if (tableId === t.id) return;
                        redirect(`/${baseId}/${t.id}/${viewId}`)
                      }}
                      className={`w-fit gap-1 text-gray-800 rounded-b-none rounded-t-sm h-8
                        ${tableId === t.id ? "bg-white hover:bg-white" : "bg-purple-800 text-white hover:bg-purple-900"}
                      `}
                    >
                      {t.name}
                      <CaretDownIcon
                        className={`w-6 h-6 text-gray-500 shrink-0
                        ${tableId === t.id ? "text-gray-800" : "text-white opacity-70"}
                      `}
                      />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content
                    sideOffset={5}
                    align="start"
                    className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-sm text-gray-700 z-20"
                  >
                    {editTableSections.map((section, index) => (
                      <PopoverSection
                        key={index}
                        title={section.title}
                        items={section.items}
                        search={section.search}
                      />
                    ))}
                  </Popover.Content>
                </Popover.Root>
              )
            })}
            <div
              className="h-8 w-8 flex items-center justify-center"
            >
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="hover:bg-inherit text-gray-700 gap-1 font-semibold"
                  >
                    <PlusIcon
                      className="w-5 h-5 text-gray-100 cursor-pointer"
                    />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  className="bg-white shadow-xl p-3 rounded-lg w-72
                    border border-gray-300 text-xs space-y-1 flex flex-col
                    fixed mt-1 z-20 origin-top-left
                  "
                  sideOffset={5}
                  align="start"
                >
                  <p className="m-2 text-gray-400 text-[11px]">
                    {`Add a blank table`}
                  </p>

                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                    onSelect={onAddTable}
                  >
                    <FileIcon
                      className="inline-flex items-center justify-center h-4 w-4 shrink-0"
                    />
                    <span className={`text-gray-700`}>
                      {"Start from scratch"}
                    </span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator
                    className="my-2 mx-2 h-px bg-gray-200"
                  />

                  <p className="m-2 text-gray-400 text-[11px]">
                    {`Add from other sources`}
                  </p>

                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <Image
                      src="/Airtable-Mark-Color.png"
                      alt="Airtable Logo"
                      width={16}
                      height={16}
                    />
                    <span className={`text-gray-700`}>
                      {`Airtable base`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <FileTextIcon
                      className="inline-flex items-center justify-center h-4 w-4 shrink-0"
                    />
                    <span className={`text-gray-700`}>
                      {`CSV file`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <Image
                      src="/Google-Calendar-Logo.png"
                      alt="Google Calendar Logo"
                      width={16}
                      height={16}
                    />
                    <span className={`text-gray-700`}>
                      {`Google Calendar`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <Image
                      src="/Google-Sheets-Logo.png"
                      alt="Google Sheets Logo"
                      width={16}
                      height={16}
                    />
                    <span className={`text-gray-700`}>
                      {`Google Sheets`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <Image
                      src="/Microsoft-Excel-Logo.png"
                      alt="Microsoft Excel Logo"
                      width={16}
                      height={16}
                    />
                    <span className={`text-gray-700`}>
                      {`Microsoft Excel`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <Image
                      src="/Salesforce-Logo.png"
                      alt="Salesforce Logo"
                      width={16}
                      height={16}
                    />
                    <span className={`text-gray-700`}>
                      {`Salesforce`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`
                      flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none
                    `}
                  // onSelect={onAddTable}
                  >
                    <Image
                      src="/Smartsheet-Logo.png"
                      alt="Smartsheet Logo"
                      width={16}
                      height={16}
                    />
                    <span className={`text-gray-700`}>
                      {`Smartsheet`}
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger
                      className="flex items-center p-2 gap-3 rounded w-full
                      disabled:opacity-50 disabled:cursor-not-allowed 
                      cursor-pointer data-[highlighted]:bg-gray-100
                      outline-none text-xs leading-none"
                    >
                      <BookOpenIcon
                        className="inline-flex items-center justify-center h-4 w-4 shrink-0"
                      />
                      <span className={`text-gray-700`}>
                        {`23 more sources...`}
                      </span>
                      <div className="ml-auto pl-5 text-mauve11 group-data-[disabled]:text-mauve8 group-data-[highlighted]:text-white">
                        <ChevronRightIcon />
                      </div>
                    </DropdownMenu.SubTrigger>
                  </DropdownMenu.Sub>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
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
                className="hover:bg-gray-200 text-gray-700 gap-1 font-semibold"
              >
                <TableCellsIcon className="w-4 h-4 mr-1 text-blue-500" />
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

          <TableOptionsHide
            columns={columns}
            hiddenColumnIds={hiddenColumnIds}
            setHiddenColumnIds={setHiddenColumnIds}
            handleColumnToggle={handleColumnToggle}
          />
          <TableOptionsFilter
            columns={columns}
            pageParams={pageParams}
            setPageParams={setPageParams}
          />
          <TableOptionsSort
            columns={columns}
            onSortColumn={onSortColumn}
          />
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-200 text-gray-700"
          >
            <SwatchIcon className="w-4 h-4 mr-1" />
            Color
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="hover:bg-gray-200 text-gray-700"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
            Share and sync
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onAdd100kRowsClick}
              disabled={is100kRowsLoading}
              size="xs"
              className="hover:bg-gray-100 text-gray-700 border-gray-400"
            >
              {is100kRowsLoading ? "Loading..." : "Add 100k rows"}
            </Button>
          </div>
        </div>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="p-2 cursor-pointer">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />
            </button>
          </Popover.Trigger>

          <Popover.Content
            align="end"
            className="bg-white border border-gray-300 shadow-lg rounded-md p-2 w-72 z-20"
          >
            <div className="relative w-full flex items-center">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={liveSearchInput}
                onChange={e => setLiveSearchInput(e.target.value)}
                className="border border-gray-300 pl-9 pr-8 text-gray-700 text-sm px-3 py-1.5 w-full rounded-md outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Find in view…"
              />
              <Popover.Close asChild>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  aria-label="Close"
                >
                  <Cross2Icon className="w-4 h-4" />
                </button>
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>
      <div
        className="flex flex-row flex-1 w-full min-h-0 overflow-hidden"
      >
        {/* Sidebar */}
        {sideBarOpen &&
          <TableSidebar
            baseId={baseId}
            tableId={tableId}
            viewId={viewId}
            filters={filters}
            editViewSections={editViewSections}
            onApplyFilter={onApplyFilter}
          />
        }

        <div
          className={`flex-1 flex flex-col h-full min-h-0`}
        >
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <TableView
              baseId={baseId}
              tableId={tableId}

              search={search}
              setSearch={setSearch}
              pageParams={pageParams}
              setPageParams={setPageParams}

              jobId={jobId}
              setIs100kRowsLoading={setIs100kRowsLoading}

              onSaveFilterClick={onSaveFilterClick}

              hiddenColumnIds={hiddenColumnIds}
              handleColumnToggle={handleColumnToggle}
              columns={columns}
              onAddCol={onAddCol}
              onUpdCol={onUpdCol}
              onDelCol={onDelCol}
              onSortColumn={onSortColumn}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
