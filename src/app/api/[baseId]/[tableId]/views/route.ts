import { z } from "zod";
import { FilterSchema } from "~/lib/schemas";
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

const ReqBodySchema = z.object({
  name: z.string(),
  filters: z.record(z.array(FilterSchema)),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { baseId, tableId } = await params;
  const data: unknown = await req.json();

  const parsedData = ReqBodySchema.safeParse(data);
  if (!parsedData.success) {
    return Response.json(
      {
        error: "Invalid request body",
        details: parsedData.error.errors,
      },
      { status: 400 }
    );
  }
  const reqBody = parsedData.data;

  const newFilter = await api.filter.setSavedFilter({
    baseId: Number(baseId),
    tableId: Number(tableId),
    filterId: undefined, // This will be auto-generated
    name: reqBody.name,
    filters: reqBody.filters,
    createdAt: reqBody.createdAt,
    updatedAt: reqBody.updatedAt,
  });

  return Response.json({
    filterId: newFilter.filterId,
  });
}
