"use client";

import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { shop } from "@/lib/shop";

// ─────────────────────────────────────────────────────────────────────────────
// Orbit Configuration & Geometry
// ─────────────────────────────────────────────────────────────────────────────
const SPEED    = 0.00010;          // rad/ms — slower, majestic drift (full lap ≈ 63s)
const FRONT    = Math.PI / 2 + 0.35; // angle where depth = 1 (lower-right)
const TITLE_Z  = 10;               // z-index reserved for wordmark layer
const INTRO_MS = 900;              // cards fade-in duration (ms)

interface BpConfig {
  rx: number;
  ry: number;
  cardW: number;
  tilt: number;
  isMob: boolean;
}

function getBpConfig(w: number, h: number): BpConfig {
  if (w < 768) {
    // Phone: tall portrait ellipse, generous vertical radius to clear buttons and wordmark
    return {
      rx: Math.max(130, Math.min(150, Math.round(w * 0.38))),
      ry: Math.max(195, Math.min(235, Math.round(h * 0.28))),
      cardW: Math.max(76, Math.min(86, Math.round(w * 0.22))),
      tilt: 0,
      isMob: true,
    };
  } else if (w < 1199) {
    // Tablet: wider oval with ample clearance around buttons
    return {
      rx: Math.max(300, Math.min(365, Math.round(w * 0.35))),
      ry: Math.max(205, Math.min(245, Math.round(h * 0.26))),
      cardW: Math.max(110, Math.min(120, Math.round(w * 0.13))),
      tilt: 0.02,
      isMob: false,
    };
  } else {
    // Desktop: wide ellipse, ry >= 250 guarantees >80px clearance from all text and buttons
    return {
      rx: Math.max(480, Math.min(540, Math.round(w * 0.34))),
      ry: Math.max(250, Math.min(285, Math.round(h * 0.30))),
      cardW: 160,
      tilt: 0.03,
      isMob: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Data (mapped to menu products)
// ─────────────────────────────────────────────────────────────────────────────
interface CardDef {
  slug:   string;   // product slug on menu
  image:  string;
  angleD: number;   // starting angle on desktop (rad)
  angleM: number;   // starting angle on mobile (rad)
  tilt:   number;   // fixed rotation in deg
  hideM?: boolean;  // hide on mobile
}

const CARDS: CardDef[] = [
  { slug: "single-origin-espresso", image: "/images/espresso.png",              angleD: 0.00, angleM: 0.00, tilt: -2.5 },
  { slug: "flat-white",             image: "/images/flatwhite.png",             angleD: 1.05, angleM: 1.57, tilt:  2.5 },
  { slug: "aureum-latte",           image: "/images/latte.png",                 angleD: 2.09, angleM: 3.14, tilt: -2.0 },
  { slug: "dark-mocha",             image: "/images/mocha.png",                 angleD: 3.14, angleM: 4.71, tilt:  2.5 },
  { slug: "butter-croissant",       image: "/images/butter_croissant.jpg",      angleD: 4.19, angleM: 0.00, tilt: -2.5, hideM: true },
  { slug: "chocolate-morning-bun",  image: "/images/chocolate_morning_bun.jpg", angleD: 5.24, angleM: 0.00, tilt:  2.0, hideM: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure Math Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** 0 = far back, 1 = nearest front */
function getDepth(angle: number): number {
  return (Math.sin(angle - FRONT + Math.PI / 2) + 1) / 2;
}

/** x/y offset from center on the tilted ellipse */
function getPos(angle: number, rx: number, ry: number, tilt: number) {
  const ex = rx * Math.cos(angle);
  const ey = ry * Math.sin(angle);
  return {
    x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
    y: ex * Math.sin(tilt) + ey * Math.cos(tilt),
  };
}

/** z-index: < TITLE_Z when far, > TITLE_Z when near */
function getZ(depth: number): number {
  return depth < 0.5
    ? Math.max(1, Math.round(depth * 2 * (TITLE_Z - 1) + 1)) // 1 … 9
    : Math.round(TITLE_Z + 1 + (depth - 0.5) * 2 * 9);      // 11 … 20
}

/** Subtle box shadow */
function getShadow(depth: number): string {
  const a1 = (0.03 + depth * 0.05).toFixed(3);
  const a2 = (0.04 + depth * 0.07).toFixed(3);
  const b1 = Math.round(4 + depth * 8);
  const b2 = Math.round(8 + depth * 14);
  return `0 2px ${b1}px rgba(20,14,10,${a1}), 0 4px ${b2}px rgba(20,14,10,${a2})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Component
// ─────────────────────────────────────────────────────────────────────────────
export function Hero() {
  const sectionRef   = useRef<HTMLElement>(null);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const wordmarkRef  = useRef<HTMLHeadingElement>(null);
  const strokeRef    = useRef<SVGSVGElement>(null);
  const buttonsRef   = useRef<HTMLDivElement>(null);

  // rAF state
  const anglesRef    = useRef<number[]>(CARDS.map(c => c.angleD));
  const lastTRef     = useRef<number | null>(null);
  const startTRef    = useRef<number | null>(null);
  const rafRef       = useRef<number | null>(null);
  const pausedRef    = useRef(false);
  const hoveredRef   = useRef(false);

  // Viewport config — updated on resize
  const bpRef = useRef<BpConfig>({
    rx: 500,
    ry: 265,
    cardW: 160,
    tilt: 0.03,
    isMob: false,
  });

  const updateBp = useCallback(() => {
    if (typeof window === "undefined") return;
    bpRef.current = getBpConfig(window.innerWidth, window.innerHeight);
  }, []);

  // ── Scroll to menu product ──────────────────────────────────────────────
  const handleCardClick = (slug: string) => {
    window.dispatchEvent(new CustomEvent("select-product", { detail: { slug } }));
    const el = document.getElementById(`product-${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ── rAF loop ────────────────────────────────────────────────────────────
  const loop = useCallback((now: number) => {
    if (startTRef.current === null) startTRef.current = now;
    const introAlpha = Math.min((now - startTRef.current) / INTRO_MS, 1);

    // Stop animation when tab hidden, offscreen, OR hovered on an image
    if (!pausedRef.current && !hoveredRef.current) {
      const dt = lastTRef.current !== null ? now - lastTRef.current : 0;
      lastTRef.current = now;
      const { rx, ry, tilt } = bpRef.current;

      CARDS.forEach((def, i) => {
        const el = cardRefs.current[i];
        if (!el || el.dataset.hidden === "1") return;

        anglesRef.current[i] += dt * SPEED;
        const a     = anglesRef.current[i];
        const depth = getDepth(a);
        // Controlled, refined scale: 0.72 (far) to 1.00 (near)
        const scale = 0.72 + depth * 0.28;
        const op    = (0.55 + depth * 0.45) * introAlpha;
        const { x, y } = getPos(a, rx, ry, tilt);

        el.style.transform  = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(${def.tilt}deg) scale(${scale.toFixed(4)})`;
        el.style.opacity    = op.toFixed(3);
        el.style.zIndex     = String(getZ(depth));
        el.style.boxShadow  = getShadow(depth);
      });
    } else {
      lastTRef.current = null;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Mount / unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    updateBp();
    const isMob = bpRef.current.isMob;

    // Assign initial angles per breakpoint; mark hidden cards
    anglesRef.current = CARDS.map(c => (isMob ? c.angleM : c.angleD));

    CARDS.forEach((def, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      if (def.hideM && isMob) {
        el.dataset.hidden = "1";
        el.style.display  = "none";
      } else {
        el.dataset.hidden = "0";
        el.style.display  = "";
      }
    });

    // ── Reduced-motion: static positions ──────────────────────────────────
    if (reduced) {
      const { rx, ry, tilt } = bpRef.current;
      CARDS.forEach((def, i) => {
        const el = cardRefs.current[i];
        if (!el || el.dataset.hidden === "1") return;
        const a     = anglesRef.current[i];
        const depth = getDepth(a);
        const scale = 0.72 + depth * 0.28;
        const { x, y } = getPos(a, rx, ry, tilt);
        el.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) rotate(${def.tilt}deg) scale(${scale.toFixed(4)})`;
        el.style.opacity   = String(0.6 + depth * 0.4);
        el.style.zIndex    = String(getZ(depth));
        el.style.boxShadow = getShadow(depth);
      });
      // Draw strokes immediately
      strokeRef.current?.querySelectorAll<SVGPathElement>("path").forEach(p => {
        gsap.set(p, { strokeDashoffset: 0, opacity: 1 });
      });
      gsap.set([wordmarkRef.current, buttonsRef.current], { autoAlpha: 1, y: 0 });
      return;
    }

    // ── GSAP intro: wordmark + underline strokes + buttons ────────────────
    const paths = strokeRef.current
      ? Array.from(strokeRef.current.querySelectorAll<SVGPathElement>("path"))
      : [];

    paths.forEach(p => {
      const len = p.getTotalLength?.() ?? 820;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    });

    gsap.set([wordmarkRef.current, buttonsRef.current], { autoAlpha: 0, y: 20 });

    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .to(wordmarkRef.current, { autoAlpha: 1, y: 0, duration: 0.9 }, 0.15)
      .to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.18, ease: "power2.inOut" }, 0.35)
      .to(buttonsRef.current,  { autoAlpha: 1, y: 0, duration: 0.7 }, 0.65);

    // ── Start rAF ─────────────────────────────────────────────────────────
    pausedRef.current = false;
    rafRef.current = requestAnimationFrame(loop);

    // ── Pause on tab hidden ───────────────────────────────────────────────
    const onVis = () => { pausedRef.current = document.visibilityState === "hidden"; };
    document.addEventListener("visibilitychange", onVis);

    // ── Pause when hero is off-screen ─────────────────────────────────────
    const obs = new IntersectionObserver(
      ([e]) => { pausedRef.current = !e.isIntersecting; },
      { threshold: 0.05 }
    );
    obs.observe(section);

    // ── Responsive resize ─────────────────────────────────────────────────
    const onResize = () => {
      const prevMob = bpRef.current.isMob;
      updateBp();
      const nowMob = bpRef.current.isMob;

      CARDS.forEach((def, i) => {
        const el = cardRefs.current[i];
        if (!el) return;
        if (def.hideM) {
          el.dataset.hidden = nowMob ? "1" : "0";
          el.style.display  = nowMob ? "none" : "";
        }
        // Reseed angles if crossing breakpoint
        if (nowMob && !prevMob) anglesRef.current[i] = def.angleM;
        if (!nowMob && prevMob) anglesRef.current[i] = def.angleD;
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      obs.disconnect();
      gsap.killTweensOf([wordmarkRef.current, buttonsRef.current, ...paths]);
    };
  }, [loop, updateBp]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#fcfcfb] text-ink"
    >
      {/*
        Orbit cards layer:
        - Cards have pointer-events-auto and cursor-pointer to allow hovering and clicking
        - Hovering on any card stops the orbit animation
        - Clicking on a card scrolls to the respective product on the menu
        - 10px border radius and subtle box shadow
      */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="relative" style={{ width: 0, height: 0 }}>
          {CARDS.map((def, i) => (
            <div
              key={def.slug}
              ref={el => { cardRefs.current[i] = el; }}
              onMouseEnter={() => { hoveredRef.current = true; }}
              onMouseLeave={() => { hoveredRef.current = false; }}
              onClick={() => handleCardClick(def.slug)}
              role="button"
              tabIndex={0}
              aria-label={`View ${def.slug.replace(/-/g, " ")} on menu`}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(def.slug);
                }
              }}
              style={{
                position:   "absolute",
                top:        0,
                left:       0,
                width:      "var(--orbit-card-w, 160px)",
                willChange: "transform, opacity",
                cursor:     "pointer",
                pointerEvents: "auto",
              }}
              className="group/card"
            >
              <div
                style={{
                  width:        "100%",
                  aspectRatio:  "16 / 10",
                  borderRadius: 10,
                  overflow:     "hidden",
                  background:   "#e8e3dc",
                  boxShadow:    "0 4px 14px rgba(20, 14, 10, 0.08)",
                  transition:   "transform 0.25s ease-out, box-shadow 0.25s ease-out",
                }}
                className="group-hover/card:scale-105 group-hover/card:shadow-[0_8px_22px_rgba(20,14,10,0.15)]"
              >
                <Image
                  src={def.image}
                  alt=""
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 767px) 86px, (max-width: 1199px) 120px, 160px"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/*
        Central Content Layer:
        - h1 scaled down to refined editorial proportions: clamp(2.4rem, 6.2vw, 5rem)
        - Compact button group: stacked on mobile, row on tablet/desktop
        - Ample space around words guarantees zero overlap across any screen size
      */}
      <div className="relative z-[10] flex flex-col items-center justify-center px-4 text-center select-none pointer-events-auto">
        <div className="hero-wordmark-wrap">
          <svg
            ref={strokeRef}
            className="hero-wordmark-stroke"
            viewBox="0 0 900 220"
            fill="none"
            aria-hidden="true"
          >
            <path d="M36 166C230 118 439 91 858 104"  stroke="#c4a36a" strokeWidth="9" strokeLinecap="round" />
            <path d="M66 178C270 127 472 111 843 120" stroke="#d8b878" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <h1
            ref={wordmarkRef}
            className="font-sans text-[clamp(2.4rem,6.2vw,5rem)] font-extrabold leading-[0.88] tracking-[-0.07em] text-ink"
          >
            {shop.wordmark}
          </h1>
        </div>

        <div
          ref={buttonsRef}
          className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3"
        >
          <a
            href="#menu"
            className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-6 text-[10px] uppercase tracking-[0.22em] text-foam transition hover:bg-gold-deep sm:h-11 sm:px-7 sm:text-[11px]"
          >
            Explore the menu
          </a>
          <a
            href="#visit"
            className="inline-flex h-10 items-center justify-center rounded-full border border-ink/20 bg-white/90 px-6 text-[10px] uppercase tracking-[0.22em] text-ink transition hover:border-gold-deep hover:text-gold-deep sm:h-11 sm:px-7 sm:text-[11px]"
          >
            Order via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
