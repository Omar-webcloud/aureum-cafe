import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { ensureMenuSeeded } from "@/db/seed";
import type { MenuCategory, MenuItemDTO } from "@/lib/types";

const categories = new Set<MenuCategory>(["espresso", "brew", "seasonal", "kitchen"]);

function toDto(item: typeof menuItems.$inferSelect): MenuItemDTO {
  const category = categories.has(item.category as MenuCategory)
    ? (item.category as MenuCategory)
    : "espresso";

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    category,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    featured: item.featured,
    available: item.available,
    tag: item.tag,
  };
}

export async function getMenu(): Promise<MenuItemDTO[]> {
  await ensureMenuSeeded();
  const rows = await db.select().from(menuItems).where(eq(menuItems.available, true)).orderBy(asc(menuItems.id));
  return rows.map(toDto);
}
