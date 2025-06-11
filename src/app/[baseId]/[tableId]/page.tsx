import { redirect } from "next/navigation";
import { fetcher } from "~/lib/fetcher";
import type { SavedFilter } from "~/lib/schemas";

interface TablePageUrlProps {
  params: Promise<{
    baseId: string;
    tableId: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function Page({ params }: TablePageUrlProps) {
  const { baseId: baseIdStr, tableId: tableIdStr } = await params;

  const baseIdNum = parseInt(baseIdStr, 10);
  const tableIdNum = parseInt(tableIdStr, 10);

  if (isNaN(baseIdNum) || isNaN(tableIdNum)) {
    console.error("Invalid baseId or tableId parameters");
    redirect("/");
  }

  const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  const views = await fetcher<SavedFilter[]>(`${appUrl}/api/${baseIdNum}/${tableIdNum}/views`);
  const firstView = views[0];
  if (!firstView) {
    const { filterId } = await fetcher<{
      tableId: number;
      filterId: string;
    }>(`${appUrl}/api/${baseIdNum}/${tableIdNum}/views`, {
      method: "POST",
      body: JSON.stringify({
        name: "Default View",
        filters: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    redirect(`/${baseIdNum}/${tableIdNum}/${filterId}`);
  }

  console.log("Redirecting to view:", `${appUrl}/${baseIdNum}/${tableIdNum}/${firstView.filterId}`);
  redirect(`${appUrl}/${baseIdNum}/${tableIdNum}/${firstView.filterId}`);
}
