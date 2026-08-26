import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { getAIProvider } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import type { BaristaMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Simple rate limiting by IP (using x-forwarded-for if behind proxy)
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const action = body.action; // "chat", "recommend", "parseOrder"
    const provider = getAIProvider();

    // Fetch catalog for context
    const catalog = await db.select().from(menuItems);

    if (action === "chat") {
      const userMessages: BaristaMessage[] = body.messages || [];
      // Build system prompt injecting catalog
      const systemMessage: BaristaMessage = {
        role: "system",
        content: `You are the AI Barista for Aureum Cafe.
Be friendly, concise, and helpful. 
You MUST answer questions using ONLY the provided menu catalog. Do not invent products, prices, or ingredients.
If you don't know the answer, say "I don't have that information yet. Please ask the shop."

Menu Catalog:
${JSON.stringify(catalog.map((c: any) => ({
  name: c.name,
  description: c.description,
  price: c.priceCents / 100 + " USD", // Formatting as USD or BDT depending on store config, let's keep it simple
  category: c.category,
  ingredients: c.ingredients,
  allergens: c.allergens,
  milkOptions: c.milkOptions,
  temperatureOptions: c.temperatureOptions,
  sweetness: c.sweetnessLevel,
  strength: c.coffeeStrength,
  isDairyFree: c.isDairyFree,
  isGlutenFree: c.isGlutenFree
})))}`
      };

      const messages = [systemMessage, ...userMessages];
      const reply = await provider.chat(messages);
      return Response.json({ reply });
    }

    if (action === "recommend") {
      const preferences: string[] = body.preferences || [];
      const recommendations = await provider.recommendProducts(preferences, catalog as any);
      
      // Enhance recommendations with actual product data
      const results = recommendations.map(rec => {
        const product = catalog.find((p: any) => p.id === rec.productId);
        return {
          ...rec,
          product
        };
      }).filter(r => r.product != null);
      
      return Response.json({ recommendations: results });
    }

    if (action === "parseOrder") {
      const text: string = body.text || "";
      const parsedOrder = await provider.parseNaturalLanguageOrder(text, catalog);
      return Response.json({ parsedOrder });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("AI Barista API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
