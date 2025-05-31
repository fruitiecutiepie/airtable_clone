import { redirect } from "next/navigation";
import { z } from "zod";
import { fakeRows } from "~/data/fakeRows";
import type { TableColumnDataType } from "~/lib/schemas";
import { api } from "~/trpc/server";

type RequestParams = {
  baseId: string;
};

// export const dynamic = "force-static";
// export const revalidate = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { baseId } = await params;

  const tables = await api.table.getTables({
    baseId: Number(baseId),
  });

  return Response.json(
    tables
  );
}

const ReqBodySchema = z.object({
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export async function POST(
  req: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { baseId } = await params;
  const reqBody: unknown = await req.json();

  const reqBodyParsed = ReqBodySchema.safeParse(reqBody);
  if (!reqBodyParsed.success) {
    return Response.json(
      { error: "Invalid request body", details: reqBodyParsed.error },
      { status: 400 }
    );
  }
  const table = reqBodyParsed.data;

  const newTable = await api.table.addTable({
    baseId: Number(baseId),
    ...table
  });

  const defs = [
    { name: "firstName", dataType: "text" as TableColumnDataType },
    { name: "age", dataType: "numeric" as TableColumnDataType },
    { name: "email", dataType: "text" as TableColumnDataType },
  ] as const;

  for (let i = 0; i < defs.length; i++) {
    await api.table.addColumn({
      tableId: newTable.id,
      name: defs[i]!.name,
      dataType: defs[i]!.dataType,
      position: i,
    });
  }

  const rows = fakeRows.slice(0, 100).map(row => ({
    firstName: row.firstName,
    age: row.age,
    email: row.email
  }));

  await api.table.addRows({
    tableId: newTable.id,
    createdAt: new Date().toISOString(),
    rows
  });

  const views = await api.filter.getSavedFilters({
    baseId: Number(baseId),
    tableId: newTable.id,
  });
  let firstView = views[0];
  if (!firstView) {
    const newFilter = await api.filter.setSavedFilter({
      baseId: Number(baseId),
      tableId: newTable.id,
      name: "Default View",
      filters: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    firstView = newFilter;
  }

  return Response.json({
    tableId: newTable.id,
    filterId: firstView.filter_id,
  });
}
