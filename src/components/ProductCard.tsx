import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useContent } from "../context/ContentContext";
import { useWhatsApp } from "../context/WhatsAppContext";
import { formatPrice, type Product } from "../data/products";
import { QuantityControl } from "./QuantityControl";
import { WhatsAppIcon } from "../lib/whatsapp";

type ProductCardProps = {
  product: Product;
  index: number;
  showQuantity?: boolean;
};

export function ProductCard({ product, index, showQuantity = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { content } = useContent();
  const { openProductOrder } = useWhatsApp();
  const reduceMotion = useReducedMotion();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function handleAdd() {
    addItem(product.id, showQuantity ? quantity : 1);
    setAdded(true);
    if (showQuantity) setQuantity(1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAdded(false), 1800);
  }

  function handleWhatsApp() {
    openProductOrder(product, showQuantity ? quantity : 1);
  }

  return (
    <motion.article
      className={`product-card ${showQuantity ? "product-card--menu" : ""}`}
      initial={reduceMotion ? false : { opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: reduceMotion ? 0 : 0.58, delay: reduceMotion ? 0 : (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`product-media ${imageLoaded ? "product-media--loaded" : ""}`}>
        <img
          className={imageLoaded ? "product-image is-loaded" : "product-image"}
          src={product.image}
          alt={product.imageAlt}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
        <span className="product-index" aria-hidden="true">0{index + 1}</span>
      </div>
      <div className="product-details">
        <div className="product-title-row">
          <h3>{product.name}</h3>
          <span className="product-price">{formatPrice(product.price, content.site.currencyLabel)}</span>
        </div>
        <p>{product.description}</p>
        <div className="product-actions">
          {showQuantity && <QuantityControl value={quantity} onChange={setQuantity} label={product.name} />}
          <button type="button" className="product-add" onClick={handleAdd} aria-label={`Add ${showQuantity ? quantity : 1} ${product.name} to order`}>
            <span aria-live="polite">{added ? "Added to order" : "Add to order"}</span>
            {added ? <Check size={18} aria-hidden="true" /> : showQuantity ? <Plus size={19} aria-hidden="true" /> : <ArrowUpRight size={19} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="product-wa"
            onClick={handleWhatsApp}
            aria-label={`Order ${showQuantity ? quantity : 1} ${product.name} on WhatsApp`}
            title="Order on WhatsApp"
          >
            <WhatsAppIcon />
          </button>
          <span className="sr-only" role="status">{added ? `${product.name} added to your order` : ""}</span>
        </div>
      </div>
    </motion.article>
  );
}