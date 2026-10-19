import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useContent } from "../context/ContentContext";
import { useOrderIntent } from "../hooks/useOrderIntent";
import { formatPrice } from "../data/products";
import { WhatsAppIcon } from "../lib/whatsapp";
import { Brand } from "./Brand";

const navigation = [
  { label: "Home", to: "/" },
  { label: "Menu", to: "/menu" },
  { label: "About", to: "/about" },
  { label: "Reviews", to: "/reviews" },
  { label: "Contact", to: "/contact" },
];

export function Header() {
  const { pathname } = useLocation();
  const { itemCount, totalAmount } = useCart();
  const { content } = useContent();
  const { currencyLabel, logoSrc, name } = content.site;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  // When true, the "Order now" pill has left the header and docked bottom-right.
  const [docked, setDocked] = useState(false);
  const lastScrollY = useRef(0);
  const reduceMotion = useReducedMotion();
  const orderIntent = useOrderIntent();

  const PILL_TRANSITION = { type: "spring" as const, stiffness: 380, damping: 32 };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 28);
      // The bottom-right dock is redundant on the order page — keep the pill in the header there.
      setDocked(currentY > 170 && pathname !== "/order");
      if (menuOpen) {
        setHidden(false);
      } else if (currentY > lastScrollY.current && currentY > 160) {
        setHidden(true);
      } else if (currentY < lastScrollY.current - 2 || currentY < 120) {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, [menuOpen, pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const highlight = hovered ?? navigation.find((item) => isActive(item.to))?.to ?? null;

  return (
    <LayoutGroup>
      <motion.header
        className={[
          "hdr",
          scrolled || pathname !== "/" ? "hdr--scrolled" : "",
          hidden && !menuOpen ? "hdr--hidden" : "",
          menuOpen ? "hdr--open" : "",
        ].filter(Boolean).join(" ")}
        initial={reduceMotion ? false : { y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hdr-shell">
          <Link to="/" className="hdr-brand" aria-label={`${name}, go to home`}>
            {!logoSrc && <span className="hdr-mark" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
            <Brand />
          </Link>

          <LayoutGroup>
            <nav className="hdr-nav" aria-label="Main navigation" onMouseLeave={() => setHovered(null)}>
              {navigation.map((item) => {
                const active = isActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={`hdr-link${active ? " is-active" : ""}${highlight === item.to ? " is-lit" : ""}`}
                    onMouseEnter={() => setHovered(item.to)}
                    onFocus={() => setHovered(item.to)}
                    onBlur={() => setHovered(null)}
                  >
                    {highlight === item.to && (
                      <motion.span
                        layoutId="hdr-pill"
                        className={`hdr-pill${hovered && !active ? " is-hover" : ""}`}
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span className="hdr-link-text">{item.label}</span>
                    {active && <span className="hdr-dot" aria-hidden="true" />}
                  </NavLink>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="hdr-actions">
            <Link to="/order" className="hdr-cart" aria-label={`View order, ${itemCount} items`}>
              <ShoppingBag size={18} strokeWidth={1.9} aria-hidden="true" />
              <AnimatePresence initial={false}>
                {itemCount > 0 && (
                  <motion.span
                    className="hdr-cart-total"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                  >
                    {formatPrice(totalAmount, currencyLabel)}
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="hdr-cart-count">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={itemCount}
                    initial={{ y: reduceMotion ? 0 : 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: reduceMotion ? 0 : -10, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  >
                    {itemCount}
                  </motion.span>
                </AnimatePresence>
              </span>
            </Link>

            {!docked && (
              <motion.button
                type="button"
                layoutId="order-pill"
                className="hdr-order"
                onClick={orderIntent}
                aria-label="Order now on WhatsApp"
                initial={false}
                transition={PILL_TRANSITION}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="hdr-order-icon"><WhatsAppIcon /></span>
                <span className="hdr-order-text">Order now</span>
              </motion.button>
            )}

            <button
              type="button"
              className={`hdr-burger${menuOpen ? " is-open" : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </motion.header>

      {docked && (
        <motion.button
          type="button"
          layoutId="order-pill"
          className="order-dock"
          onClick={orderIntent}
          aria-label="Order now on WhatsApp"
          initial={false}
          transition={PILL_TRANSITION}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.96 }}
        >
          <span className="hdr-order-icon"><WhatsAppIcon /></span>
          <span className="hdr-order-text">Order now</span>
        </motion.button>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-navigation"
            className="mnav"
            initial={{ clipPath: reduceMotion ? "circle(150% at 100% 0%)" : "circle(0% at calc(100% - 44px) 44px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 44px) 44px)" }}
            exit={{ clipPath: reduceMotion ? "circle(150% at 100% 0%)" : "circle(0% at calc(100% - 44px) 44px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="mnav-glow" aria-hidden="true" />
            <nav className="site-container mnav-inner" aria-label="Mobile navigation">
              <span className="eyebrow">WHERE TO?</span>
              <ul className="mnav-list">
                {navigation.map((item, index) => (
                  <motion.li
                    key={item.to}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 36 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduceMotion ? 0 : 0.22 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className={`mnav-link${isActive(item.to) ? " is-active" : ""}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="mnav-num">0{index + 1}</span>
                      <span className="mnav-label">{item.label}</span>
                      <ArrowUpRight size={26} aria-hidden="true" />
                    </NavLink>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                className="mnav-foot"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.55, duration: 0.5 }}
              >
                <button
                  type="button"
                  className="button button--orange"
                  onClick={() => {
                    setMenuOpen(false);
                    orderIntent();
                  }}
                >
                  <WhatsAppIcon /> Order on WhatsApp
                </button>
                <Link to="/order" className="mnav-order" onClick={() => setMenuOpen(false)}>
                  <ShoppingBag size={16} aria-hidden="true" />
                  {itemCount} {itemCount === 1 ? "item" : "items"} · {formatPrice(totalAmount, currencyLabel)}
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
