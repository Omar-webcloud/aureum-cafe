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
    ingredients: item.ingredients,
    allergens: item.allergens,
    milkOptions: item.milkOptions,
    temperatureOptions: item.temperatureOptions,
    sweetnessLevel: item.sweetnessLevel,
    coffeeStrength: item.coffeeStrength,
    isDairyFree: item.isDairyFree || false,
    isGlutenFree: item.isGlutenFree || false,
  };
}

export async function getMenu(): Promise<MenuItemDTO[]> {
  await ensureMenuSeeded();
  const rows = await db.select().from(menuItems).where(eq(menuItems.available, true)).orderBy(asc(menuItems.id));
  return rows.map(toDto);
}
