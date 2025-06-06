import { api } from "~/trpc/server";

// export const dynamic = "force-static";
// export const revalidate = 60;

export async function GET(
  req: Request,
) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response("User ID is required", { status: 400 });
  }

  const tables = await api.base.getBases({
    userId,
  });

  return Response.json(
    tables
  );
}
