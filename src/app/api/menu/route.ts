import { getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getMenu();
    return Response.json({ items });
  } catch {
    return Response.json({ items: [], error: "Unable to load the menu." }, { status: 500 });
  }
}
