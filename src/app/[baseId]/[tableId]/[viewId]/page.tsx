import TablePage from "../TablePage";

interface TableViewProps {
  params: Promise<{
    baseId: string;
    tableId: string;
    viewId: string;
  }>;
}

export default async function TableViewPage({ params }: TableViewProps) {
  const { baseId, tableId, viewId } = await params;

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