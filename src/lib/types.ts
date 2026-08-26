export type MenuCategory = "espresso" | "brew" | "seasonal" | "kitchen";

export type MenuItemDTO = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: MenuCategory;
  priceCents: number;
  imageUrl: string;
  featured: boolean;
  available: boolean;
  tag: string | null;
  ingredients: string | null;
  allergens: string | null;
  milkOptions: string | null;
  temperatureOptions: string | null;
  sweetnessLevel: string | null;
  coffeeStrength: string | null;
  isDairyFree: boolean;
  isGlutenFree: boolean;
};

export type CartLine = {
  menuItemId: number;
  slug: string;
  name: string;
  priceCents: number;
  quantity: number;
  imageUrl: string;
};

export type OrderPayload = {
  customerName: string;
  customerPhone: string;
  pickupTime?: string;
  notes?: string;
  items: Array<{
    menuItemId: number;
    quantity: number;
  }>;
};

export type OrderResponse = {
  ok: true;
  reference: string;
  totalCents: number;
  whatsappUrl: string;
  cloudSent: boolean;
};

export type OrderError = {
  ok: false;
  error: string;
};

export type KitchenOrder = {
  id: number;
  reference: string;
  customerName: string;
  customerPhone: string;
  pickupTime: string | null;
  notes: string | null;
  status: string;
  totalCents: number;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
};

export type ReviewDTO = {
  id: number;
  customerName: string;
  rating: number;
  comment: string;
  category: string | null;
  createdAt: string;
};

