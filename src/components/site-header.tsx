"use client";

import { useEffect, useState } from "react";
import { shop } from "@/lib/shop";
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
        <div className="flex items-center gap-4">
          <Link href="/owner" className="text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-2">
            <User className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline-flex text-xs font-medium">Owner Portal</span>
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="flex items-center gap-2 sm:gap-3 rounded-full border border-foam/20 bg-foam/10 p-2 sm:px-4 sm:py-2 text-[11px] uppercase tracking-[0.22em] text-foam transition hover:border-gold hover:text-gold"
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
