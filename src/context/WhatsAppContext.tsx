import { createContext, useContext, useMemo, type ReactNode } from "react";
import { buildBundleMessage, buildDealMessage, buildOrderMessage, openWhatsApp } from "../lib/order";
import { buildContactMessage, buildSingleProductMessage } from "../lib/whatsapp";
import { useContent } from "./ContentContext";
import type { Product } from "../data/products";
import type { CartEntry } from "./CartContext";

type WhatsAppContextValue = {
  openContact: () => void;
  openCheckout: (entries: CartEntry[]) => void;
  openProductOrder: (product: Product, quantity: number) => void;
  openDealOrder: (deal: { product: Product; quantity: number; dealPrice: number }) => void;
  openBundleOrder: (entries: CartEntry[], discountRate: number) => void;
};

const WhatsAppContext = createContext<WhatsAppContextValue | null>(null);

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const { content } = useContent();
  const { name, currencyLabel, whatsappNumber } = content.site;

  const value = useMemo<WhatsAppContextValue>(
    () => ({
      openContact: () => openWhatsApp(buildContactMessage(name), whatsappNumber),
      openCheckout: (entries) => {
        if (entries.length) openWhatsApp(buildOrderMessage(entries, { currencyLabel, siteName: name }), whatsappNumber);
      },
      openProductOrder: (product, quantity) =>
        openWhatsApp(buildSingleProductMessage(product, quantity, { currencyLabel, siteName: name }), whatsappNumber),
      openDealOrder: (deal) =>
        openWhatsApp(buildDealMessage(deal, { currencyLabel, siteName: name }), whatsappNumber),
      openBundleOrder: (entries, discountRate) => {
        if (entries.length) openWhatsApp(buildBundleMessage(entries, discountRate, { currencyLabel, siteName: name }), whatsappNumber);
      },
    }),
    [name, currencyLabel, whatsappNumber],
  );

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (!context) throw new Error("useWhatsApp must be used inside WhatsAppProvider");
  return context;
}
