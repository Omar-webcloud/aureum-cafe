"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart-context";
import { formatUsd } from "@/lib/money";
import type { MenuCategory, MenuItemDTO } from "@/lib/types";

const tabs: Array<{ id: "all" | MenuCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "espresso", label: "Espresso" },
  { id: "brew", label: "Brew" },
  { id: "seasonal", label: "Seasonal" },
  { id: "kitchen", label: "Kitchen" },
];

export function FeaturedMenu({ items }: { items: MenuItemDTO[] }) {
  const featured = items.filter((item) => item.featured);
  const { addItem } = useCart();

  return (
    <section className="bg-ink px-5 py-20 text-foam sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold">The collection</p>
            <h2 className="mt-3 max-w-xl font-display text-5xl leading-[0.95] sm:text-6xl">
              Four pours we make without looking at the clock.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-foam/65">
            A tighter menu, roasted in small lots, pulled to the same recipe every morning. Add to your tray and send it
            to the bar on WhatsApp.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {featured.map((item, index) => (
            <article
              key={item.id}
              className={`group relative overflow-hidden rounded-[28px] ${index === 0 ? "md:row-span-2 min-h-[460px]" : "min-h-[220px]"}`}
            >
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                {item.tag ? (
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gold">{item.tag}</p>
                ) : null}
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="font-display text-3xl">{item.name}</h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-foam/70">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(item)}
                    className="shrink-0 rounded-full bg-gold px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-ink transition hover:bg-gold-light"
                  >
                    {formatUsd(item.priceCents)}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FullMenu({ items }: { items: MenuItemDTO[] }) {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("all");
  const { addItem } = useCart();
  const visible = useMemo(
    () => (active === "all" ? items : items.filter((item) => item.category === active)),
    [active, items],
  );

  return (
    <section id="menu" className="scroll-mt-24 bg-cream px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold-deep">Menu</p>
            <h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">A short, exacting list.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.2em] transition ${
                  active === tab.id ? "bg-ink text-foam" : "bg-white text-ink/60 hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_50px_rgba(20,14,10,0.06)]">
              <div className="relative h-56">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="400px" />
                {item.tag ? (
                  <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold">
                    {item.tag}
                  </span>
                ) : null}
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-3xl leading-none">{item.name}</h3>
                  <p className="text-sm text-gold-deep">{formatUsd(item.priceCents)}</p>
                </div>
                <p className="text-sm leading-6 text-ink/65">{item.description}</p>
                <button
                  type="button"
                  onClick={() => addItem(item)}
                  className="h-11 w-full rounded-full border border-ink/10 text-[11px] uppercase tracking-[0.22em] transition hover:border-gold hover:bg-ink hover:text-foam"
                >
                  Add to tray
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
