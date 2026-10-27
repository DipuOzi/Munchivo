import { motion, useReducedMotion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { Reveal } from "./PageElements";
import { QuantityControl } from "./QuantityControl";
import { useContent } from "../context/ContentContext";
import { useWhatsApp } from "../context/WhatsAppContext";
import { formatPrice } from "../data/products";
import { bundleDiscountRate, nextBundleTier } from "../data/offers";
import type { CartEntry } from "../context/CartContext";

export function BundleSection({ children }: { children?: ReactNode }) {
  const { content } = useContent();
  const { openBundleOrder } = useWhatsApp();
  const reduceMotion = useReducedMotion();
  const { currencyLabel } = content.site;
  const bundles = content.pages.menu.bundles;

  // productId -> quantity, only for products placed in the bundle.
  const [picks, setPicks] = useState<Record<string, number>>({});

  const entries: CartEntry[] = content.products
    .filter((product) => (picks[product.id] ?? 0) > 0)
    .map((product) => ({ product, quantity: picks[product.id] }));

  const firstDiscount = Math.round(Math.min(...bundles.tiers.map((tier) => tier.discountPercent), 100));
  const fullDiscount = Math.max(...bundles.tiers.map((tier) => tier.discountPercent), 0);
  const itemWord = (count: number) => `${count} item${count === 1 ? "" : "s"}`;

  const differentProducts = entries.length;
  const discountRate = bundleDiscountRate(bundles.tiers, differentProducts);
  const discountPercent = Math.round(discountRate * 100);
  const reachingTiers = bundles.tiers.filter((tier) => differentProducts >= tier.count);
  const reachedDiscount = reachingTiers.length > 0
    ? Math.max(...reachingTiers.map((tier) => tier.discountPercent))
    : 0;
  const upcoming = nextBundleTier(bundles.tiers, differentProducts);
  const itemsToNextTier = upcoming ? upcoming.count - differentProducts : 0;
  const hasMissingPrices = entries.some(({ product }) => product.price === null);
  const subtotal = entries.reduce((sum, { product, quantity }) => sum + (product.price ?? 0) * quantity, 0);
  const discountAmount = hasMissingPrices ? 0 : Math.round(subtotal * discountRate);
  const total = subtotal - discountAmount;

  function togglePick(productId: string) {
    setPicks((current) => {
      if ((current[productId] ?? 0) > 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: 1 };
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setPicks((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: Math.min(99, Math.floor(quantity)) };
    });
  }

  const hint = (() => {
    if (reachedDiscount > 0 && !upcoming) return `Saving ${reachedDiscount}% with your bundle.`;
    if (reachedDiscount > 0)
      return `Saving ${reachedDiscount}% — add ${itemWord(itemsToNextTier)} more to make it ${upcoming ? upcoming.discountPercent : fullDiscount}%.`;
    if (differentProducts === 0)
      return bundles.tiers
        .map((tier) => `Pick ${tier.count} different items for ${tier.discountPercent}% off`)
        .join(", or ") + ".";
    return `Add ${itemWord(itemsToNextTier)} more to unlock the ${firstDiscount}% bundle discount.`;
  })();

  return (
    <section className="bundle-section" aria-label="Build your own bundle">
      <div className="site-container">
        <Reveal className="menu-section-heading">
          <span className="eyebrow eyebrow--orange">{bundles.eyebrow}</span>
          <h2>{bundles.titleLine1} <em>{bundles.titleLine2}</em></h2>
          <p>{bundles.text}</p>
        </Reveal>
        <div className="bundle-layout">
          <div className="bundle-picker" role="group" aria-label="Bundle items">
            {content.products.map((product, index) => {
              const picked = picks[product.id] ?? 0;
              return (
                <motion.div
                  className={`bundle-option ${picked > 0 ? "is-picked" : ""}`}
                  key={product.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : (index % 2) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    className="bundle-option-mover"
                    onClick={() => togglePick(product.id)}
                    aria-pressed={picked > 0}
                  >
                    <img src={product.image} alt={product.imageAlt} loading="lazy" decoding="async" />
                    <span className="product-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    {picked > 0 && <span className="bundle-count-chip"><Check size={13} strokeWidth={2.6} aria-hidden="true" /> {picked} in bundle</span>}
                    <span className="bundle-tick" aria-hidden="true"><Check size={15} strokeWidth={2.6} /></span>
                  </button>
                  <div className="bundle-option-body">
                    <div className="bundle-option-title">
                      <h3>{product.name}</h3>
                      <span className="product-price">{formatPrice(product.price, currencyLabel)}</span>
                    </div>
                    <div className="bundle-option-row">
                      <button
                        type="button"
                        className="bundle-toggle"
                        onClick={() => togglePick(product.id)}
                        aria-pressed={picked > 0}
                      >
                        {picked > 0 ? (
                          <span aria-live="polite">{bundles.addedLabel}</span>
                        ) : (
                          <span aria-live="polite">{bundles.addLabel}</span>
                        )}
                        {picked > 0 ? <Check size={16} strokeWidth={2.4} aria-hidden="true" /> : <Plus size={16} strokeWidth={2.4} aria-hidden="true" />}
                      </button>
                      {picked > 0 && (
                        <QuantityControl
                          value={picked}
                          onChange={(value) => setQuantity(product.id, value)}
                          label={product.name}
                          className="quantity-control--bundle"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <aside className="bundle-summary" aria-labelledby="bundle-summary-title">
            <span className="eyebrow eyebrow--light">{bundles.summaryEyebrow}</span>
            <h2 id="bundle-summary-title">{differentProducts > 0 ? `${differentProducts} item${differentProducts === 1 ? "" : "s"}` : bundles.emptyHeading}</h2>
            {entries.length > 0 ? (
              <div className="bundle-lines">
                {entries.map(({ product, quantity }) => (
                  <div className="bundle-line" key={product.id}>
                    <span>{product.name} <small>x {quantity}</small></span>
                    <span>{product.price === null ? "TBC" : formatPrice(product.price * quantity, currencyLabel)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="bundle-empty-note">{bundles.emptyNote}</p>
            )}
            {entries.length > 0 && (
              <>
                <div className="bundle-lines bundle-lines--totals">
                  {hasMissingPrices ? null : (
                    <div className="bundle-line"><span>Subtotal</span><span>{formatPrice(subtotal, currencyLabel)}</span></div>
                  )}
                  {discountRate === 0 ? (
                    <div className="bundle-line bundle-line--discount"><span>Bundle discount</span><span aria-live="polite">—</span></div>
                  ) : (
                    <div className="bundle-line bundle-line--discount"><span>Bundle discount ({discountPercent}%)</span><span aria-live="polite">-{formatPrice(discountAmount, currencyLabel)}</span></div>
                  )}
                </div>
                <div className="bundle-total"><span>Total</span><strong aria-live="polite">{hasMissingPrices ? "To be confirmed" : formatPrice(total, currencyLabel)}</strong></div>
              </>
            )}
            <p className="bundle-hint">{hint}</p>
            <button
              type="button"
              className="button button--orange bundle-cta"
              disabled={entries.length === 0}
              onClick={() => openBundleOrder(entries, discountRate)}
            >
              {bundles.ctaLabel} <ArrowUpRight size={19} aria-hidden="true" />
            </button>
            <p className="bundle-note">{bundles.note}</p>
          </aside>
        </div>

        {children}
      </div>
    </section>
  );
}
