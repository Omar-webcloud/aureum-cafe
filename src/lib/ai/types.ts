import type { MenuItemDTO } from "@/lib/types";

export type BaristaMessageRole = "user" | "assistant" | "system";

export type BaristaMessage = {
  role: BaristaMessageRole;
  content: string;
};

export type ParsedOrderLine = {
  productId: number;
  quantity: number;
  customizations?: {
    milk?: string;
    temperature?: string;
    sweetness?: string;
  };
};

export type ParsedOrder = {
  ok: boolean;
  items: ParsedOrderLine[];
  error?: string;
};

export type RecommendationRequest = {
  preferences: string[]; // e.g. ["cold", "sweet", "non-dairy"]
};

export type RecommendationResult = {
  productId: number;
  explanation: string;
};

export type ReviewSentimentSummary = {
  positivePercentage: number;
  mostPraised: string;
  mostComplained: string;
  sampleQuotes: string[];
};

export type OwnerInsight = {
  title: string;
  description: string;
  type: "positive" | "negative" | "neutral" | "trend";
};

/**
 * Structured reply the AI Barista returns for every chat turn.
 * The widget parses this and executes the appropriate frontend action.
 */
export type BaristaReply =
  | { type: "text";     content: string }
  | { type: "navigate"; anchor: string;  message: string }
  | { type: "whatsapp"; waUrl: string;   message: string }
  | { type: "formFill"; name?: string;   phone?: string; pickup?: string; notes?: string; message: string }
  | { type: "openCart"; message: string };

export interface AIServiceProvider {
  chat(messages: BaristaMessage[], whatsappNumber?: string): Promise<string>;
  parseNaturalLanguageOrder(text: string, catalog: MenuItemDTO[]): Promise<ParsedOrder>;
  recommendProducts(preferences: string[], catalog: MenuItemDTO[]): Promise<RecommendationResult[]>;
  generateBusinessInsights(ordersData: any[], catalog: MenuItemDTO[]): Promise<OwnerInsight[]>;
  analyzeReviews(reviewsData: any[]): Promise<ReviewSentimentSummary>;
  ownerAssistantChat(messages: BaristaMessage[], toolsData: any): Promise<string>;
}
