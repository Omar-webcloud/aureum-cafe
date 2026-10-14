"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-context";
import Link from "next/link";
import { User, ShoppingCart } from "lucide-react";

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
      className="fixed inset-x-0 top-0 z-40 px-3 pt-3 text-ink sm:px-6 sm:pt-4"
    >
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-ink/5 bg-white/95 px-4 backdrop-blur-xl transition-shadow duration-300 sm:h-16 sm:px-6 ${
          scrolled ? "shadow-[0_12px_40px_rgba(20,14,10,0.12)]" : "shadow-[0_8px_30px_rgba(20,14,10,0.06)]"
        }`}
      >
        <a href="#top" aria-label="Aureum home">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/70 font-display text-lg text-gold-deep">
            A
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.26em] text-ink/75 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-gold-deep">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/owner" className="text-gold-deep hover:text-gold transition-colors flex items-center gap-2">
            <User className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline-flex text-xs font-medium">Owner Portal</span>
          </Link>
          <button
            type="button"
            onClick={openCart}
            aria-label="Open shopping cart"
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-ink/5 p-2 text-[11px] uppercase tracking-[0.22em] text-ink transition hover:border-gold-deep hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:gap-3 sm:px-4 sm:py-2"
          >
            <ShoppingCart className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Order</span>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] text-ink">
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
