import { useStore } from "@nanostores/react";
import { ShoppingCart, Truck, X } from "lucide-react";
import { useEffect } from "react";

import { formatPrice } from "../../../lib/money";
import { $cart, $cartOpen, $cartSubtotal, FREE_SHIPPING_FROM_CENTS } from "../store";
import CartLine from "./CartLine";

export default function CartDrawer() {
  const open = useStore($cartOpen);
  const items = useStore($cart);
  const subtotal = useStore($cartSubtotal);
  const missing = Math.max(FREE_SHIPPING_FROM_CENTS - subtotal, 0);
  const progress = Math.min(subtotal / FREE_SHIPPING_FROM_CENTS, 1) * 100;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && $cartOpen.set(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => $cartOpen.set(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu carrito"
        className={`absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-extrabold">Tu carrito</h2>
          <button type="button" onClick={() => $cartOpen.set(false)} className="grid size-9 place-items-center rounded-full hover:bg-cloud" aria-label="Cerrar carrito">
            <X className="size-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-brand-soft text-brand">
              <ShoppingCart className="size-9" />
            </span>
            <p className="text-lg font-extrabold">Tu carrito está vacío</p>
            <p className="text-sm text-ink-soft">¿Le damos vida a una idea? Elige un producto y hazlo único.</p>
            <a href="/crea-tu-producto" className="btn-brand text-sm">Personaliza ahora</a>
          </div>
        ) : (
          <>
            <div className="border-b border-line bg-cloud px-5 py-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Truck className="size-4 text-brand" />
                {missing > 0 ? (
                  <>Te faltan <strong>{formatPrice(missing)}</strong> para el envío gratis</>
                ) : (
                  <>¡Tienes <strong>envío gratis</strong>! 🎉</>
                )}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </ul>
            <footer className="border-t border-line px-5 py-5">
              <div className="mb-4 flex items-center justify-between text-lg font-extrabold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <a href="/checkout" className="btn-brand w-full">Finalizar compra</a>
              <button type="button" onClick={() => $cartOpen.set(false)} className="mt-3 w-full text-sm font-bold text-ink-soft hover:text-ink">
                Seguir comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
