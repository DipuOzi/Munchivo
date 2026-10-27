import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./PageElements";
import { useContent } from "../context/ContentContext";
import { useWhatsApp } from "../context/WhatsAppContext";
import { formatPrice } from "../data/products";
import { WhatsAppIcon } from "../lib/whatsapp";

export function OffersSection() {
  const { content } = useContent();
  const { openDealOrder } = useWhatsApp();
  const reduceMotion = useReducedMotion();
  const { currencyLabel } = content.site;
  const offersContent = content.pages.menu.offers;

  const offers = useMemo(
    () =>
      offersContent.items.flatMap((offer) => {
        const product = content.products.find((item) => item.id === offer.productId);
        return product ? [{ ...offer, product }] : [];
      }),
    [offersContent.items, content.products],
  );

  if (offers.length === 0) return null;

  return (
    <section className="offers-section" aria-label="Price offers">
      <div className="site-container">
        <Reveal className="menu-section-heading section-heading--offers">
          <span className="eyebrow eyebrow--orange">{offersContent.eyebrow}</span>
          <h2>{offersContent.titleLine1}<br /><em>{offersContent.titleLine2}</em></h2>
          <p className="menu-heading--light">{offersContent.text}</p>
        </Reveal>
        <div className="offers-grid">
          {offers.map((offer, index) => {
            const { product, quantity, dealPrice } = offer;
            const regularTotal = (product.price ?? 0) * quantity;
            const savings = regularTotal - dealPrice;
            return (
              <motion.article
                className="offer-card"
                key={`${offer.productId}-${quantity}`}
                initial={reduceMotion ? false : { opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: reduceMotion ? 0 : 0.58, delay: reduceMotion ? 0 : (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="offer-media">
                  <img src={product.image} alt={product.imageAlt} loading="lazy" decoding="async" />
                  {product.price !== null && savings > 0 && (
                    <span className="offer-save">Save {formatPrice(savings, currencyLabel)}</span>
                  )}
                  <span className="product-count" aria-hidden="true">x{quantity}</span>
                </div>
                <div className="offer-details">
                  <h3>{product.name}</h3>
                  <p className="offer-single">
                    1 for {formatPrice(product.price, currencyLabel)} &middot; {quantity} for{" "}
                    <strong>{formatPrice(dealPrice, currencyLabel)}</strong>
                    {product.price !== null && savings > 0 && (
                      <>
                        {" "}
                        <s>{formatPrice(regularTotal, currencyLabel)}</s>
                      </>
                    )}
                  </p>
                  <div className="offer-actions">
                    <button
                      type="button"
                      className="offer-order"
                      onClick={() => openDealOrder({ product, quantity, dealPrice })}
                      aria-label={`${offersContent.ctaLabel}: ${quantity} ${product.name} for ${formatPrice(dealPrice, currencyLabel)} on WhatsApp`}
                    >
                      <span aria-live="polite">{offersContent.ctaLabel}</span>
                      <ArrowUpRight size={19} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="product-wa"
                      onClick={() => openDealOrder({ product, quantity, dealPrice })}
                      aria-label={`${offersContent.ctaLabel} on WhatsApp`}
                      title="Offer on WhatsApp"
                    >
                      <WhatsAppIcon />
                    </button>
                    {product.price !== null && savings > 0 && (
                      <span className="sr-only" role="status">{`Offer saves ${formatPrice(savings, currencyLabel)}`}</span>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
