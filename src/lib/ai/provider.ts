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

export class GeminiProvider implements AIServiceProvider {
  private ai: GoogleGenAI;
  private defaultModel = "gemini-2.5-flash";

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(messages: BaristaMessage[]): Promise<string> {
    const systemInstruction = messages.find((m) => m.role === "system")?.content || "";
    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    try {
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: history as any,
        config: { systemInstruction },
      });
      return response.text || "I'm having trouble processing that right now.";
    } catch (error) {
      console.error("Gemini chat error:", error);
      return "I'm having trouble connecting to my coffee brain right now.";
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
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: text,
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
      });
      return JSON.parse(response.text || "{}") as ParsedOrder;
    } catch (error) {
      console.error("Gemini parse order error:", error);
      return { ok: false, items: [], error: "Failed to parse order." };
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
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: "Recommend products based on my preferences.",
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
      });
      return JSON.parse(response.text || "[]") as RecommendationResult[];
    } catch (error) {
      console.error("Gemini recommend error:", error);
      return [];
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
    const history = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    try {
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: history as any,
        config: { systemInstruction },
      });
      return response.text || "I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini owner chat error:", error);
      return "An error occurred while chatting with the owner assistant.";
    }
  }
}

export class FallbackProvider implements AIServiceProvider {
  async chat(messages: BaristaMessage[]): Promise<string> {
    return "The AI Barista is currently taking a coffee break (API key not configured). Please browse the menu manually!";
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

export function getAIProvider(): AIServiceProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiProvider(geminiKey);
  }
  
  // Note: Could add GroqProvider here in the future
  
  return new FallbackProvider();
}
