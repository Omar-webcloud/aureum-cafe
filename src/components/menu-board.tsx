"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
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
  const featured = items.filter((item) => item.featured).slice(0, 4);
  const { addItem } = useCart();

  return (
    <section className="bg-foam px-5 py-20 text-ink sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold-deep">The collection</p>
          <h2 className="mt-3 max-w-xl font-display text-5xl leading-[0.95] sm:text-6xl">
            Four pours we make without looking at the clock.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((item) => (
            <article
              key={item.id}
              className="group flex h-full flex-col overflow-hidden rounded-xl bg-white text-ink shadow-[0_8px_28px_rgba(20,14,10,0.08)]"
            >
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="min-h-4 text-[10px] uppercase tracking-[0.28em] text-gold-deep">
                  {item.tag ?? "\u00a0"}
                </p>
                <h3 className="mt-2 min-h-14 line-clamp-2 font-display text-2xl leading-tight">{item.name}</h3>
                <button
                  type="button"
                  onClick={() => addItem(item)}
                  aria-label={`Add ${item.name} to tray for ${formatUsd(item.priceCents)}`}
                  className="mt-auto flex h-11 w-full items-center justify-between rounded-full bg-ink px-4 text-[11px] font-medium uppercase tracking-[0.12em] text-foam transition hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                    Add to tray
                  </span>
                  <span className="font-semibold tracking-[0.08em]">{formatUsd(item.priceCents)}</span>
                </button>
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

  useEffect(() => {
    const handleSelectProduct = (e: Event) => {
      const customEvent = e as CustomEvent<{ slug: string; category?: string }>;
      const { slug } = customEvent.detail || {};
      setActive("all");

      setTimeout(() => {
        const el = document.getElementById(`product-${slug}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-gold", "ring-offset-4");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-gold", "ring-offset-4");
          }, 2200);
        }
      }, 80);
    };

    window.addEventListener("select-product", handleSelectProduct);
    return () => window.removeEventListener("select-product", handleSelectProduct);
  }, []);

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
                aria-pressed={active === tab.id}
                className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80 focus-visible:ring-offset-2 ${
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
            <article
              key={item.id}
              id={`product-${item.slug}`}
              className="flex flex-col h-full overflow-hidden rounded-[28px] bg-white shadow-[0_18px_50px_rgba(20,14,10,0.06)] transition-all duration-500 scroll-mt-28"
            >
              <div className="relative h-56 shrink-0">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="400px" />
                {item.tag ? (
                  <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold">
                    {item.tag}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col flex-1 p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="font-display text-3xl leading-none">{item.name}</h3>
                  <p className="shrink-0 text-sm text-gold-deep">{formatUsd(item.priceCents)}</p>
                </div>
                <p className="text-sm leading-6 text-ink/65 mb-6">{item.description}</p>
                <button
                  type="button"
                  onClick={() => addItem(item)}
                  className="mt-auto h-11 w-full shrink-0 rounded-full border border-ink/10 text-[11px] uppercase tracking-[0.22em] transition hover:border-gold hover:bg-ink hover:text-foam"
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
