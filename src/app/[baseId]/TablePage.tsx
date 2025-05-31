"use client";

import React, { useCallback } from "react";
import { useTableUI } from "~/app/hooks/useTableUI";
import TableView from "~/app/[baseId]/[tableId]/TableView";
import { Button } from "~/app/components/ui/Button";
import { redirect } from "next/navigation";
import { PlusIcon } from "@radix-ui/react-icons";
import TableHeader from "../components/TableHeader";
import type { addBase } from "~/server/api/routers/base/addBase";
import { api } from '~/trpc/react'
import { useTables } from "../hooks/useTables";

interface TablePageProps {
  userId: string
  baseId: number,
  tableId: number,
  viewId: number
}

export default function TablePage({
  userId,
  baseId,
  tableId,
  viewId
}: TablePageProps) {
  const {
    tables,
  } = useTableUI(baseId);

  const {
    addNewTable
  } = useTables(baseId);

  return (
    <div className="flex flex-col w-full h-full bg-purple-700">
      <TableHeader />
      <div
        className="flex flex-row h-full justify-start items-center px-2 gap-2 bg-purple-800"
      >
        {tables?.map(t => {
          return (
            <Button
              key={t.id}
              onClick={() => redirect(`/${baseId}/${t.id}/${viewId}`)}
              className={`w-fit hover:bg-purple-900 text-gray-800 rounded-b-none rounded-t-sm
                ${tableId === t.id ? "bg-white" : "bg-purple-800 text-white"}
              `}
            >
              {t.name}
            </Button>
          )
        })}
        <PlusIcon
          className="w-5 h-5 text-gray-100 cursor-pointer"
          onClick={addNewTable}
        />
      </div>
      <TableView baseId={baseId} tableId={tableId} />
    </div>
  );
}
