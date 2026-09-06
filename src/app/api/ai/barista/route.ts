import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { getAIProvider } from "@/lib/ai/provider";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { getWhatsAppNumber } from "@/lib/shop";
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
    const whatsappNumber = getWhatsAppNumber();

    // Fetch catalog for context (shared across all actions)
    const catalog = await db.select().from(menuItems);

    if (action === "chat") {
      const userMessages: BaristaMessage[] = body.messages || [];

      // Build the catalog string to inject as the system message content.
      // GeminiProvider reads the system-role message's content as the catalog block
      // and injects it into buildSystemPrompt().
      const catalogSummary = JSON.stringify(
        catalog.map((c: any) => ({
          name: c.name,
          description: c.description,
          price: (c.priceCents / 100).toFixed(2) + " USD",
          category: c.category,
          ingredients: c.ingredients,
          allergens: c.allergens,
          milkOptions: c.milkOptions,
          temperatureOptions: c.temperatureOptions,
          sweetnessLevel: c.sweetnessLevel,
          coffeeStrength: c.coffeeStrength,
          isDairyFree: c.isDairyFree,
          isGlutenFree: c.isGlutenFree,
          available: c.available,
        })),
        null,
        2,
      );

      // Prepend catalog as a system message so GeminiProvider can extract it
      const messages: BaristaMessage[] = [
        { role: "system", content: catalogSummary },
        ...userMessages,
      ];

      const replyJson = await provider.chat(messages, whatsappNumber);
      return Response.json({ reply: replyJson });
    }

    if (action === "recommend") {
      const preferences: string[] = body.preferences || [];
      const recommendations = await provider.recommendProducts(preferences, catalog as any);

      // Enhance recommendations with actual product data
      const results = recommendations
        .map((rec) => {
          const product = catalog.find((p: any) => p.id === rec.productId);
          return { ...rec, product };
        })
        .filter((r) => r.product != null);

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
