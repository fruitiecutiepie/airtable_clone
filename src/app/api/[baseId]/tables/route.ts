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
  name: z.string().min(1, "Table name cannot be empty"),
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

  try {
    const newTable = await api.table.addTable({
      baseId: Number(baseId),
      ...table
    });

    const defs: {
      name: string;
      dataType: TableColumnDataType;
    }[] = [
      { name: "firstName", dataType: "text" },
      { name: "lastName", dataType: "text" },
      { name: "age", dataType: "numeric" },
      { name: "email", dataType: "text" },
      { name: "active", dataType: "boolean" },
      { name: "joinedAt", dataType: "date" },

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
      firstName: row.first_name,
      lastName: row.last_name,
      age: row.age,
      email: row.email,
      active: row.active,
      joinedAt: row.joined_at,
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

    if (!firstView) {
      console.error("Failed to create or retrieve a default view for the new table.");
      return Response.json(
        { error: "Table created, but failed to establish a default view." },
        { status: 500 }
      );
    }

    return Response.json({
      tableId: newTable.id,
      filterId: firstView.filterId,
    });
  } catch (error) {
    console.error("Error in POST /api/[baseId]/tables:", error);
    // Check if the error is from tRPC and indicates a unique constraint violation
    // This depends on how tRPC errors are structured and propagated.
    // PostgreSQL unique violation error code is '23505'.
    if (error instanceof Error && error.message?.includes("violates unique constraint")) {
      return Response.json(
        { error: "Failed to add table: Name already exists.", details: error.message },
        { status: 409 } // 409 Conflict is appropriate for duplicate resource
      );
    }
    return Response.json(
      { error: "Failed to create table.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
