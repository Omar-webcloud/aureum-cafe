import { db } from "@/db";
import { menuItems, orderItems, orders, reviews } from "@/db/schema";
import { getAIProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientIp } from "@/lib/ai/rate-limiter";
import { inArray } from "drizzle-orm";
import type { BaristaMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const action = body.action;
    const provider = getAIProvider();

    if (action === "insights") {
      const allOrders = await db.select().from(orders);
      const catalog = await db.select().from(menuItems);
      
      const ids = allOrders.map((o: any) => o.id);
      let items = [] as any[];
      if (ids.length > 0) {
        items = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));
      }

      const ordersData = allOrders.map((o: any) => ({
        ...o,
        items: items.filter((i: any) => i.orderId === o.id)
      }));

      const insights = await provider.generateBusinessInsights(ordersData, catalog);
      return Response.json({ insights });
    }

    if (action === "reviewsAnalysis") {
      const allReviews = await db.select().from(reviews);
      const analysis = await provider.analyzeReviews(allReviews);
      return Response.json({ analysis });
    }

    if (action === "chat") {
      const userMessages: BaristaMessage[] = body.messages || [];
      const allOrders = await db.select().from(orders);
      const allReviews = await db.select().from(reviews);
      const catalog = await db.select().from(menuItems);

      const toolsData = {
        totalOrders: allOrders.length,
        totalRevenueCents: allOrders.reduce((sum: number, o: any) => sum + o.totalCents, 0),
        reviewsCount: allReviews.length,
        catalogSize: catalog.length
      };

      const reply = await provider.ownerAssistantChat(userMessages, toolsData);
      return Response.json({ reply });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("AI Owner API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
