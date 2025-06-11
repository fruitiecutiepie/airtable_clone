import { headers } from "next/headers";
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

  const hdr = await headers();
  const host = hdr.get("x-forwarded-host") ?? hdr.get("host");
  const proto = hdr.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  if (isNaN(baseIdNum) || isNaN(tableIdNum)) {
    console.error("Invalid baseId or tableId parameters");
    redirect(`${origin}/`);
  }

  const views = await fetcher<SavedFilter[]>(`${origin}/api/${baseIdNum}/${tableIdNum}/views`);
  const firstView = views[0];
  if (!firstView) {
    const { filterId } = await fetcher<{
      tableId: number;
      filterId: string;
    }>(`${origin}/api/${baseIdNum}/${tableIdNum}/views`, {
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

  console.log("Redirecting to view:", `${origin}/${baseIdNum}/${tableIdNum}/${firstView.filterId}`);
  redirect(`${origin}/${baseIdNum}/${tableIdNum}/${firstView.filterId}`);
}
