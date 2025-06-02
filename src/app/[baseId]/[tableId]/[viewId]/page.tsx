"use client";

import { useParams } from "next/navigation";
import TablePage from "../TablePage";

export default function TableViewPage() {
  const { baseId, tableId, viewId } = useParams();

  return (
    <div>
      <TablePage
        baseId={Number(baseId)}
        tableId={Number(tableId)}
        viewId={Number(viewId)}
      />
    </div>
  )
}