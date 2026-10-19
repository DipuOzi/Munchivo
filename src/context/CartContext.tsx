import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useContent } from "./ContentContext";
import type { Product } from "../data/products";

type CartItem = { productId: string; quantity: number };
export type CartEntry = { product: Product; quantity: number };

type CartContextValue = {
  entries: CartEntry[];
  itemCount: number;
  totalAmount: number;
  hasMissingPrices: boolean;
  addItem: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
};

const STORAGE_KEY = "munchivo-order-v1";
const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry: unknown) => {
      if (typeof entry !== "object" || entry === null) return [];
      const item = entry as Partial<CartItem>;
      if (typeof item.productId !== "string") return [];
      if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity)) return [];
      return [{ productId: item.productId, quantity: Math.max(1, Math.min(99, Math.floor(item.quantity))) }];
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { content } = useContent();
  const products = content.products;
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  // The admin can remove products at any time; drop cart lines that no longer exist.
  useEffect(() => {
    setItems((current) => {
      const filtered = current.filter((item) => products.some((product) => product.id === item.productId));
      return filtered.length === current.length ? current : filtered;
    });
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ordering still works for this visit if storage is unavailable.
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const productLookup = new Map(products.map((product) => [product.id, product]));
    const entries = items.flatMap(({ productId, quantity }) => {
      const product = productLookup.get(productId);
      return product ? [{ product, quantity }] : [];
    });

    return {
      entries,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: entries.reduce((sum, { product, quantity }) => sum + (product.price ?? 0) * quantity, 0),
      hasMissingPrices: entries.some(({ product }) => product.price === null),
      addItem: (productId, quantity = 1) => {
        if (!productLookup.has(productId)) return;
        const amount = Math.max(1, Math.min(99, Math.floor(quantity)));
        setItems((current) => {
          const existing = current.find((item) => item.productId === productId);
          if (existing) {
            return current.map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.min(99, item.quantity + amount) }
                : item,
            );
          }
          return [...current, { productId, quantity: amount }];
        });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          setItems((current) => current.filter((item) => item.productId !== productId));
          return;
        }
        setItems((current) =>
          current.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.min(99, Math.floor(quantity)) }
              : item,
          ),
        );
      },
      removeItem: (productId) => setItems((current) => current.filter((item) => item.productId !== productId)),
    };
  }, [items, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
