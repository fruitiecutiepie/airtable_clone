"use client";

import React, { useMemo } from "react";
import { useTableUI } from "~/app/hooks/useTableUI";
import { Button } from "~/app/components/ui/Button";
import { redirect } from "next/navigation";
import { CaretDownIcon, Pencil1Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import TablePageHeader from "./TablePageHeader";
import { useTables } from "../../hooks/useTables";
import TableView from "./TableView";
import { Popover } from "radix-ui";
import { PopoverSection, type PopoverSectionProps } from "~/app/components/ui/PopoverSection";

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
  const {
    tables,
  } = useTableUI(baseId);

  const {
    onInsTable,
    onUpdTable,
    onDelTable
  } = useTables(baseId);

  const headerSections: PopoverSectionProps[] = useMemo(() => [
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
            await onDelTable(tableId);
          }
        }
      ]
    },
  ], [onDelTable, onUpdTable, tableId, tables]);

  return (
    <div className="flex flex-col w-full h-full bg-purple-700">
      <TablePageHeader />
      <div
        className="flex flex-row h-full justify-start items-center px-2 gap-2 bg-purple-800"
      >
        {tables?.map(t => {
          return (
            <Button
              key={t.id}
              onClick={() => redirect(`/${baseId}/${t.id}/${viewId}`)}
              className={`w-fit gap-1 text-gray-800 rounded-b-none rounded-t-sm
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
                  {headerSections.map((section, index) => (
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
        <PlusIcon
          className="w-5 h-5 text-gray-100 cursor-pointer"
          onClick={onInsTable}
        />
      </div>
      <TableView baseId={baseId} tableId={tableId} />
    </div>
  );
}
