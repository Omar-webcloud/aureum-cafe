"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { formatUsd } from "@/lib/money";
import type { OrderError, OrderResponse } from "@/lib/types";
import { useCart } from "@/components/cart-context";

const pickupWindows = ["As soon as ready", "15 minutes", "30 minutes", "45 minutes", "1 hour"];

export function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, removeItem, subtotalCents, clear, count } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState(pickupWindows[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<OrderResponse | null>(null);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          pickupTime,
          notes,
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
        }),
      });

      const payload = (await response.json()) as OrderResponse | OrderError;
      if (!response.ok || !payload.ok) {
        setError("ok" in payload && !payload.ok ? payload.error : "Unable to place the order.");
        return;
      }

      setConfirmation(payload);
      clear();
      window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("The atelier is momentarily offline. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setConfirmation(null);
    setCustomerName("");
    setCustomerPhone("");
    setPickupTime(pickupWindows[0]);
    setNotes("");
    setError(null);
    closeCart();
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gold/20 bg-foam text-ink shadow-[-24px_0_80px_rgba(20,14,10,0.28)] transition-transform duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">Your tray</p>
            <h2 className="font-display text-3xl">
              {confirmation ? "Order composed" : count ? `${count} selected` : "Empty for now"}
            </h2>
          </div>
          <button
            type="button"
            onClick={confirmation ? resetAndClose : closeCart}
            className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 text-sm transition hover:border-gold hover:text-gold-deep"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {confirmation ? (
          <div className="flex flex-1 flex-col justify-between px-6 py-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">{confirmation.reference}</p>
              <p className="mt-4 font-display text-4xl leading-none">Send it on WhatsApp</p>
              <p className="mt-4 text-sm leading-6 text-ink/70">
                We saved the ticket and opened a WhatsApp message to the bar. If it did not appear, tap below.
              </p>
              <p className="mt-6 text-sm text-ink/60">Total {formatUsd(confirmation.totalCents)}</p>
            </div>
            <div className="space-y-3">
              <a
                href={confirmation.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center rounded-full bg-[#25D366] text-sm font-medium text-white transition hover:brightness-95"
              >
                Open WhatsApp
              </a>
              <button
                type="button"
                onClick={resetAndClose}
                className="flex h-12 w-full items-center justify-center rounded-full border border-ink/15 text-sm"
              >
                Back to the menu
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <p className="pt-8 text-sm leading-6 text-ink/60">
                  Add a pour, a pastry, or the corner table set. We will compose a WhatsApp ticket for the bar.
                </p>
              ) : (
                items.map((item) => (
                  <div key={item.menuItemId} className="flex gap-4 border-b border-ink/10 pb-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-sm">{formatUsd(item.priceCents * item.quantity)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-ink/15">
                          <button
                            type="button"
                            className="h-8 w-8"
                            onClick={() => setQuantity(item.menuItemId, item.quantity - 1)}
                            aria-label={`Decrease ${item.name}`}
                          >
                            –
                          </button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            className="h-8 w-8"
                            onClick={() => setQuantity(item.menuItemId, item.quantity + 1)}
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.menuItemId)}
                          className="text-xs uppercase tracking-[0.18em] text-ink/45 hover:text-ink"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={placeOrder} className="space-y-3 border-t border-ink/10 bg-white/60 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs uppercase tracking-[0.16em] text-ink/50">
                  Name
                  <input
                    required
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-ink/10 bg-white px-3 text-sm tracking-normal text-ink outline-none ring-gold/40 focus:ring-2"
                    placeholder="Maya Chen"
                  />
                </label>
                <label className="col-span-2 text-xs uppercase tracking-[0.16em] text-ink/50">
                  WhatsApp number
                  <input
                    required
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-ink/10 bg-white px-3 text-sm tracking-normal text-ink outline-none ring-gold/40 focus:ring-2"
                    placeholder="+1 415 555 0199"
                  />
                </label>
                <label className="col-span-2 text-xs uppercase tracking-[0.16em] text-ink/50">
                  Pickup
                  <select
                    value={pickupTime}
                    onChange={(event) => setPickupTime(event.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-ink/10 bg-white px-3 text-sm tracking-normal text-ink outline-none ring-gold/40 focus:ring-2"
                  >
                    {pickupWindows.map((window) => (
                      <option key={window}>{window}</option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 text-xs uppercase tracking-[0.16em] text-ink/50">
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-2xl border border-ink/10 bg-white px-3 py-2 text-sm tracking-normal text-ink outline-none ring-gold/40 focus:ring-2"
                    placeholder="Oat milk, extra hot, no foam…"
                  />
                </label>
              </div>

              {error ? <p className="text-sm text-red-700">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-medium text-foam transition hover:bg-roast disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Composing ticket…" : `Order on WhatsApp · ${formatUsd(subtotalCents)}`}
              </button>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
