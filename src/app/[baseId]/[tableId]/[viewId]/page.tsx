"use client";

import { useParams } from "next/navigation";
import TablePage from "../../TablePage";
import { useSession } from "next-auth/react";

export default function TableViewPage() {
  const { data: session } = useSession();
  const { baseId, tableId, viewId } = useParams();

  if (!session) return null;

  return (
    <div>
      <TablePage
        userId={session.user.public_id}
        baseId={Number(baseId)}
        tableId={Number(tableId)}
        viewId={Number(viewId)}
      />
    </div>
  )
}