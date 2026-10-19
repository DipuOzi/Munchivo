import { ArrowUpRight, ChevronDown, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "../components/PageElements";
import { QuantityControl } from "../components/QuantityControl";
import { useCart } from "../context/CartContext";
import { useContent } from "../context/ContentContext";
import { useWhatsApp } from "../context/WhatsAppContext";
import { formatPrice } from "../data/products";
import { buildOrderMessage } from "../lib/order";
import { WhatsAppIcon } from "../lib/whatsapp";

export function OrderPage() {
  const { entries, itemCount, totalAmount, hasMissingPrices, updateQuantity, removeItem } = useCart();
  const { openCheckout, openProductOrder } = useWhatsApp();
  const { content } = useContent();
  const order = content.pages.order;
  const { currencyLabel, name: siteName } = content.site;
  const money = (price: number | null) => formatPrice(price, currencyLabel);

  return (
    <>
      <section className="order-intro" aria-labelledby="order-title">
        <div className="site-container">
          <span className="eyebrow eyebrow--orange">{order.eyebrowPrefix} / {itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}</span>
          <h1 id="order-title">{order.titleLine1}<br /><em>{order.titleLine2}</em></h1>
          <p>{order.text}</p>
        </div>
      </section>

      <section className="order-section">
        <div className="site-container">
          {entries.length === 0 ? (
            <Reveal className="empty-order">
              <span className="eyebrow eyebrow--orange">{order.emptyEyebrow}</span>
              <h2>{order.emptyTitle}</h2>
              <p>{order.emptyText}</p>
              <Link to="/menu" className="button button--orange">Explore the menu <ArrowUpRight size={19} aria-hidden="true" /></Link>
            </Reveal>
          ) : (
            <div className="order-layout">
              <div className="order-items">
                <Reveal className="order-items-heading"><h2>{order.itemsHeading}</h2><span>{itemCount} {itemCount === 1 ? "item" : "items"}</span></Reveal>
                {entries.map(({ product, quantity }) => (
                  <div className="order-item" key={product.id}>
                    <img src={product.image} alt={product.imageAlt} loading="lazy" decoding="async" />
                    <div className="order-item-main">
                      <div className="order-item-top">
                        <div><h3>{product.name}</h3><p>Unit price: {money(product.price)}</p></div>
                        <button type="button" className="remove-item" onClick={() => removeItem(product.id)} aria-label={`Remove ${product.name} from order`}>
                          <Trash2 size={18} strokeWidth={1.7} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="order-item-bottom">
                        <QuantityControl value={quantity} onChange={(value) => updateQuantity(product.id, value)} label={product.name} />
                        <div className="order-item-bottom-right">
                          <button
                            type="button"
                            className="order-item-wa"
                            onClick={() => openProductOrder(product, quantity)}
                            aria-label={`Order ${product.name} on WhatsApp`}
                          >
                            <WhatsAppIcon /> WhatsApp
                          </button>
                          <strong>{product.price === null ? "To be confirmed" : money(product.price * quantity)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Link to="/menu" className="text-link text-link--dark add-more-link">{order.addMoreLabel} <ArrowUpRight size={18} aria-hidden="true" /></Link>
              </div>

              <aside className="order-summary" aria-labelledby="summary-title">
                <span className="eyebrow eyebrow--orange">ONE LAST LOOK</span>
                <h2 id="summary-title">Order summary</h2>
                <div className="summary-lines">
                  {entries.map(({ product, quantity }) => (
                    <div className="summary-line" key={product.id}>
                      <span>{product.name} <small>x {quantity}</small></span>
                      <span>{product.price === null ? "TBC" : money(product.price * quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="summary-total"><span>Total</span><strong>{hasMissingPrices ? "To be confirmed" : money(totalAmount)}</strong></div>
                {hasMissingPrices && <p className="price-note">Prices are not set yet. Your message will show them as "To be confirmed" until actual prices are added.</p>}
                <details className="message-preview">
                  <summary>Preview WhatsApp message <ChevronDown size={17} aria-hidden="true" /></summary>
                  <pre>{buildOrderMessage(entries, { currencyLabel, siteName })}</pre>
                </details>
                <button type="button" className="button button--orange checkout-button" onClick={() => openCheckout(entries)}>
                  Checkout via WhatsApp <ArrowUpRight size={19} aria-hidden="true" />
                </button>
                <p className="checkout-disclaimer">Opens WhatsApp with your order pre-filled. Pay at the cart — no online payment.</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}