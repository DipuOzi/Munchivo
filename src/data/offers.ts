// Helpers for the Menu page's offers sections. All configurable values live
// in the site content (see pages.menu.offers / pages.menu.bundles), editable
// in the admin panel; this module only holds the math.

import type { BundleTier, MenuOffer } from "../content/defaults";
export type { BundleTier, MenuOffer };

/** Highest tier reached for a number of different products, as a rate (0.1 = 10%). */
export function bundleDiscountRate(tiers: BundleTier[], differentProducts: number): number {
  let rate = 0;
  for (const tier of [...tiers].sort((a, b) => a.count - b.count)) {
    if (differentProducts >= tier.count) rate = tier.discountPercent / 100;
  }
  return rate;
}

/** The first tier not yet reached, or undefined once the top tier is unlocked. */
export function nextBundleTier(tiers: BundleTier[], differentProducts: number): BundleTier | undefined {
  return [...tiers].sort((a, b) => a.count - b.count).find((tier) => differentProducts < tier.count);
}
