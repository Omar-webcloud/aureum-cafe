import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { shop } from "@/lib/shop";

export function Hero() {
  const orbitImages = [
    "/images/espresso.png",
    "/images/flatwhite.png",
    "/images/latte.png",
    "/images/mocha.png",
    "/images/butter_croissant.jpg",
    "/images/chocolate_morning_bun.jpg",
  ];

  return (
    <section id="top" className="relative isolate min-h-[100svh] overflow-hidden bg-[#fcfcfb] text-ink">
      <div className="hero-artboard absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
        {orbitImages.map((image) => (
          <div key={image} className="hero-image">
            <div className="hero-image-card">
              <Image src={image} alt="" fill className="object-cover" sizes="(min-width: 640px) 14vw, 22vw" />
            </div>
          </div>
        ))}
      </div>
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 pt-16 text-center">
        <div className="flex flex-col items-center">
          <div className="hero-wordmark-wrap">
            <svg className="hero-wordmark-stroke" viewBox="0 0 900 220" fill="none" aria-hidden="true">
              <path d="M36 166C230 118 439 91 858 104" stroke="#c4a36a" strokeWidth="9" strokeLinecap="round" />
              <path d="M66 178C270 127 472 111 843 120" stroke="#d8b878" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <h1 className="font-sans text-[clamp(4rem,12vw,11rem)] font-extrabold leading-[0.85] tracking-[-0.09em] text-ink">
              {shop.wordmark}
            </h1>
          </div>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#menu"
              className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[10px] uppercase tracking-[0.22em] text-foam transition hover:bg-gold-deep sm:h-12 sm:px-7 sm:text-[11px]"
            >
              Explore the menu
            </a>
            <a
              href="#visit"
              className="inline-flex h-11 items-center rounded-full border border-ink/20 bg-white/90 px-6 text-[10px] uppercase tracking-[0.22em] text-ink transition hover:border-gold-deep hover:text-gold-deep sm:h-12 sm:px-7 sm:text-[11px]"
            >
              Order via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OriginMarquee() {
  const row = [...shop.origins, ...shop.origins];
  return (
    <div className="overflow-hidden border-y border-ink/5 bg-cream py-4 text-gold-deep">
      <div className="marquee flex w-max gap-10 text-[11px] uppercase tracking-[0.34em]">
        {row.map((origin, index) => (
          <span key={`${origin}-${index}`} className="flex items-center gap-10">
            {origin}
            <span className="text-gold/40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Story() {
  return (
    <section id="story" className="scroll-mt-28 bg-foam px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[32px]">
          <Image
            src="/images/barista.png"
            alt="Barista pulling espresso at Aureum"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold-deep">The atelier</p>
          <h2 className="mt-4 font-display text-5xl leading-[0.95] sm:text-6xl">
            We roast less, taste more, and keep the room quiet.
          </h2>
          <p className="mt-6 text-base leading-8 text-ink/70">
            Aureum began as a Thursday roasting club above a Mercer Street walk-up. The rule still holds: if a lot
            cannot stand on its own as a filter pour, it does not touch the espresso machine. The bar is short, the
            music is low, and every ticket still goes out with a name.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-ink/10 pt-8">
            {[
              ["12", "hour roast rest"],
              ["6", "origin lots"],
              ["1", "WhatsApp ticket"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-display text-4xl text-ink">{value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ink/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Ritual() {
  const steps = [
    {
      n: "01",
      title: "Source",
      copy: "Direct lots from six farms. We buy the same elevation, same process, same harvest window.",
    },
    {
      n: "02",
      title: "Roast",
      copy: "Small batches every Thursday. Twelve hours of rest, then the first cupping before service.",
    },
    {
      n: "03",
      title: "Pour",
      copy: "Recipes written on the ticket rail. You order from the site, we pull it the same way at the bar.",
    },
  ];

  return (
    <section className="bg-cream px-5 py-24 text-ink sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] uppercase tracking-[0.32em] text-gold">The ritual</p>
        <h2 className="mt-3 max-w-2xl font-display text-5xl leading-none">Three movements. No shortcuts.</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.n} className="rounded-[24px] border border-ink/5 bg-white p-8 shadow-[0_18px_50px_rgba(20,14,10,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold-deep">{step.n}</p>
              <h3 className="mt-6 font-display text-4xl">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-ink/65">{step.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const quotes = [
    {
      quote: "The Yirgacheffe tastes like bergamot and honey. I walk from Broome twice a week for it.",
      name: "Amara V.",
      role: "Regular since 2023",
    },
    {
      quote: "Aureum is the only shop that treats oat milk like a craft, not an afterthought.",
      name: "Leo S.",
      role: "Neighborhood architect",
    },
    {
      quote: "Quiet, precise, and the croissant flakes like gold leaf. WhatsApp pickup is a gift.",
      name: "Priya N.",
      role: "Morning regular",
    },
  ];

  return (
    <section className="bg-cream px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] uppercase tracking-[0.32em] text-gold-deep">Guest book</p>
        <h2 className="mt-3 font-display text-5xl">Heard at the bar.</h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {quotes.map((item) => (
            <blockquote key={item.name} className="rounded-[28px] bg-white p-8 shadow-[0_18px_50px_rgba(20,14,10,0.05)]">
              <p className="font-display text-2xl leading-snug text-ink">“{item.quote}”</p>
              <footer className="mt-8 text-sm text-ink/55">
                <span className="text-ink">{item.name}</span> · {item.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Visit({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <section id="visit" className="scroll-mt-28 bg-foam px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <div className="relative min-h-[420px] overflow-hidden rounded-[32px]">
          <Image src="/images/interior.png" alt="Aureum dining room" fill className="object-cover" sizes="50vw" />
        </div>
        <div id="order" className="scroll-mt-28 rounded-[28px] bg-cream p-8 text-ink sm:p-12">
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold-deep">Visit</p>
          <h2 className="mt-3 font-display text-5xl leading-none">18 Mercer. Come in, or send the ticket ahead.</h2>
          <p className="mt-5 text-sm leading-7 text-ink/70">
            Walk-ins are welcome. If you are on the move, compose your tray here and we will have it waiting — the same
            WhatsApp thread the bar already watches.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold-deep">Address</p>
              <p className="mt-2 text-sm leading-6">
                {shop.addressLine1}
                <br />
                {shop.addressLine2}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold-deep">Hours</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-ink/80">
                {shop.hours.map((row) => (
                  <li key={row.day} className="flex justify-between gap-4">
                    <span>{row.day}</span>
                    <span>{row.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Aureum — I would like to place an order.")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[11px] uppercase tracking-[0.2em] text-foam transition hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Chat on WhatsApp
            </a>
            <a
              href="https://maps.google.com/?q=18+Mercer+Street+New+York"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center rounded-full border border-ink/20 px-6 text-[11px] uppercase tracking-[0.2em]"
            >
              Directions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/5 bg-cream px-5 py-12 text-ink/70 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-4xl tracking-[0.18em] text-ink">AUREUM</p>
          <p className="mt-3 max-w-sm text-sm leading-6">
            Specialty coffee atelier. Direct lots, Thursday roasts, WhatsApp tickets.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.22em]">
          <a href="#menu" className="hover:text-gold-deep">
            Menu
          </a>
          <a href="mailto:hello@aureum.cafe" className="hover:text-gold-deep">
            {shop.email}
          </a>
          <a href="/kitchen" className="hover:text-gold-deep">
            For the bar
          </a>
        </div>
      </div>
    </footer>
  );
}
