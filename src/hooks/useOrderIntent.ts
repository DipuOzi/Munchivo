import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWhatsApp } from "../context/WhatsAppContext";

/**
 * Single entry point for every "order" call to action.
 * Cart has items -> straight to WhatsApp with the full order.
 * Cart is empty -> send the customer to the menu to pick something first.
 */
export function useOrderIntent() {
  const { entries } = useCart();
  const { openCheckout } = useWhatsApp();
  const navigate = useNavigate();

  return useCallback(() => {
    if (entries.length) {
      openCheckout(entries);
    } else {
      navigate("/menu");
    }
  }, [entries, openCheckout, navigate]);
}
