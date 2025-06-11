import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetcher } from "~/lib/fetcher";
import type { SavedFilter, Table } from "~/lib/schemas";

interface TablePageUrlProps {
  params: Promise<{
    baseId: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function BasePage({ params }: TablePageUrlProps) {
  const { baseId: baseIdStr } = await params;
  if (baseIdStr === "styles.css") {
    return;
  }

  const hdr = await headers();
  const host = hdr.get("x-forwarded-host") ?? hdr.get("host");
  const proto = hdr.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const baseIdNum = parseInt(baseIdStr, 10);
  if (isNaN(baseIdNum)) {
    console.error(`Invalid baseId parameters provided: ${baseIdStr}`);
    redirect(`${origin}/`);
  }

  const tables = await fetcher<Table[]>(`${origin}/api/${baseIdNum}/tables`);
  console.log("Tables fetched:", tables);
  const firstTable = tables[0];
  if (!firstTable) {
    const { tableId, filterId } = await fetcher<{
      tableId: number;
      filterId: string;
    }>(`${origin}/api/${baseIdNum}/tables`, {
      method: "POST",
      body: JSON.stringify({
        name: "Table 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    console.log("Redirecting to view:", `${origin}/${baseIdNum}/${tableId}/${filterId}`);
    redirect(`${origin}/${baseIdNum}/${tableId}/${filterId}`);
  }

  const views = await fetcher<SavedFilter[]>(`${origin}/api/${baseIdNum}/${firstTable.id}/views`);
  const firstView = views[0];
  if (!firstView) {
    const { filterId } = await fetcher<{
      tableId: number;
      filterId: string;
    }>(`${origin}/api/${baseIdNum}/${firstTable.id}/views`, {
      method: "POST",
      body: JSON.stringify({
        name: "Default View",
        filters: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    redirect(`${origin}/${baseIdNum}/${firstTable.id}/${filterId}`);
  }

  console.log("Redirecting to view:", `${origin}/${baseIdNum}/${firstTable.id}/${firstView.filterId}`);
  redirect(`${origin}/${baseIdNum}/${firstTable.id}/${firstView.filterId}`);
}
