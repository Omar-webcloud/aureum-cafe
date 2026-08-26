# Aureum Cafe — AI-Powered Order Platform

A Next.js 16 (App Router) coffee shop e-commerce platform featuring an integrated AI Barista, intelligent product recommendations, natural language order parsing, and a comprehensive Owner Dashboard with AI business insights and review sentiment analysis.

## Core Features

- **AI Barista Assistant**: A beautiful floating chat widget built with Lucide icons and Tailwind. Customers can chat about the menu, explore ingredients, or just ask what to order!
- **Natural Language Ordering**: The AI parses "2 iced lattes with oat milk and a croissant" securely into structured JSON and places it seamlessly into your active cart.
- **Smart Recommendation Engine**: Take a quick 3-question quiz (e.g. Cold, Sweet, Non-Dairy) and get instant product cards with 1-click Add to Cart buttons.
- **AI Owner Dashboard**: Private dashboard at `/owner` (PIN: 1234) providing:
  - Real-time sales metrics (Revenue, Orders, AOV).
  - Generative AI Business Insights based on recent order history.
  - Review Sentiment Analysis (Taste, Quality, Service scoring).
  - Owner Assistant chat to query business analytics.
- **WhatsApp Checkout Engine**: Works untouched! Cart checkout securely creates structured orders and formats a polished WhatsApp message to the shop.

## Why AI?

Traditional filtering (checking boxes for "dairy-free", "cold", "under $5") is mechanical and overwhelming for new customers. The AI Barista provides a warm, conversational, hospitality-first layer:
- **Zero Hallucination Guarantee**: The system prompt rigidly bounds the AI to only use actual `menuItems` rows from the database. It will never invent a discount, ingredient, or fake drink.
- **Structured Tool Validation**: Freeform text is securely translated into strict JSON schemas ensuring no rogue data bypasses the database constraints.
- **Cost Efficiency**: Simple DB lookups power the UI first. AI is only used when processing freeform intent, and relies on fast, cost-effective models like Gemini 2.5 Flash.

## AI Architecture

```text
Customer
   ↓
AI Barista Widget (Client)
   ↓
/api/ai/barista (Next.js Edge Route)
   ↓
AIServiceProvider Interface
   ├── GeminiProvider (@google/genai)
   └── FallbackProvider (Offline/No-key fallback)
   ↓
Validated structured output (JSON Schema)
   ↓
Client-Side Cart Context
   ↓
WhatsApp API (Checkout)
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. (Optional) Add your Google Gemini API key to enable AI features. If omitted, the app will gracefully use the `FallbackProvider`.
Create a `.env.local` file:
```env
GEMINI_API_KEY=your_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Navigate to `http://localhost:3000` to browse the store and chat with the AI Barista.
5. Navigate to `http://localhost:3000/owner` (Passcode: 1234) to view AI Analytics.
