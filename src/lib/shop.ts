export const shop = {
  name: "Aureum",
  wordmark: "AUREUM",
  tagline: "Roasted at dawn. Poured with intention.",
  blurb: "A quiet specialty atelier in SoHo for people who take their coffee personally.",
  addressLine1: "18 Mercer Street",
  addressLine2: "New York, NY 10013",
  neighborhood: "SoHo, New York",
  phoneDisplay: "+1 (415) 555-0188",
  email: "hello@aureum.cafe",
  hours: [
    { day: "Monday – Friday", time: "7:00 – 18:00" },
    { day: "Saturday", time: "8:00 – 17:00" },
    { day: "Sunday", time: "8:00 – 16:00" },
  ],
  origins: [
    "Ethiopia Sidamo",
    "Colombia Huila",
    "Guatemala Antigua",
    "Kenya Nyeri",
    "Sumatra Mandheling",
    "Brazil Cerrado",
  ],
};

export function getWhatsAppNumber() {
  const raw = process.env.WHATSAPP_NUMBER ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "14155550188";
  return raw.replace(/\D/g, "");
}
