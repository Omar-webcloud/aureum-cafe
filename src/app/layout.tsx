import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { CartProvider } from "@/components/cart-context";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Aureum — Specialty Coffee Atelier",
  description:
    "A quiet SoHo coffee atelier. Order signature pours and morning pastry on WhatsApp, ready when you arrive.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} bg-foam font-sans text-ink antialiased`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
