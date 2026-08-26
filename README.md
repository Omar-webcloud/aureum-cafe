# AUREUM — Specialty Coffee Atelier

> **Live site:** [aureum-cafe.vercel.app](https://aureum-cafe.vercel.app)

A full-stack specialty coffee storefront built with Next.js 16. Customers browse a curated menu, chat with an AI Barista, and place orders that arrive at the bar via WhatsApp. Staff manage tickets on a live kitchen display. The owner monitors real-time analytics and chats with an AI business assistant.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Flows](#user-flows)
  - [1. Browsing the Menu](#1-browsing-the-menu)
  - [2. AI Barista — Chat \& Q\&A](#2-ai-barista--chat--qa)
  - [3. AI Barista — Recommendations](#3-ai-barista--recommendations)
  - [4. AI Barista — Natural Language Order](#4-ai-barista--natural-language-order)
  - [5. Cart & Checkout](#5-cart--checkout)
  - [6. WhatsApp Order Confirmation](#6-whatsapp-order-confirmation)
- [Admin / Staff Flows](#admin--staff-flows)
  - [Kitchen Display (Ticket Rail)](#kitchen-display-ticket-rail)
  - [Owner Dashboard](#owner-dashboard)
  - [AI Owner Assistant](#ai-owner-assistant)
- [API Reference](#api-reference)
- [Design System](#design-system)
  - [Color Palette](#color-palette)
  - [Typography](#typography)
  - [Spacing & Layout](#spacing--layout)
  - [Component Patterns](#component-patterns)
  - [Animations](#animations)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS v4 (custom `@theme` tokens) |
| Fonts | Cormorant Garamond (display) · Outfit (sans) via `next/font` |
| AI | Google Gemini (`gemini-3.6-flash`) via `@google/genai` |
| ORM | Drizzle ORM (schema-defined, in-memory store for serverless) |
| Icons | Lucide React |
| Messaging | WhatsApp Cloud API (optional) |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout — fonts, CartProvider, metadata
│   ├── page.tsx            # Storefront (customer-facing)
│   ├── globals.css         # Design tokens + global styles
│   ├── kitchen/
│   │   └── page.tsx        # Kitchen ticket rail (staff)
│   ├── owner/
│   │   └── page.tsx        # Owner analytics dashboard
│   └── api/
│       ├── ai/
│       │   ├── barista/    # POST /api/ai/barista
│       │   └── owner/      # POST /api/ai/owner
│       ├── analytics/      # GET /api/analytics
│       ├── orders/         # GET|POST|PATCH /api/orders
│       ├── menu/           # GET /api/menu
│       ├── reviews/        # GET|POST /api/reviews
│       └── health/         # GET /api/health
├── components/
│   ├── landing-sections.tsx  # Hero, Marquee, Story, Ritual, Testimonials, Visit, Footer, WhatsAppFab
│   ├── menu-board.tsx        # FeaturedMenu + FullMenu grids
│   ├── cart-context.tsx      # Global cart state (React context)
│   ├── cart-drawer.tsx       # Slide-out cart + checkout form
│   ├── ai-barista-widget.tsx # Floating AI chatbot widget
│   ├── site-header.tsx       # Sticky nav header
│   └── mobile-dock.tsx       # Bottom nav bar for mobile
├── db/
│   ├── index.ts    # In-memory database (Drizzle API compatible)
│   ├── schema.ts   # Table definitions
│   └── seed.ts     # Menu seed data (auto-runs on first request)
└── lib/
    ├── ai/
    │   ├── provider.ts      # GeminiProvider + FallbackProvider
    │   ├── rate-limiter.ts  # IP-based rate limiting
    │   └── types.ts         # AI-specific type definitions
    ├── menu.ts    # getMenu() — fetches seeded menu items
    ├── money.ts   # formatUsd() — cents → "$X.XX"
    ├── shop.ts    # Shop constants (name, address, hours, origins)
    ├── types.ts   # Shared DTOs (MenuItemDTO, OrderResponse, etc.)
    └── whatsapp.ts # WhatsApp message formatting + Cloud API sender
```

---

## User Flows

### 1. Browsing the Menu

The storefront (`/`) is a single long-scroll page composed of these sections in order:

| Section | Description |
|---|---|
| **SiteHeader** | Sticky top bar with wordmark and cart icon showing item count |
| **Hero** | Full-viewport background image, large display headline, two CTAs |
| **OriginMarquee** | Auto-scrolling ticker listing the 6 active origin lots |
| **FeaturedMenu** | Horizontally scrollable cards for featured items with Add to Cart |
| **Story** | Two-column split: barista photo + brand narrative + 3 stats |
| **FullMenu** | Tabbed grid (Espresso · Brew · Seasonal · Kitchen) with all items |
| **Ritual** | Three-step numbered cards: Source → Roast → Pour |
| **Testimonials** | Three customer quote cards |
| **Visit** | Interior photo + hours, address, WhatsApp & Directions CTAs |
| **SiteFooter** | Wordmark, tagline, nav links, kitchen link |

**Mobile navigation** is handled by a bottom dock (`MobileDock`) with links to Menu, Cart, and the AI Barista trigger.

---

### 2. AI Barista — Chat & Q&A

1. Customer taps the **"Ask AI Barista"** floating button (bottom-right).
2. A slide-up panel opens with three tabs: **Chat & Q&A · Help Me Choose · Order**.
3. In **Chat & Q&A**, the customer types any question (e.g. "What's your most popular cold brew?" or "Is the Yirgacheffe acidic?").
4. The message is sent to `POST /api/ai/barista` with `action: "chat"` and the full message history.
5. The Gemini model replies in-character as an expert barista.
6. Typing indicator (three bouncing dots) shows while the model responds.

---

### 3. AI Barista — Recommendations

1. Customer switches to the **"Help Me Choose"** tab.
2. They select preference chips: `Hot`, `Cold`, `Sweet`, `Not sweet`, `Strong coffee`, `Dairy-free`, `Pastry`.
3. Tapping **"Find My Drink"** sends `POST /api/ai/barista` with `action: "recommend"` and the selected preferences.
4. Gemini returns 2–3 product matches with explanations.
5. Each recommendation card shows: product image, name, AI explanation, price, and an **Add** button that adds directly to the cart.

---

### 4. AI Barista — Natural Language Order

1. Customer switches to the **"Order"** tab.
2. A hint shows an example: *"I want 2 iced lattes with oat milk and a butter croissant."*
3. The customer types a free-text order.
4. The request is sent to `POST /api/ai/barista` with `action: "parseOrder"`.
5. Gemini parses the natural language against the live menu catalog and returns structured `ParsedOrder` JSON.
6. On success, a confirmation message is shown. On failure (item not on menu), the barista explains what's available.

---

### 5. Cart & Checkout

1. Customer adds items via **"Add to cart"** buttons on any menu card.
2. The **CartDrawer** slides in from the right, showing:
   - Item thumbnails, names, prices
   - `–` / `+` quantity controls
   - Per-line subtotals
   - Remove button per item
3. At the bottom, the customer fills in:
   - **Name** (required)
   - **WhatsApp number** (required, used to pre-fill the message)
   - **Pickup time** — dropdown: "As soon as ready" / 15 min / 30 min / 45 min / 1 hour
   - **Notes** (optional — e.g. "oat milk, extra hot, no foam")
4. Tapping **"Order on WhatsApp · $X.XX"** submits `POST /api/orders`.
5. The server:
   - Saves the order to the in-memory store
   - Generates a reference code (e.g. `AUR-0042`)
   - Builds a pre-formatted WhatsApp message URL
   - Optionally sends via WhatsApp Cloud API if configured

---

### 6. WhatsApp Order Confirmation

After a successful order submission:

1. The cart drawer shows a **confirmation screen** with the order reference and total.
2. A **"Open WhatsApp"** button opens the pre-filled WhatsApp message in a new tab, ready to send to the bar.
3. The WhatsApp message includes: reference code, customer name, each item + quantity, pickup time, any notes, and the total.
4. The customer taps Send in WhatsApp — the order lands in the bar's chat.
5. Tapping **"Back to the menu"** closes the drawer and resets the cart.

---

## Admin / Staff Flows

### Kitchen Display (Ticket Rail)

**URL:** `/kitchen`  
**Access:** Public (linked from footer as "For the bar")

1. The page loads all active orders from `/api/orders`.
2. Orders refresh **automatically every 8 seconds** via `setInterval`.
3. Each ticket card shows:
   - Reference code (e.g. `AUR-0042`) and customer name
   - Phone number and pickup time
   - Itemized list with quantities and line totals
   - Notes (italicised in gold)
   - Four status buttons: `pending · preparing · ready · completed`
4. The active status button is highlighted in gold (`bg-gold text-ink`). Others are outlined.
5. Clicking a status button sends `PATCH /api/orders` with the order `id` and new `status`, then refreshes.

---

## Owner Dashboard

**URL:** `/owner`  
**Access:** PIN-protected (default PIN: `1234`)

1. A centered lock screen prompts for a PIN.
2. On correct entry, the dashboard loads three data sources in parallel:
   - `GET /api/analytics` — revenue and order totals
   - `POST /api/ai/owner` (`action: "insights"`) — AI-generated business insights
   - `POST /api/ai/owner` (`action: "reviewsAnalysis"`) — AI sentiment summary
3. A spinner shows while loading. On load, the layout splits into two columns:

**Left column (2/3 width):**

| Panel | Content |
|---|---|
| **KPI Cards** | Total Revenue · Total Orders · Average Order Value |
| **AI Business Insights** | 3 AI-generated cards, each tagged `positive` (green ↑) / `negative` (red ↓) / `neutral`/`trend` (amber ⚡) |
| **AI Customer Sentiment** | Circular progress ring showing positive % · Most Praised · Most Complained · Key customer quotes |

**Right column (1/3 width):**
- The AI Owner Assistant chat panel (see below).

A **"Refresh Data"** button re-fetches all three endpoints on demand. A **"View Storefront"** link goes back to `/`.

---

## AI Owner Assistant

Embedded in the right column of `/owner`:

1. Pre-loaded with a greeting from the assistant.
2. The owner types any business question (e.g. "What are my top-selling items?", "How's revenue trending?").
3. On send, `POST /api/ai/owner` with `action: "chat"` is called, passing full message history and a snapshot of `{ totalOrders, totalRevenueCents, reviewsCount, catalogSize }` as context.
4. The Gemini model replies with data-grounded answers.
5. Typing indicator (three bouncing dots) appears while the model responds.
6. Enter key submits. The send button is disabled while a response is in flight.

---

## API Reference

### `GET /api/health`
Returns `{ ok: true }`. Used for uptime checks.

### `GET /api/menu`
Returns the full menu catalog as `MenuItemDTO[]`.

### `GET /api/orders`
Returns `{ orders: KitchenOrder[] }` — all orders with their items.

### `POST /api/orders`
Places a new order.  
**Body:** `{ customerName, customerPhone, pickupTime?, notes?, items: [{ menuItemId, quantity }] }`  
**Returns:** `OrderResponse` — `{ ok, reference, totalCents, whatsappUrl, cloudSent }`

### `PATCH /api/orders`
Updates an order's status.  
**Body:** `{ id: number, status: "pending" | "preparing" | "ready" | "completed" }`

### `GET /api/analytics`
Returns `{ totalRevenueCents, totalOrders, avgOrderValueCents, topProducts[] }`.

### `GET|POST /api/reviews`
`GET` returns all reviews. `POST` submits a new review.

### `POST /api/ai/barista`
AI barista endpoint. Rate-limited by IP.

| `action` | Payload | Returns |
|---|---|---|
| `"chat"` | `{ messages: BaristaMessage[] }` | `{ reply: string }` |
| `"parseOrder"` | `{ text: string }` | `{ parsedOrder: ParsedOrder }` |
| `"recommend"` | `{ preferences: string[] }` | `{ recommendations: RecommendationResult[] }` |

### `POST /api/ai/owner`
Owner analytics AI endpoint. Rate-limited by IP.

| `action` | Payload | Returns |
|---|---|---|
| `"chat"` | `{ messages: BaristaMessage[] }` | `{ reply: string }` |
| `"insights"` | *(none)* | `{ insights: OwnerInsight[] }` |
| `"reviewsAnalysis"` | *(none)* | `{ analysis: ReviewSentimentSummary }` |

---

## Design System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#140e0a` | Primary text, backgrounds (dark sections) |
| `espresso` | `#1c1410` | Deepest dark — hero overlays |
| `roast` | `#2a1d16` | Mid-dark — cards on dark backgrounds |
| `gold` | `#c4a36a` | Primary accent — CTAs, labels, highlights |
| `gold-light` | `#e4d0a8` | Hover state for gold |
| `gold-deep` | `#8d6b34` | Secondary accent — captions on light backgrounds |
| `cream` | `#f3ebe1` | Light section backgrounds (Testimonials) |
| `foam` | `#faf7f2` | Default page background, cart drawer |
| `mist` | `#d7cfc4` | Borders and dividers on light backgrounds |

All tokens are defined in `globals.css` using Tailwind v4's `@theme` block and are available as `bg-*`, `text-*`, `border-*` utilities.

---

### Typography

| Role | Font | Weights | Usage |
|---|---|---|---|
| **Display** | Cormorant Garamond | 400 · 500 · 600 · 700 | Headlines, wordmark, pull quotes |
| **Sans** | Outfit | 300 · 400 · 500 · 600 | Body, labels, UI text |

Applied via CSS variables `--font-cormorant` and `--font-outfit`, loaded with `next/font/google` for zero-layout-shift.

**Label convention:** Small-caps labels use `text-[11px] uppercase tracking-[0.32em]` to achieve a refined editorial feel without requiring an additional typeface.

---

### Spacing & Layout

- **Max content width:** `max-w-6xl` (72rem) centered with `mx-auto`
- **Horizontal padding:** `px-5 sm:px-8`
- **Section vertical padding:** `py-24` (96px)
- **Card border radius:** `rounded-[28px]` to `rounded-[32px]` for large cards; `rounded-2xl` for smaller UI cards
- **Grid:** 1 column mobile → 2 columns tablet → 3 columns desktop, using `grid gap-*`

---

### Component Patterns

#### Buttons

| Variant | Classes | Usage |
|---|---|---|
| **Primary (gold)** | `bg-gold text-ink rounded-full px-7 h-12 hover:bg-gold-light` | Primary CTA |
| **Ghost (bordered)** | `border border-foam/25 text-foam rounded-full px-7 h-12 hover:border-gold` | Secondary CTA on dark |
| **WhatsApp** | `bg-[#25D366] text-white rounded-full` | WhatsApp actions |
| **Dark fill** | `bg-ink text-foam rounded-full` | Submit / confirm on light |
| **Status pill** | `rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]` | Kitchen status buttons |

#### Cards

Dark section cards use `border border-foam/10 bg-roast/60 rounded-[28px] p-8`.  
Light section cards use `bg-white shadow-[0_18px_50px_rgba(20,14,10,0.05)] rounded-[28px] p-8`.

#### Cart Drawer

Slides in from the right using `translate-x-full → translate-x-0` with `transition-transform duration-500 ease-out`. Backdrop uses `bg-ink/60 backdrop-blur-sm`.

#### AI Widget

Floats fixed at `bottom-6 right-6`, `w-full max-w-sm sm:max-w-md h-[600px]`, with `backdrop-blur-xl` glass effect.

---

### Animations

| Name | CSS | Used in |
|---|---|---|
| **Marquee** | `@keyframes marquee` — `translateX(0 → -50%)` over 32s linear infinite | Origin lot ticker |
| **Grain overlay** | SVG fractal noise at `opacity: 0.16`, `mix-blend-mode: overlay` | Hero section |
| **Typing indicator** | Tailwind `animate-bounce` with `animation-delay` stagger (`-0.3s`, `-0.15s`, `0s`) | AI chat panels |
| **Cart slide** | `transition-transform duration-500 ease-out` | Cart drawer |
| **Spinner** | `animate-spin border-4 border-amber-500 border-t-transparent rounded-full` | Owner dashboard loading |
| **Hover scale** | `hover:scale-105 transition` | WhatsApp FAB |

---

## Environment Variables

Add these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google AI Studio key. Powers all AI features. Get one at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `WHATSAPP_NUMBER` | ⚠️ Optional | The bar's WhatsApp number (digits only, e.g. `14155550188`). Falls back to the demo number. |
| `WHATSAPP_TOKEN` | ⚠️ Optional | WhatsApp Cloud API access token. Required to send orders server-side via the API. |
| `WHATSAPP_PHONE_NUMBER_ID` | ⚠️ Optional | WhatsApp Cloud API phone number ID. Required alongside `WHATSAPP_TOKEN`. |

> **Note:** The database is fully in-memory. No `DATABASE_URL` is required. All data (orders, reviews) resets on each serverless cold start. For production persistence, swap `src/db/index.ts` for a real Drizzle adapter (Neon, Turso, etc.).

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/your-org/aureum-cafe.git
cd aureum-cafe

# 2. Install
npm install

# 3. Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your GEMINI_API_KEY

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

**Routes available locally:**

| URL | Description |
|---|---|
| `http://localhost:3000/` | Customer storefront |
| `http://localhost:3000/kitchen` | Kitchen ticket rail |
| `http://localhost:3000/owner` | Owner dashboard (PIN: `1234`) |
| `http://localhost:3000/api/health` | Health check |

---

## Deployment

This project is deployed on **Vercel** with zero configuration beyond environment variables.

1. Push to the `main` branch → Vercel auto-deploys.
2. Set environment variables in **Vercel → Project → Settings → Environment Variables**.
3. No build command override needed (`next build` is the default).
4. No database provisioning needed (in-memory store).

**Live URL:** [https://aureum-cafe.vercel.app](https://aureum-cafe.vercel.app)
