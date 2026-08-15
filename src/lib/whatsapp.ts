import { formatUsd } from "@/lib/money";
import { getWhatsAppNumber } from "@/lib/shop";

export type WhatsAppLine = {
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export function buildOrderMessage(input: {
  reference: string;
  customerName: string;
  customerPhone: string;
  pickupTime?: string | null;
  notes?: string | null;
  items: WhatsAppLine[];
  totalCents: number;
}) {
  const lines = [
    `AUREUM — New order ${input.reference}`,
    "",
    `Name: ${input.customerName}`,
    `Phone: ${input.customerPhone}`,
    `Pickup: ${input.pickupTime?.trim() || "As soon as ready"}`,
    "",
    ...input.items.map(
      (item) =>
        `• ${item.quantity}× ${item.name} — ${formatUsd(item.unitPriceCents * item.quantity)}`,
    ),
    "",
    `Total: ${formatUsd(input.totalCents)}`,
  ];

  if (input.notes?.trim()) {
    lines.push("", `Notes: ${input.notes.trim()}`);
  }

  lines.push("", "Sent from aureum.cafe");
  return lines.join("\n");
}

export function buildWhatsAppUrl(message: string, phone = getWhatsAppNumber()) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function notifyShopViaCloudApi(to: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return false;
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("WhatsApp Cloud API error", response.status, detail);
    return false;
  }

  return true;
}
