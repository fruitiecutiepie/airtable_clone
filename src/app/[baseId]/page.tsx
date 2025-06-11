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
  const appUrl = process.env.VERCEL_URL ? "" : "http://localhost:3000";

  const baseIdNum = parseInt(baseIdStr, 10);
  if (isNaN(baseIdNum)) {
    console.error(`Invalid baseId parameters provided: ${baseIdStr}`);
    redirect(`${appUrl}/`);
  }

  const tables = await fetcher<Table[]>(`${appUrl}/api/${baseIdNum}/tables`);
  console.log("Tables fetched:", tables);
  const firstTable = tables[0];
  if (!firstTable) {
    const { tableId, filterId } = await fetcher<{
      tableId: number;
      filterId: string;
    }>(`${appUrl}/api/${baseIdNum}/tables`, {
      method: "POST",
      body: JSON.stringify({
        name: "Table 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    console.log("Redirecting to view:", `${appUrl}/${baseIdNum}/${tableId}/${filterId}`);
    redirect(`${appUrl}/${baseIdNum}/${tableId}/${filterId}`);
  }

  const views = await fetcher<SavedFilter[]>(`${appUrl}/api/${baseIdNum}/${firstTable.id}/views`);
  const firstView = views[0];
  if (!firstView) {
    const { filterId } = await fetcher<{
      tableId: number;
      filterId: string;
    }>(`${appUrl}/api/${baseIdNum}/${firstTable.id}/views`, {
      method: "POST",
      body: JSON.stringify({
        name: "Default View",
        filters: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    redirect(`${appUrl}/${baseIdNum}/${firstTable.id}/${filterId}`);
  }

  console.log("Redirecting to view:", `${appUrl}/${baseIdNum}/${firstTable.id}/${firstView.filterId}`);
  redirect(`${appUrl}/${baseIdNum}/${firstTable.id}/${firstView.filterId}`);
}
