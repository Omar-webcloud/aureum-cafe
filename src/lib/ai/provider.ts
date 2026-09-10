import { GoogleGenAI } from "@google/genai";
import type { MenuItemDTO } from "@/lib/types";
import type {
  AIServiceProvider,
  BaristaMessage,
  OwnerInsight,
  ParsedOrder,
  RecommendationResult,
  ReviewSentimentSummary,
} from "./types";

// ─── Site knowledge ─────────────────────────────────────────────────────────
// Injected into every chat system prompt so the AI can answer any question
// about the frontend without hallucinating.

const SITE_KNOWLEDGE = `
=== AUREUM CAFE — COMPLETE SITE KNOWLEDGE ===

SHOP INFO:
  Name: Aureum
  Tagline: "Roasted at dawn. Poured with intention."
  Blurb: A quiet specialty atelier in SoHo for people who take their coffee personally.
  Address: 18 Mercer Street, New York, NY 10013 (SoHo neighborhood)
  Phone: +1 (415) 555-0188
  Email: hello@aureum.cafe

HOURS:
  Monday – Friday: 7:00 – 18:00
  Saturday: 8:00 – 17:00
  Sunday: 8:00 – 16:00

STORY / ORIGIN:
  Aureum began as a Thursday roasting club above a Mercer Street walk-up.
  Rule: if a lot cannot stand on its own as a filter pour, it does not touch the espresso machine.
  The bar is short, the music is low, and every ticket still goes out with a name.
  Stats: 12-hour roast rest, 6 origin lots, 1 WhatsApp ticket per order.

COFFEE ORIGINS (6 lots):
  Ethiopia Sidamo, Colombia Huila, Guatemala Antigua, Kenya Nyeri, Sumatra Mandheling, Brazil Cerrado.

THE RITUAL (3 steps):
  01 Source — Direct lots from six farms. Same elevation, same process, same harvest window.
  02 Roast — Small batches every Thursday. Twelve hours of rest, then the first cupping before service.
  03 Pour — Recipes written on the ticket rail. You order from the site, we pull it the same way at the bar.

TESTIMONIALS:
  "The Yirgacheffe tastes like bergamot and honey. I walk from Broome twice a week for it." — Amara V.
  "Aureum is the only shop that treats oat milk like a craft, not an afterthought." — Leo S.
  "Quiet, precise, and the croissant flakes like gold leaf. WhatsApp pickup is a gift." — Priya N.

HOW ORDERING WORKS:
  - Customers browse the menu on the site (section #menu).
  - They add items to the tray (cart).
  - They fill in their name, WhatsApp number, pickup time, and optional notes in the cart form.
  - The order is sent to the bar via WhatsApp — the bar watches the same thread.
  - Walk-ins are also welcome, no reservation needed.
  - The ordering chat at the "Order" tab can parse a natural language order and add items to the cart directly.

PAGE SECTIONS (anchor IDs on the single-page site):
  #top    — Hero / landing
  #menu   — Full menu / Featured drinks
  #story  — Our story / About us
  #visit  — Visit us, address, hours, WhatsApp chat button, Google Maps directions
  #order  — Order contact box inside the Visit section

OTHER PAGES:
  /kitchen — Kitchen display / bar staff view (not for customers)
  /owner   — Owner portal with analytics, AI insights, and reviews (not for customers)

MENU CATEGORIES:
  espresso, brew, seasonal, kitchen (food/pastries)
`;

// ─── History / token budget helpers ─────────────────────────────────────────
//
// Root cause of "exhausts too early": every chat turn re-sent the FULL
// conversation history PLUS the full site-knowledge block PLUS the full menu
// catalog as the system prompt. That means turn 1 might cost ~1.5k tokens,
// but turn 10 of the same conversation re-sends turns 1-9 too, so the same
// static ~1.5k-token prompt gets billed again on every single turn on top of
// a growing history. Free-tier providers (Gemini free tier, and especially
// Groq — ~8-12k TPM on gpt-oss-120b) run out of their per-minute token budget
// after just a few turns of a real conversation, which surfaces as "quota
// exhausted" even though the user only sent a handful of messages. Capping
// how much history we forward keeps the request size roughly constant
// instead of growing without bound.
const MAX_HISTORY_MESSAGES = 8; // last N messages (user+assistant), oldest dropped first

function capHistory(messages: BaristaMessage[]): BaristaMessage[] {
  const nonSystem = messages.filter((m) => m.role !== "system");
  if (nonSystem.length <= MAX_HISTORY_MESSAGES) return nonSystem;
  return nonSystem.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Races a provider call against a timeout so a slow/hanging primary call
 * doesn't block the user (or a fallback provider) for the full network
 * timeout. This is what was making replies feel "very slow": on failure the
 * app waits for Gemini's full request to time out before it even starts the
 * Groq fallback, so a single slow call became two slow calls back to back.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const PROVIDER_TIMEOUT_MS = 12_000;

// ─── Reply schema prompt ─────────────────────────────────────────────────────

function buildSystemPrompt(catalog: string, whatsappNumber: string) {
  const waBase = `https://wa.me/${whatsappNumber}`;

  return `You are the AI Barista for Aureum Cafe. You are embedded in the website and have full awareness of every section and piece of content on the site.

${SITE_KNOWLEDGE}

LIVE MENU CATALOG (current items from database):
${catalog}

WHATSAPP NUMBER: ${whatsappNumber}
WhatsApp base URL: ${waBase}

=== RESPONSE FORMAT — CRITICAL ===
You MUST respond with ONLY a single valid JSON object. No prose outside the JSON.
Choose exactly one of these shapes:

1. Plain text reply:
   { "type": "text", "content": "your message here" }

2. Navigate to a page section:
   { "type": "navigate", "anchor": "#menu", "message": "Here's our full menu!" }
   Valid anchors: #top #menu #story #visit #order

3. Open WhatsApp with a pre-filled message:
   { "type": "whatsapp", "waUrl": "${waBase}?text=Hello%20Aureum", "message": "Opening WhatsApp for you now!" }

4. Pre-fill the order checkout form (also opens the cart drawer):
   { "type": "formFill", "name": "Alex", "phone": "+1 234 567 8900", "pickup": "30 minutes", "notes": "Oat milk please", "message": "I've filled in your details in the order form!" }
   Valid pickup values: "As soon as ready", "15 minutes", "30 minutes", "45 minutes", "1 hour"
   Omit any field that wasn't provided.

5. Open the cart drawer:
   { "type": "openCart", "message": "Opening your cart tray!" }

=== BEHAVIOUR RULES ===
- ALWAYS answer from the SITE KNOWLEDGE and MENU CATALOG above. Never invent products, prices, or facts.
- If asked where something is on the page, use the "navigate" action to take them there.
- If asked to order on WhatsApp, use the "whatsapp" action with a helpful pre-filled message including their order if mentioned.
- If the user gives their name/phone/pickup time, use "formFill" to pre-fill the checkout form.
- If asked about hours, address, story, ritual, origins — use "text".
- Be warm, concise, and precise. Aureum's tone is quiet confidence, not chattiness.
- If you don't know something, say so honestly.
`;
}

// ─── Gemini Provider ─────────────────────────────────────────────────────────

export class GeminiProvider implements AIServiceProvider {
  private ai: GoogleGenAI;
  private defaultModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  // BUG FIX: this used to be the exact same string as `defaultModel`, so the
  // "retry with fallback model" branch below was a no-op — a failed call
  // just re-issued an identical call to the same model and (usually) failed
  // the same way, burning a second slice of the same rate-limit window for
  // nothing. Use a genuinely different, lighter/cheaper model here so a
  // retry actually has a different failure mode (e.g. still up when the
  // primary model's quota is exhausted).
  private fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(messages: BaristaMessage[], whatsappNumber = "14155550188"): Promise<string> {
    // Build catalog summary from site knowledge only (no DB in this context)
    // The route injects the catalog separately; here we use a placeholder that
    // gets replaced by the route before calling.
    const catalogPlaceholder = messages.find((m) => m.role === "system")?.content ?? "";

    const systemInstruction = buildSystemPrompt(catalogPlaceholder, whatsappNumber);

    // Cap history so a long conversation doesn't keep growing the token bill
    // on every single turn (see capHistory doc comment above).
    const userMessages = capHistory(messages);

    const history = userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Gemini requires at least one user turn
    const contents = history.length > 0 ? history : [{ role: "user", parts: [{ text: "Hello" }] }];

    const generateChatResponse = (model: string) =>
      withTimeout(
        this.ai.models.generateContent({
          model,
          contents: contents as any,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          },
        }),
        PROVIDER_TIMEOUT_MS,
        `Gemini chat (${model})`,
      );

    try {
      const response = await generateChatResponse(this.defaultModel);

      const raw = response.text?.trim() ?? "";
      // Validate it parses as JSON — if not, wrap it
      try {
        JSON.parse(raw);
        return raw;
      } catch {
        return JSON.stringify({ type: "text", content: raw || "I'm having trouble thinking right now." });
      }
    } catch (error) {
      console.error("Gemini chat error; retrying with fallback model:", error);

      if (this.defaultModel !== this.fallbackModel) {
        try {
          const response = await generateChatResponse(this.fallbackModel);
          const raw = response.text?.trim() ?? "";
          JSON.parse(raw);
          return raw;
        } catch (fallbackError) {
          console.error("Gemini fallback chat error:", fallbackError);
        }
      }

      // Throw instead of swallowing into a "text" reply — BaristaFallbackProvider
      // needs a real rejection to know it should try Groq. Returning a JSON
      // "text" reply here (as before) looks like a *successful* Gemini call,
      // so the wrapper's error-based failover never triggers, and only its
      // fragile string-matching fallback on the reply content kicks in.
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async parseNaturalLanguageOrder(text: string, catalog: MenuItemDTO[]): Promise<ParsedOrder> {
    const systemPrompt = `You are an AI Barista order parser.
You are given a natural language order and a catalog of available items.
Return ONLY valid JSON matching this schema:
{
  "ok": boolean, // true if you found items, false if it's not an order
  "items": [
    { "productId": number, "quantity": number, "customizations": { "milk": string, "temperature": string, "sweetness": string } }
  ],
  "error": string // populate if ok is false
}
Match the user's requested items to the closest available productId from the catalog.
If they ask for something completely not on the menu, set ok: false and provide a friendly error message.
Catalog:
${JSON.stringify(catalog, ["id", "name", "category", "milkOptions", "temperatureOptions"])}
`;

    try {
      const response = await withTimeout(
        this.ai.models.generateContent({
          model: this.defaultModel,
          contents: text,
          config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
        }),
        PROVIDER_TIMEOUT_MS,
        "Gemini parseNaturalLanguageOrder",
      );
      return JSON.parse(response.text || "{}") as ParsedOrder;
    } catch (error) {
      console.error("Gemini parse order error:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async recommendProducts(preferences: string[], catalog: MenuItemDTO[]): Promise<RecommendationResult[]> {
    const systemPrompt = `You are an AI Barista recommender.
Given customer preferences and a catalog, recommend 2-3 matching products.
Return ONLY valid JSON matching this schema:
[
  { "productId": number, "explanation": string }
]
The explanation should be 1-2 short sentences explaining why it fits their preferences.
Catalog:
${JSON.stringify(catalog, ["id", "name", "category", "temperatureOptions", "sweetnessLevel", "coffeeStrength", "isDairyFree"])}
Preferences: ${preferences.join(", ")}
`;

    try {
      const response = await withTimeout(
        this.ai.models.generateContent({
          model: this.defaultModel,
          contents: "Recommend products based on my preferences.",
          config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
        }),
        PROVIDER_TIMEOUT_MS,
        "Gemini recommendProducts",
      );
      return JSON.parse(response.text || "[]") as RecommendationResult[];
    } catch (error) {
      console.error("Gemini recommend error:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async generateBusinessInsights(ordersData: any[], catalog: MenuItemDTO[]): Promise<OwnerInsight[]> {
    const systemPrompt = `You are a coffee shop business analyst AI.
Analyze the provided recent orders data and the menu catalog to generate 3 actionable or interesting insights.
Return ONLY valid JSON matching this schema:
[
  { "title": string, "description": string, "type": "positive" | "negative" | "neutral" | "trend" }
]
Orders data: ${JSON.stringify(ordersData)}
`;
    try {
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: "Generate business insights.",
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
      });
      return JSON.parse(response.text || "[]") as OwnerInsight[];
    } catch (error) {
      console.error("Gemini insights error:", error);
      return [];
    }
  }

  async analyzeReviews(reviewsData: any[]): Promise<ReviewSentimentSummary> {
    const systemPrompt = `You are a customer feedback analyst.
Analyze the provided customer reviews and generate a sentiment summary.
Return ONLY valid JSON matching this schema:
{
  "positivePercentage": number, // 0 to 100
  "mostPraised": string, // short phrase
  "mostComplained": string, // short phrase, or "None"
  "sampleQuotes": string[] // 2-3 short impactful quotes from the reviews
}
Reviews: ${JSON.stringify(reviewsData)}
`;
    try {
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: "Analyze reviews.",
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
      });
      return JSON.parse(response.text || "{}") as ReviewSentimentSummary;
    } catch (error) {
      console.error("Gemini reviews error:", error);
      return { positivePercentage: 0, mostPraised: "N/A", mostComplained: "N/A", sampleQuotes: [] };
    }
  }

  async ownerAssistantChat(messages: BaristaMessage[], toolsData: any): Promise<string> {
    const systemInstruction = `You are an AI assistant for the owner of Aureum Cafe.
You have access to recent sales metrics, top products, and reviews data.
Use this data to answer the owner's questions accurately and concisely. Do not make up metrics.
Data:
${JSON.stringify(toolsData)}
`;
    const history = capHistory(messages).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const contents = history.length > 0 ? history : [{ role: "user", parts: [{ text: "Hello" }] }];

    const generateOwnerResponse = (model: string) =>
      withTimeout(
        this.ai.models.generateContent({
          model,
          contents: contents as any,
          config: { systemInstruction },
        }),
        PROVIDER_TIMEOUT_MS,
        `Gemini ownerAssistantChat (${model})`,
      );

    try {
      const response = await generateOwnerResponse(this.defaultModel);
      return response.text || "I couldn't generate a response.";
    } catch (error: any) {
      console.error("Gemini owner chat error:", error?.message ?? error);

      if (this.defaultModel !== this.fallbackModel) {
        try {
          const response = await generateOwnerResponse(this.fallbackModel);
          return response.text || "I couldn't generate a response.";
        } catch (fallbackError: any) {
          console.error("Gemini owner fallback chat error:", fallbackError?.message ?? fallbackError);
        }
      }

      return `An error occurred while chatting with the owner assistant: ${error?.message ?? "Unknown error"}`;
    }
  }
}

// ─── Groq Provider ──────────────────────────────────────────────────────────

export class GroqProvider implements AIServiceProvider {
  private apiKey: string;
  // BUG/CONFIG FIX: "openai/gpt-oss-120b" is a big model, and on Groq's free
  // tier it is capped far tighter than the small instant models — roughly
  // 1,000 requests/day and a low per-minute token budget, vs. ~14,400
  // requests/day for llama-3.1-8b-instant. For a Barista chat/order-parsing
  // fallback (short, structured JSON answers, not deep reasoning), the 8B
  // instant model gives ~14x the daily headroom and responds several times
  // faster, which directly addresses both "exhausts too early" and "very
  // slow". Override with GROQ_MODEL if you specifically want the 120B model.
  private model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async complete(messages: { role: "system" | "user" | "assistant"; content: string }[], json = false): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      // AbortSignal.timeout keeps a hung/slow Groq call from stalling the
      // response for the default fetch timeout (which can be a minute or
      // more) — see withTimeout doc comment for why that matters when this
      // is itself already a fallback for a slow/failed Gemini call.
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const isRateLimited = response.status === 429;
      throw new Error(
        `Groq request failed with status ${response.status}${isRateLimited ? " (rate/quota limited)" : ""}: ${errorBody}`,
      );
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  async chat(messages: BaristaMessage[], whatsappNumber = "14155550188"): Promise<string> {
    const catalog = messages.find((message) => message.role === "system")?.content ?? "";
    const history = capHistory(messages).map((message) => ({ role: message.role, content: message.content }));
    const raw = await this.complete([
      { role: "system", content: buildSystemPrompt(catalog, whatsappNumber) },
      ...(history.length > 0 ? history : [{ role: "user" as const, content: "Hello" }]),
    ], true);

    try {
      JSON.parse(raw);
      return raw;
    } catch {
      return JSON.stringify({ type: "text", content: raw || "I'm having trouble thinking right now." });
    }
  }

  async parseNaturalLanguageOrder(text: string, catalog: MenuItemDTO[]): Promise<ParsedOrder> {
    const raw = await this.complete([
      {
        role: "system",
        content: `You are an AI Barista order parser. Return ONLY a JSON object with this shape: {"ok": boolean, "items": [{"productId": number, "quantity": number, "customizations": {"milk": string, "temperature": string, "sweetness": string}}], "error": string}. Match requests to this catalog and set ok false if no menu item matches: ${JSON.stringify(catalog, ["id", "name", "category", "milkOptions", "temperatureOptions"])}`,
      },
      { role: "user", content: text },
    ], true);
    return JSON.parse(raw) as ParsedOrder;
  }

  async recommendProducts(preferences: string[], catalog: MenuItemDTO[]): Promise<RecommendationResult[]> {
    const raw = await this.complete([
      {
        role: "system",
        content: `You are an AI Barista recommender. Return ONLY a JSON object with a "recommendations" array containing 2-3 objects shaped {"productId": number, "explanation": string}. Catalog: ${JSON.stringify(catalog, ["id", "name", "category", "temperatureOptions", "sweetnessLevel", "coffeeStrength", "isDairyFree"])}. Preferences: ${preferences.join(", ")}`,
      },
      { role: "user", content: "Recommend products based on my preferences." },
    ], true);
    const result = JSON.parse(raw) as { recommendations?: RecommendationResult[] };
    return result.recommendations ?? [];
  }

  async generateBusinessInsights(): Promise<OwnerInsight[]> {
    return [];
  }

  async analyzeReviews(): Promise<ReviewSentimentSummary> {
    return { positivePercentage: 0, mostPraised: "N/A", mostComplained: "N/A", sampleQuotes: [] };
  }

  async ownerAssistantChat(): Promise<string> {
    return "The AI Owner Assistant is currently unavailable.";
  }
}

// Keep owner features on Gemini while allowing barista requests to fail over.
export class BaristaFallbackProvider implements AIServiceProvider {
  constructor(private primary: AIServiceProvider, private fallback: AIServiceProvider) {}

  async chat(messages: BaristaMessage[], whatsappNumber?: string): Promise<string> {
    // Both providers now reject (throw) on real failure — including
    // timeouts and rate-limit/quota errors — instead of resolving with a
    // "temporarily offline" JSON string. That means this failover is driven
    // by actual error signals, not by string-sniffing the reply content, so
    // a genuine Gemini answer that happens to mention "offline" is never
    // mistaken for a failure, and a real failure never slips through as if
    // it succeeded.
    try {
      return await this.primary.chat(messages, whatsappNumber);
    } catch (error) {
      console.error("Primary AI barista chat failed; switching to Groq:", error);
      try {
        return await this.fallback.chat(messages, whatsappNumber);
      } catch (fallbackError) {
        console.error("Groq AI barista chat failed:", fallbackError);
        return JSON.stringify({ type: "text", content: "I'm temporarily offline. Please try that question again in a moment." });
      }
    }
  }

  async parseNaturalLanguageOrder(text: string, catalog: MenuItemDTO[]): Promise<ParsedOrder> {
    try {
      const result = await this.primary.parseNaturalLanguageOrder(text, catalog);
      return result.ok || !result.error?.startsWith("Failed") ? result : this.fallback.parseNaturalLanguageOrder(text, catalog);
    } catch (error) {
      console.error("Primary AI order parsing failed; switching to Groq:", error);
      return this.fallback.parseNaturalLanguageOrder(text, catalog);
    }
  }

  async recommendProducts(preferences: string[], catalog: MenuItemDTO[]): Promise<RecommendationResult[]> {
    try {
      const result = await this.primary.recommendProducts(preferences, catalog);
      return result.length > 0 ? result : this.fallback.recommendProducts(preferences, catalog);
    } catch (error) {
      console.error("Primary AI recommendations failed; switching to Groq:", error);
      return this.fallback.recommendProducts(preferences, catalog);
    }
  }

  generateBusinessInsights(ordersData: any[], catalog: MenuItemDTO[]) { return this.primary.generateBusinessInsights(ordersData, catalog); }
  analyzeReviews(reviewsData: any[]) { return this.primary.analyzeReviews(reviewsData); }
  ownerAssistantChat(messages: BaristaMessage[], toolsData: any) { return this.primary.ownerAssistantChat(messages, toolsData); }
}

// ─── Fallback Provider ────────────────────────────────────────────────────────

export class FallbackProvider implements AIServiceProvider {
  async chat(messages: BaristaMessage[], whatsappNumber?: string): Promise<string> {
    return JSON.stringify({
      type: "text",
      content: "The AI Barista is currently taking a coffee break (API key not configured). You can still browse the menu or use the Order tab!",
    });
  }

  async parseNaturalLanguageOrder(text: string, catalog: MenuItemDTO[]): Promise<ParsedOrder> {
    return { ok: false, items: [], error: "Natural language ordering is disabled (API key not configured)." };
  }

  async recommendProducts(preferences: string[], catalog: MenuItemDTO[]): Promise<RecommendationResult[]> {
    if (catalog.length > 0) {
      return [{ productId: catalog[0].id, explanation: "Our signature drink is always a great choice!" }];
    }
    return [];
  }

  async generateBusinessInsights(ordersData: any[], catalog: MenuItemDTO[]): Promise<OwnerInsight[]> {
    return [
      {
        title: "AI Disabled",
        description: "Configure an API key to see AI-generated business insights.",
        type: "neutral",
      },
    ];
  }

  async analyzeReviews(reviewsData: any[]): Promise<ReviewSentimentSummary> {
    return {
      positivePercentage: 100,
      mostPraised: "Coffee",
      mostComplained: "None",
      sampleQuotes: ["Configure an API key to analyze reviews."],
    };
  }

  async ownerAssistantChat(messages: BaristaMessage[], toolsData: any): Promise<string> {
    return "I am currently offline. Please configure a valid API key to enable the AI Owner Assistant.";
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getAIProvider(): AIServiceProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (geminiKey && groqKey) {
    return new BaristaFallbackProvider(new GeminiProvider(geminiKey), new GroqProvider(groqKey));
  }

  if (geminiKey) {
    return new GeminiProvider(geminiKey);
  }

  if (groqKey) {
    return new GroqProvider(groqKey);
  }

  return new FallbackProvider();
}
