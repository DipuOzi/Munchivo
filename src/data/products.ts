import { DEFAULT_CONTENT, type Product } from "../content/defaults";

export type { Product };

export { DEFAULT_CONTENT as defaultContent };

/**
 * Formats a price with the site currency.
 * Components pass the live currency label from ContentContext;
 * the default is only used for previews.
 */
export function formatPrice(price: number | null, currencyLabel: string = DEFAULT_CONTENT.site.currencyLabel) {
  if (price === null) return "To be confirmed";
  const amount = Number.isInteger(price) ? price.toString() : price.toFixed(2);
  return `${currencyLabel}${amount}`;
}
