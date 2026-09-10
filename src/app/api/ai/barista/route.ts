import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { ensureMenuSeeded } from "@/db/seed";
import { getAIProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientIp } from "@/lib/ai/rate-limiter";
import { matchFaqShortcut } from "@/lib/ai/faq-shortcuts";
import { getWhatsAppNumber } from "@/lib/shop";
import type { BaristaMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

const BARISTA_MAX_REQUESTS_PER_WINDOW = 60;

// Tiny short-lived cache for "chat" replies, keyed by the exact conversation
// so far. This absorbs the most common source of *duplicate* AI calls we
// don't actually need: double-taps, React re-renders firing the same
// request twice, and many different visitors asking the exact same opening
// question (which quick-action rephrasings + the FAQ shortcut above don't
// happen to cover). It is intentionally tiny and short-lived — this is a
// burst absorber, not a semantic cache — and, like the rate limiter, it
// lives in one serverless instance's memory only.
const CHAT_CACHE_TTL_MS = 3 * 60 * 1000;
const CHAT_CACHE_MAX_ENTRIES = 200;
const chatReplyCache = new Map<string, { reply: string; expires: number }>();

function cacheKeyFor(messages: BaristaMessage[]): string {
  return JSON.stringify(messages.slice(-6));
}

function getCachedReply(key: string): string | null {
  const entry = chatReplyCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    chatReplyCache.delete(key);
    return null;
  }
  return entry.reply;
}

function setCachedReply(key: string, reply: string) {
  if (chatReplyCache.size >= CHAT_CACHE_MAX_ENTRIES) {
    const oldestKey = chatReplyCache.keys().next().value;
    if (oldestKey) chatReplyCache.delete(oldestKey);
  }
  chatReplyCache.set(key, { reply, expires: Date.now() + CHAT_CACHE_TTL_MS });
}

export async function POST(request: Request) {
  // Simple rate limiting by client IP (see getClientIp for why the raw
  // x-forwarded-for header was unsafe to use directly).
  const ip = getClientIp(request);
  if (!checkRateLimit(ip, BARISTA_MAX_REQUESTS_PER_WINDOW)) {
    return Response.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const action = body.action; // "chat", "recommend", "parseOrder"
    const whatsappNumber = getWhatsAppNumber();

    if (action === "chat") {
      const userMessages: BaristaMessage[] = body.messages || [];
      const lastUserMessage = [...userMessages].reverse().find((m) => m.role === "user")?.content ?? "";

      // 1. Deterministic FAQ short-circuit — zero AI calls, zero latency,
      //    zero token/quota usage, for the handful of fixed-answer questions
      //    that make up a large share of real traffic.
      const shortcut = matchFaqShortcut(lastUserMessage, whatsappNumber);
      if (shortcut) {
        return Response.json({ reply: JSON.stringify(shortcut) });
      }

      // 2. Burst cache — identical recent conversation, skip the AI call.
      const cacheKey = cacheKeyFor(userMessages);
      const cached = getCachedReply(cacheKey);
      if (cached) {
        return Response.json({ reply: cached });
      }

      const provider = getAIProvider();

      // Ensure the in-memory DB is seeded before querying (mirrors getMenu())
      await ensureMenuSeeded();
      const catalog = await db.select().from(menuItems);

      // Build the catalog string to inject as the system message content.
      // GeminiProvider reads the system-role message's content as the catalog block
      // and injects it into buildSystemPrompt().
      // NOTE: compact (no pretty-print indentation) — the whitespace from
      // `null, 2` formatting was pure token waste, repeated on every turn.
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
      );

      // Prepend catalog as a system message so GeminiProvider can extract it
      const messages: BaristaMessage[] = [
        { role: "system", content: catalogSummary },
        ...userMessages,
      ];

      try {
        const replyJson = await provider.chat(messages, whatsappNumber);
        setCachedReply(cacheKey, replyJson);
        return Response.json({ reply: replyJson });
      } catch (error) {
        // Providers now throw on real failure (timeout / rate-limit / network)
        // instead of silently resolving with an "offline" reply — that's what
        // lets BaristaFallbackProvider tell success apart from failure. But a
        // thrown error here would otherwise fall through to the generic 500
        // handler below and the widget would show a hard error instead of a
        // graceful in-character message. Catch it here so the UX degrades the
        // same way regardless of whether a Groq fallback key is configured.
        console.error("AI Barista chat failed after all providers:", error);
        return Response.json({
          reply: JSON.stringify({ type: "text", content: "I'm temporarily offline. Please try that question again in a moment." }),
        });
      }
    }

    const provider = getAIProvider();
    await ensureMenuSeeded();
    const catalog = await db.select().from(menuItems);

    if (action === "recommend") {
      const preferences: string[] = body.preferences || [];
      try {
        const recommendations = await provider.recommendProducts(preferences, catalog as any);

        // Enhance recommendations with actual product data
        const results = recommendations
          .map((rec) => {
            const product = catalog.find((p: any) => p.id === rec.productId);
            return { ...rec, product };
          })
          .filter((r) => r.product != null);

        return Response.json({ recommendations: results });
      } catch (error) {
        // See the "chat" branch above — providers throw on real failure now,
        // so translate that into the same empty-result shape the widget
        // already handles gracefully, instead of a hard 500.
        console.error("AI recommend failed after all providers:", error);
        return Response.json({ recommendations: [] });
      }
    }

    if (action === "parseOrder") {
      const text: string = body.text || "";
      try {
        const parsedOrder = await provider.parseNaturalLanguageOrder(text, catalog);
        return Response.json({ parsedOrder });
      } catch (error) {
        console.error("AI parseOrder failed after all providers:", error);
        return Response.json({
          parsedOrder: { ok: false, items: [], error: "The order service is temporarily unavailable. Please try again in a moment." },
        });
      }
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("AI Barista API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
