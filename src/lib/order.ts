import { DEFAULT_CONTENT } from "../content/defaults";
import { formatPrice, type Product } from "../data/products";
import type { CartEntry } from "../context/CartContext";

type MessageOptions = { currencyLabel?: string; siteName?: string };

export function buildOrderMessage(entries: CartEntry[], options: MessageOptions = {}) {
  const currencyLabel = options.currencyLabel ?? DEFAULT_CONTENT.site.currencyLabel;
  const siteName = options.siteName ?? DEFAULT_CONTENT.site.name;
  const itemLines = entries.map(({ product, quantity }, index) => {
    const lineTotal = product.price === null ? "TBC" : formatPrice(product.price * quantity, currencyLabel);
    return `${index + 1}. ${product.name} x${quantity} — ${formatPrice(product.price, currencyLabel)} each = ${lineTotal}`;
  });

  const hasMissingPrices = entries.some(({ product }) => product.price === null);
  const total = entries.reduce((sum, { product, quantity }) => sum + (product.price ?? 0) * quantity, 0);

  return [
    `Hello ${siteName}! I'd like to place an order:`,
    "",
    ...itemLines,
    "",
    `Total: ${hasMissingPrices ? "To be confirmed" : formatPrice(total, currencyLabel)}`,
    "",
    "Please confirm. Thank you!",
  ].join("\n");
}

/**
 * Always returns a WhatsApp click-to-chat URL.
 * With a configured number it opens the business chat directly;
 * without one it still opens WhatsApp with the message pre-filled.
 */export function getWhatsAppUrl(message: string, whatsappNumber: string = DEFAULT_CONTENT.site.whatsappNumber) {
  const number = whatsappNumber.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return /^\d{8,15}$/.test(number) ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openWhatsApp(message: string, whatsappNumber: string = DEFAULT_CONTENT.site.whatsappNumber) {
  const url = getWhatsAppUrl(message, whatsappNumber);
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) window.location.href = url;
}

/* ------------------------------------------------------------------------ */
/* Deal + bundle messages (Menu page offers sections).                       */
/* ------------------------------------------------------------------------ */

export type DealOrder = { product: Product; quantity: number; dealPrice: number };

/**
 * A multi-item offer: "3 sandos = ৳150, save ৳30". The per-unit price comes
 * from the live product data, so the message always shows current prices.
 */
export function buildDealMessage(deal: DealOrder, options: MessageOptions = {}) {
  const currencyLabel = options.currencyLabel ?? DEFAULT_CONTENT.site.currencyLabel;
  const siteName = options.siteName ?? DEFAULT_CONTENT.site.name;
  const { product, quantity, dealPrice } = deal;
  const regularTotal = (product.price ?? 0) * quantity;
  const savings = regularTotal - dealPrice;
  const missingPrice = product.price === null;
  const itemTotal = missingPrice ? "To be confirmed" : formatPrice(regularTotal, currencyLabel);
  const offerPrice = missingPrice ? "To be confirmed" : formatPrice(dealPrice, currencyLabel);

  return [
    `Hello ${siteName}! I'd like to place an order:`,
    "",
    `1. ${product.name} x${quantity} — ${formatPrice(product.price, currencyLabel)} each = ${itemTotal}`,
    `Offer: ${quantity} for ${offerPrice}${missingPrice ? "" : ` — save ${formatPrice(savings, currencyLabel)}`}`,
    "",
    `Total: ${offerPrice}`,
    "",
    "Please confirm. Thank you!",
  ].join("\n");
}

/**
 * A customer-built bundle of cart entries with the tiered bundle discount.
 */
export function buildBundleMessage(entries: CartEntry[], discountRate: number, options: MessageOptions = {}) {
  const currencyLabel = options.currencyLabel ?? DEFAULT_CONTENT.site.currencyLabel;
  const siteName = options.siteName ?? DEFAULT_CONTENT.site.name;
  const itemLines = entries.map(({ product, quantity }, index) => {
    const lineTotal = product.price === null ? "TBC" : formatPrice(product.price * quantity, currencyLabel);
    return `${index + 1}. ${product.name} x${quantity} — ${formatPrice(product.price, currencyLabel)} each = ${lineTotal}`;
  });

  const hasMissingPrices = entries.some(({ product }) => product.price === null);
  const subtotal = entries.reduce((sum, { product, quantity }) => sum + (product.price ?? 0) * quantity, 0);
  const discountAmount = hasMissingPrices ? 0 : Math.round(subtotal * discountRate);
  const total = subtotal - discountAmount;
  const discountLine = `Bundle discount (${Math.round(discountRate * 100)}%): -${formatPrice(discountAmount, currencyLabel)}`;

  return [
    `Hello ${siteName}! I'd like to order this bundle:`,
    "",
    ...itemLines,
    "",
    `Subtotal: ${hasMissingPrices ? "To be confirmed" : formatPrice(subtotal, currencyLabel)}`,
    ...(hasMissingPrices || discountAmount === 0 ? [] : [discountLine]),
    `Total: ${hasMissingPrices ? "To be confirmed" : formatPrice(total, currencyLabel)}`,
    "",
    "Please confirm. Thank you!",
  ].join("\n");
}
