import Image from "next/image";
import { shop } from "@/lib/shop";

export function Hero() {
  return (
    <section id="top" className="relative isolate min-h-[100svh] overflow-hidden bg-ink text-foam">
      <Image
        src="/images/hero.png"
        alt="Aureum espresso bar at first light"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,10,0.35)_0%,rgba(20,14,10,0.28)_40%,rgba(20,14,10,0.78)_100%)]" />
      <div className="grain absolute inset-0" />
      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-32 sm:px-8 sm:pb-20">
        <p className="text-[11px] uppercase tracking-[0.42em] text-gold">SoHo · Specialty atelier</p>
        <h1 className="mt-5 max-w-4xl font-display text-[18vw] leading-[0.78] sm:text-[7.4rem]">
          Gold in
          <br />
          every cup.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-foam/75 sm:text-lg">{shop.tagline}</p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#menu"
            className="inline-flex h-12 items-center rounded-full bg-gold px-7 text-[11px] uppercase tracking-[0.24em] text-ink transition hover:bg-gold-light"
          >
            Explore the menu
          </a>
          <a
            href="#order"
            className="inline-flex h-12 items-center rounded-full border border-foam/25 px-7 text-[11px] uppercase tracking-[0.24em] text-foam transition hover:border-gold hover:text-gold"
          >
            Order via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function OriginMarquee() {
  const row = [...shop.origins, ...shop.origins];
  return (
    <div className="overflow-hidden border-y border-gold/15 bg-roast py-4 text-gold">
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
    <section id="story" className="scroll-mt-24 bg-foam px-5 py-24 sm:px-8">
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
    <section className="bg-ink px-5 py-24 text-foam sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] uppercase tracking-[0.32em] text-gold">The ritual</p>
        <h2 className="mt-3 max-w-2xl font-display text-5xl leading-none">Three movements. No shortcuts.</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.n} className="rounded-[28px] border border-foam/10 bg-roast/60 p-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{step.n}</p>
              <h3 className="mt-6 font-display text-4xl">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-foam/65">{step.copy}</p>
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
    <section id="visit" className="scroll-mt-24 bg-foam px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <div className="relative min-h-[420px] overflow-hidden rounded-[32px]">
          <Image src="/images/interior.png" alt="Aureum dining room" fill className="object-cover" sizes="50vw" />
        </div>
        <div id="order" className="rounded-[32px] bg-ink p-8 text-foam sm:p-12">
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold">Visit</p>
          <h2 className="mt-3 font-display text-5xl leading-none">18 Mercer. Come in, or send the ticket ahead.</h2>
          <p className="mt-5 text-sm leading-7 text-foam/70">
            Walk-ins are welcome. If you are on the move, compose your tray here and we will have it waiting — the same
            WhatsApp thread the bar already watches.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Address</p>
              <p className="mt-2 text-sm leading-6">
                {shop.addressLine1}
                <br />
                {shop.addressLine2}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Hours</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-foam/80">
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
              className="inline-flex h-12 items-center rounded-full bg-[#25D366] px-6 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Chat on WhatsApp
            </a>
            <a
              href="https://maps.google.com/?q=18+Mercer+Street+New+York"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center rounded-full border border-foam/20 px-6 text-[11px] uppercase tracking-[0.2em]"
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
    <footer className="border-t border-gold/15 bg-ink px-5 py-12 text-foam/70 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-4xl tracking-[0.18em] text-foam">AUREUM</p>
          <p className="mt-3 max-w-sm text-sm leading-6">
            Specialty coffee atelier. Direct lots, Thursday roasts, WhatsApp tickets.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.22em]">
          <a href="#menu" className="hover:text-gold">
            Menu
          </a>
          <a href="mailto:hello@aureum.cafe" className="hover:text-gold">
            {shop.email}
          </a>
          <a href="/kitchen" className="hover:text-gold">
            For the bar
          </a>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Aureum — I would like to place an order.")}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_40px_rgba(37,211,102,0.45)] transition hover:scale-105 md:bottom-5"
      aria-label="Order on WhatsApp"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M20.52 3.48A11.78 11.78 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.86 11.86 0 0 0 5.76 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.44ZM12.07 21.15h-.01a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.74.98 1-3.64-.24-.37a9.83 9.83 0 0 1-1.51-5.25c0-5.43 4.42-9.85 9.86-9.85 2.63 0 5.1 1.03 6.96 2.89a9.78 9.78 0 0 1 2.89 6.96c0 5.44-4.43 9.86-9.83 9.86Zm5.4-7.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.11 3.22 5.11 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
