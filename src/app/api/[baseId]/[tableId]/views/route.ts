import { api } from "~/trpc/server";

type RequestParams = {
  baseId: string;
  tableId: string;
};

// export const dynamic = "force-static";
// export const revalidate = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { baseId, tableId } = await params;

  const views = await api.filter.getSavedFilters({
    baseId: Number(baseId),
    tableId: Number(tableId),
  });

  return Response.json(
    views
  );
}
