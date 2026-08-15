import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  imageUrl: text("image_url").notNull(),
  featured: boolean("featured").notNull().default(false),
  available: boolean("available").notNull().default(true),
  tag: text("tag"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 20 }).notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  pickupTime: text("pickup_time"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalCents: integer("total_cents").notNull(),
  whatsappUrl: text("whatsapp_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
