"use client";

import { useCart } from "@/components/cart-context";
import { formatUsd } from "@/lib/money";

export function MobileDock() {
  const { count, subtotalCents, openCart } = useCart();
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 md:hidden">
      <button
        type="button"
        onClick={openCart}
        className="flex h-14 w-full items-center justify-between rounded-full bg-ink px-6 text-foam shadow-[0_16px_40px_rgba(20,14,10,0.35)]"
      >
        <span className="text-[11px] uppercase tracking-[0.2em]">View tray · {count}</span>
        <span className="text-sm">{formatUsd(subtotalCents)}</span>
      </button>
    </div>
  );
}
