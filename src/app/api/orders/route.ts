import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orderItems, orders, type MenuItem } from "@/db/schema";
import { createOrderReference } from "@/lib/money";
import { getWhatsAppNumber } from "@/lib/shop";
import type { KitchenOrder, OrderError, OrderPayload, OrderResponse } from "@/lib/types";
import { buildOrderMessage, buildWhatsAppUrl, notifyShopViaCloudApi } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePayload(body: unknown): OrderPayload | string {
  if (!body || typeof body !== "object") {
    return "A valid order body is required.";
  }

  const raw = body as Record<string, unknown>;
  const customerName = asString(raw.customerName);
  const customerPhone = asString(raw.customerPhone);
  const pickupTime = asString(raw.pickupTime);
  const notes = asString(raw.notes);
  const items = Array.isArray(raw.items) ? raw.items : [];

  if (customerName.length < 2 || customerName.length > 80) {
    return "Please add your name so we can call it when the order is ready.";
  }

  const digits = customerPhone.replace(/\D/g, "");
  if (digits.length < 8) {
    return "Add a WhatsApp-ready phone number.";
  }

  if (notes.length > 400) {
    return "Keep notes under 400 characters.";
  }

  const parsedItems: OrderPayload["items"] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const menuItemId = Number(row.menuItemId);
    const quantity = Number(row.quantity);
    if (!Number.isInteger(menuItemId) || menuItemId <= 0) continue;
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 20) continue;
    parsedItems.push({ menuItemId, quantity });
  }

  if (parsedItems.length === 0) {
    return "Add at least one drink or pastry.";
  }

  return {
    customerName,
    customerPhone,
    pickupTime: pickupTime || undefined,
    notes: notes || undefined,
    items: parsedItems,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." } satisfies OrderError, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (typeof parsed === "string") {
    return Response.json({ ok: false, error: parsed } satisfies OrderError, { status: 400 });
  }

  const ids = [...new Set(parsed.items.map((item) => item.menuItemId))];
  const catalog = await db.select().from(menuItems).where(inArray(menuItems.id, ids));
  const byId = new Map(catalog.map((item) => [item.id, item]));

  const lines: Array<{ menuItem: MenuItem; quantity: number }> = [];
  for (const item of parsed.items) {
    const menuItem = byId.get(item.menuItemId);
    if (!menuItem || !menuItem.available) {
      return Response.json(
        { ok: false, error: "One of the selected items is no longer available." } satisfies OrderError,
        { status: 400 },
      );
    }
    lines.push({
      menuItem,
      quantity: item.quantity,
    });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.menuItem.priceCents * line.quantity, 0);
  const reference = createOrderReference();
  const message = buildOrderMessage({
    reference,
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    pickupTime: parsed.pickupTime,
    notes: parsed.notes,
    totalCents,
    items: lines.map((line) => ({
      name: line.menuItem.name,
      quantity: line.quantity,
      unitPriceCents: line.menuItem.priceCents,
    })),
  });
  const whatsappUrl = buildWhatsAppUrl(message);

  const created = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        reference,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        pickupTime: parsed.pickupTime ?? null,
        notes: parsed.notes ?? null,
        status: "pending",
        totalCents,
        whatsappUrl,
      })
      .returning();

    if (!order) {
      throw new Error("Order insert failed");
    }

    await tx.insert(orderItems).values(
      lines.map((line) => ({
        orderId: order.id,
        menuItemId: line.menuItem.id,
        name: line.menuItem.name,
        quantity: line.quantity,
        unitPriceCents: line.menuItem.priceCents,
      })),
    );

    return order;
  });

  let cloudSent = false;
  try {
    cloudSent = await notifyShopViaCloudApi(getWhatsAppNumber(), message);
  } catch (error) {
    console.error("WhatsApp notify failed", error);
  }

  const payload: OrderResponse = {
    ok: true,
    reference: created.reference,
    totalCents: created.totalCents,
    whatsappUrl,
    cloudSent,
  };

  return Response.json(payload);
}

export async function GET() {
  const recent = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(40);
  const ids = recent.map((order) => order.id);
  const items =
    ids.length === 0
      ? []
      : await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));

  const grouped = new Map<number, KitchenOrder["items"]>();
  for (const item of items) {
    const current = grouped.get(item.orderId) ?? [];
    current.push({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    });
    grouped.set(item.orderId, current);
  }

  const payload: KitchenOrder[] = recent.map((order) => ({
    id: order.id,
    reference: order.reference,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    pickupTime: order.pickupTime,
    notes: order.notes,
    status: order.status,
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
    items: grouped.get(order.id) ?? [],
  }));

  return Response.json({ orders: payload });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const id = Number(raw.id);
  const status = asString(raw.status);
  const allowed = new Set(["pending", "preparing", "ready", "completed"]);

  if (!Number.isInteger(id) || !allowed.has(status)) {
    return Response.json({ ok: false, error: "Invalid status update." }, { status: 400 });
  }

  const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
  if (!updated) {
    return Response.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  return Response.json({ ok: true, id: updated.id, status: updated.status });
}
