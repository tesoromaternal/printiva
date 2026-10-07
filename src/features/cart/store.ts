import { persistentAtom } from "@nanostores/persistent";
import { atom, computed } from "nanostores";

import type { MockupKind, ProductColor } from "../catalog/types";
import type { PrintFont } from "../catalog/components/ProductMockup";

/**
 * Store fuera de React a propósito: cada isla de Astro monta su propio árbol,
 * un Context no cruza entre CartButton, CartDrawer y Checkout. Un módulo
 * nanostores sí, y persistentAtom lo guarda en localStorage.
 */

export interface Customization {
  /** Miniatura JPEG reducida (data URL), nunca el archivo original. */
  image: string | null;
  text: string;
  textFont: PrintFont;
  textColor: string | null;
  imageScale: number;
  imageOffset: number;
}

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  kind: MockupKind;
  priceCents: number;
  color: ProductColor;
  size: string | null;
  quantity: number;
  customization: Customization;
}

export { FREE_SHIPPING_FROM_CENTS, SHIPPING_CENTS, shippingFor } from "./pricing";

export const $cart = persistentAtom<CartItem[]>("printiva:cart", [], {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  },
});

export const $cartOpen = atom(false);

export const $cartCount = computed($cart, (items) =>
  items.reduce((total, item) => total + item.quantity, 0),
);

export const $cartSubtotal = computed($cart, (items) =>
  items.reduce((total, item) => total + item.priceCents * item.quantity, 0),
);

const save = (items: CartItem[]): boolean => {
  try {
    $cart.set(items);
    return true;
  } catch {
    // localStorage lleno (imágenes): avisamos en vez de romper la isla.
    return false;
  }
};

export const addToCart = (item: Omit<CartItem, "id">): boolean => {
  const ok = save([...$cart.get(), { ...item, id: crypto.randomUUID() }]);
  if (ok) $cartOpen.set(true);
  return ok;
};

export const setQuantity = (id: string, quantity: number): void => {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  save($cart.get().map((item) => (item.id === id ? { ...item, quantity } : item)));
};

export const removeFromCart = (id: string): void => {
  save($cart.get().filter((item) => item.id !== id));
};

export const clearCart = (): void => {
  save([]);
};
