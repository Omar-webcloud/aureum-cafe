"use client";

import { useEffect, useState } from "react";
import { shop } from "@/lib/shop";
import { useCart } from "@/components/cart-context";

const links = [
  { href: "#menu", label: "Menu" },
  { href: "#story", label: "Story" },
  { href: "#visit", label: "Visit" },
];

export function SiteHeader() {
  const { count, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-ink/80 shadow-lg shadow-ink/20 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <a href="#top" className="flex items-center gap-3 text-foam">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/70 font-display text-lg text-gold">
            A
          </span>
          <span className="font-display text-2xl tracking-[0.22em]">{shop.wordmark}</span>
        </a>
        <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.26em] text-foam/80 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-gold">
              {link.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={openCart}
          className="flex items-center gap-3 rounded-full border border-foam/20 bg-foam/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-foam transition hover:border-gold hover:text-gold"
        >
          Order
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] text-ink">
            {count}
          </span>
        </button>
      </div>
    </header>
  );
}
