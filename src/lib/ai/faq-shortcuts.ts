import type { BaristaReply } from "./types";
import { shop } from "@/lib/shop";

// ─────────────────────────────────────────────────────────────────────────
// Why this file exists
// ─────────────────────────────────────────────────────────────────────────
// The AI Barista widget ships six "quick action" pills (hours, location,
// story, origins, how-to-order, WhatsApp) that every visitor sees on their
// very first open of the chat. Historically EVERY one of those taps — plus
// every natural-language rephrasing of the same six questions — triggered a
// full LLM call: the full SITE_KNOWLEDGE block + the full menu catalog sent
// as a system prompt, just to answer something that has one fixed, correct
// answer that never depends on the model.
//
// That is a huge share of real traffic (it's the first thing shown to every
// new visitor) spent on zero-variance questions, and it's the single
// biggest lever for the "exhausts too early" symptom: cutting these out
// entirely removes that traffic from the Gemini/Groq rate-limit and token
// budget altogether, before we've even talked about the model.
//
// This is intentionally a small, conservative keyword matcher — it should
// only fire on close matches to the six known quick actions and obvious
// rephrasings. Anything remotely ambiguous falls through to the real AI so
// answer quality never regresses.

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

function hoursText(): string {
  const lines = shop.hours.map((h) => `${h.day}: ${h.time}`).join("\n");
  return `Here are our hours:\n${lines}\n\nWe're at ${shop.addressLine1}, ${shop.addressLine2} — walk-ins always welcome, no reservation needed.`;
}

function locationText(): string {
  return `We're at ${shop.addressLine1}, ${shop.addressLine2} (${shop.neighborhood}). Walk-ins are always welcome — you can also tap "Visit us" on the site for directions and a WhatsApp chat button.`;
}

function storyText(): string {
  return `Aureum began as a Thursday roasting club above a Mercer Street walk-up. If a lot can't stand on its own as a filter pour, it doesn't touch the espresso machine — small batches, a 12-hour roast rest, and every ticket still goes out with a name.`;
}

function originsText(): string {
  const list = shop.origins.join(", ");
  return `Our coffee comes from six direct-trade lots: ${list}. We source, roast in small weekly batches, then pour to order from tickets written the same way at the bar.`;
}

function howToOrderText(): string {
  return `Browse the menu, add items to your tray, then fill in your name, WhatsApp number, and pickup time in the cart — your order gets sent straight to the bar on WhatsApp. You can also just tell me what you'd like in the Order tab and I'll add it to your tray for you.`;
}

/**
 * Returns a deterministic BaristaReply for a close match to one of the six
 * known quick-action questions (or an obvious rephrasing), or `null` if the
 * message should be answered by the real AI provider instead.
 */
export function matchFaqShortcut(lastUserMessage: string, whatsappNumber: string): BaristaReply | null {
  const text = normalize(lastUserMessage);
  if (!text) return null;

  // "Order on WhatsApp" — open WhatsApp directly, same as the AI would.
  if (hasAny(text, ["whatsapp"]) && hasAny(text, ["order", "chat", "message", "text you"])) {
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi Aureum! I'd like to place an order.")}`;
    return { type: "whatsapp", waUrl, message: "Opening WhatsApp for you now!" };
  }

  // Hours
  if (hasAny(text, ["hour", "open", "close", "closing", "what time"])) {
    return { type: "text", content: hoursText() };
  }

  // Location / address
  if (hasAny(text, ["located", "location", "address", "where are you", "where is aureum", "directions"])) {
    return { type: "text", content: locationText() };
  }

  // Story / about
  if (hasAny(text, ["story", "about aureum", "history", "how did aureum start", "who are you"])) {
    return { type: "text", content: storyText() };
  }

  // Coffee origins
  if (hasAny(text, ["origin", "where does your coffee come from", "where do you source", "which farms", "beans come from"])) {
    return { type: "text", content: originsText() };
  }

  // How to order (generic, not the WhatsApp-specific case above)
  if (hasAny(text, ["how do i order", "how to order", "how do i place an order", "how does ordering work"])) {
    return { type: "text", content: howToOrderText() };
  }

  return null;
}
