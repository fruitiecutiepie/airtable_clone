import { api } from "~/trpc/server";

type RequestParams = {
  tableId: string;
};

// export const dynamic = "force-static";
// export const revalidate = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { tableId } = await params;

  const columns = await api.table.getColumns({
    tableId: Number(tableId),
  });

  return Response.json(
    columns
  );
}
