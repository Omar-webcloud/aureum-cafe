"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "@/lib/money";
import type { KitchenOrder } from "@/lib/types";

const statuses = ["pending", "preparing", "ready", "completed"] as const;

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const payload = (await response.json()) as { orders?: KitchenOrder[] };
      setOrders(payload.orders ?? []);
      setError(null);
    } catch {
      setError("Unable to load tickets.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function updateStatus(id: number, status: string) {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-foam sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold">Aureum</p>
            <h1 className="mt-2 font-display text-5xl">Ticket rail</h1>
          </div>
          <a href="/" className="text-[11px] uppercase tracking-[0.22em] text-foam/60 hover:text-gold">
            Back to the floor
          </a>
        </div>
        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {orders.length === 0 ? (
            <p className="text-sm text-foam/60">No tickets yet. The first WhatsApp order will land here.</p>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="rounded-[24px] border border-foam/10 bg-roast/70 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-gold">{order.reference}</p>
                    <h2 className="mt-1 font-display text-3xl">{order.customerName}</h2>
                  </div>
                  <p className="text-sm">{formatUsd(order.totalCents)}</p>
                </div>
                <p className="mt-2 text-sm text-foam/60">
                  {order.customerPhone} · {order.pickupTime || "As soon as ready"}
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.name}`} className="flex justify-between gap-3">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span className="text-foam/50">{formatUsd(item.unitPriceCents * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                {order.notes ? <p className="mt-4 text-sm italic text-gold-light">{order.notes}</p> : null}
                <div className="mt-6 flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatus(order.id, status)}
                      className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                        order.status === status ? "bg-gold text-ink" : "border border-foam/15 text-foam/70"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
