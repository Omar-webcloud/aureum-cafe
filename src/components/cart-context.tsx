"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CartLine, MenuItemDTO } from "@/lib/types";

type CartContextValue = {
  items: CartLine[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: MenuItemDTO, quantity?: number) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  removeItem: (menuItemId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((item: MenuItemDTO, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((line) => line.menuItemId === item.id);
      if (existing) {
        return current.map((line) =>
          line.menuItemId === item.id ? { ...line, quantity: Math.min(20, line.quantity + quantity) } : line,
        );
      }
      return [
        ...current,
        {
          menuItemId: item.id,
          slug: item.slug,
          name: item.name,
          priceCents: item.priceCents,
          quantity,
          imageUrl: item.imageUrl,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((menuItemId: number, quantity: number) => {
    setItems((current) => {
      if (quantity <= 0) {
        return current.filter((line) => line.menuItemId !== menuItemId);
      }
      return current.map((line) =>
        line.menuItemId === menuItemId ? { ...line, quantity: Math.min(20, quantity) } : line,
      );
    });
  }, []);

  const removeItem = useCallback((menuItemId: number) => {
    setItems((current) => current.filter((line) => line.menuItemId !== menuItemId));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, line) => sum + line.quantity, 0),
      subtotalCents: items.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((open) => !open),
      addItem,
      setQuantity,
      removeItem,
      clear: () => setItems([]),
    }),
    [addItem, isOpen, items, removeItem, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
