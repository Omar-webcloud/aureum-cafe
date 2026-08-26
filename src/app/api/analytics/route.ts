import { db } from "@/db";
import { orders } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const allOrders = await db.select().from(orders);
  
  const totalOrders = allOrders.length;
  const totalRevenueCents = allOrders.reduce((sum: number, order: any) => sum + order.totalCents, 0);
  const avgOrderValueCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;
  
  return Response.json({
    totalOrders,
    totalRevenueCents,
    avgOrderValueCents
  });
}
